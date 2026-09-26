import bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { config } from '../../config.js';
import { withTransaction } from '../../db.js';
import { HttpError } from '../../http/HttpError.js';
import { resetPasswordMessage, verifyEmailMessage } from '../../mail/templates.js';

const HOUR_MS = 60 * 60 * 1000;
const TOKEN_RULES = {
  verify_email: { ttlMs: 24 * HOUR_MS, path: '/confirmar-email' },
  reset_password: { ttlMs: HOUR_MS, path: '/redefinir-senha' },
};
/** Intervalo mínimo entre dois e-mails do mesmo tipo para a mesma conta. */
const RESEND_COOLDOWN_MS = 60 * 1000;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

function publicUser(row) {
  return { id: row.id, email: row.email, name: row.name };
}

export class AuthService {
  constructor(repository, settingsRepository, mailer, options = { appUrl: config.appUrl, bcryptRounds: config.auth.bcryptRounds }) {
    this.repository = repository;
    this.settingsRepository = settingsRepository;
    this.mailer = mailer;
    this.options = options;
    this.dummyHash = null;
  }

  // ----- cadastro e confirmação -----

  /**
   * Cria a conta (ainda não confirmada) já com as divisões padrão e manda o e-mail de confirmação.
   * Se o e-mail existe mas nunca foi confirmado, atualiza nome/senha e reenvia — a pessoa pode
   * ter perdido o primeiro e-mail.
   */
  async register(payload) {
    const name = this.validateName(payload.name);
    const email = this.normalizeEmail(payload.email);
    const password = this.validatePassword(payload.password);
    const passwordHash = await bcrypt.hash(password, this.options.bcryptRounds);

    const { user, token } = await withTransaction(async (client) => {
      const existing = await this.repository.findByEmail(email, client);
      let user;

      if (existing?.email_verified_at) {
        throw HttpError.conflict('Já existe uma conta com esse e-mail. Tente entrar ou recuperar a senha.', 'EMAIL_TAKEN');
      } else if (existing) {
        user = await this.repository.updateUnverifiedUser(client, existing.id, { name, passwordHash });
      } else {
        user = await this.repository.insertUser(client, { email, name, passwordHash });
        await this.settingsRepository.seedDefaults(client, user.id);
      }

      const token = await this.createToken(client, user.id, 'verify_email');
      return { user, token };
    });

    const emailSent = await this.trySend(user.email, verifyEmailMessage({ name: user.name, url: this.linkFor('verify_email', token) }));
    return { email: user.email, emailSent };
  }

  /** Sempre responde igual, exista a conta ou não — não revela quem tem cadastro. */
  async resendVerification(rawEmail) {
    const user = await this.repository.findByEmail(this.normalizeEmailLoose(rawEmail));
    if (!user || user.email_verified_at || !(await this.cooledDown(user.id, 'verify_email'))) {
      return;
    }

    const token = await this.createToken(this.repository.db, user.id, 'verify_email');
    await this.trySend(user.email, verifyEmailMessage({ name: user.name, url: this.linkFor('verify_email', token) }));
  }

  async verifyEmail(rawToken) {
    const user = await withTransaction(async (client) => {
      const userId = await this.repository.consumeToken(client, hashToken(String(rawToken ?? '')), 'verify_email');
      if (!userId) {
        throw HttpError.badRequest('Este link de confirmação é inválido ou já expirou. Peça um novo.', 'TOKEN_INVALID');
      }
      return this.repository.markEmailVerified(client, userId);
    });

    return user;
  }

  // ----- login -----

  async login(payload) {
    const email = this.normalizeEmailLoose(payload.email);
    const password = String(payload.password ?? '');
    const user = email ? await this.repository.findByEmail(email) : null;

    // Compara mesmo sem usuário, para o tempo de resposta não revelar se o e-mail existe.
    const matches = await bcrypt.compare(password, user?.password_hash ?? (await this.getDummyHash()));
    if (!user || !matches) {
      throw HttpError.unauthorized('E-mail ou senha incorretos.', 'INVALID_CREDENTIALS');
    }

    if (!user.email_verified_at) {
      throw HttpError.forbidden('Confirme seu e-mail antes de entrar. Enviamos um link quando você criou a conta.', 'EMAIL_NOT_VERIFIED');
    }

    return user;
  }

  /** Usuário da sessão, se ela ainda vale (conta existe, e-mail confirmado, mesma versão de sessão). */
  async findSessionUser(userId, sessionVersion) {
    const user = await this.repository.findById(userId);
    if (!user || !user.email_verified_at || user.session_version !== sessionVersion) {
      return null;
    }
    return user;
  }

  async logoutEverywhere(userId) {
    await this.repository.bumpSessionVersion(userId);
  }

  // ----- senha -----

  /** Sempre responde igual, exista a conta ou não. */
  async forgotPassword(rawEmail) {
    const user = await this.repository.findByEmail(this.normalizeEmailLoose(rawEmail));
    if (!user || !(await this.cooledDown(user.id, 'reset_password'))) {
      return;
    }

    const token = await this.createToken(this.repository.db, user.id, 'reset_password');
    await this.trySend(user.email, resetPasswordMessage({ name: user.name, url: this.linkFor('reset_password', token) }));
  }

  async resetPassword(payload) {
    const password = this.validatePassword(payload.password);
    const passwordHash = await bcrypt.hash(password, this.options.bcryptRounds);

    return withTransaction(async (client) => {
      const userId = await this.repository.consumeToken(client, hashToken(String(payload.token ?? '')), 'reset_password');
      if (!userId) {
        throw HttpError.badRequest('Este link de redefinição é inválido ou já expirou. Peça um novo.', 'TOKEN_INVALID');
      }

      const user = await this.repository.updatePassword(client, userId, passwordHash);
      await this.repository.invalidateTokens(client, userId, 'reset_password');
      return user;
    });
  }

  toPublic(user) {
    return publicUser(user);
  }

  // ----- apoio -----

  async createToken(executor, userId, purpose) {
    const token = randomBytes(32).toString('base64url');
    await this.repository.insertToken(executor, {
      userId,
      purpose,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + TOKEN_RULES[purpose].ttlMs),
    });
    return token;
  }

  linkFor(purpose, token) {
    return `${this.options.appUrl}${TOKEN_RULES[purpose].path}?token=${encodeURIComponent(token)}`;
  }

  async cooledDown(userId, purpose) {
    const last = await this.repository.lastTokenCreatedAt(userId, purpose);
    return !last || Date.now() - new Date(last).getTime() > RESEND_COOLDOWN_MS;
  }

  /** Falha no envio não desfaz o cadastro: a pessoa pode pedir o reenvio. */
  async trySend(to, message) {
    try {
      await this.mailer.send({ to, ...message });
      return true;
    } catch (error) {
      console.error('Falha ao enviar e-mail:', error.message);
      return false;
    }
  }

  async getDummyHash() {
    this.dummyHash ??= bcrypt.hash('maibank-dummy-password', this.options.bcryptRounds);
    return this.dummyHash;
  }

  normalizeEmail(value) {
    const email = this.normalizeEmailLoose(value);
    if (!EMAIL_PATTERN.test(email) || email.length > 254) {
      throw HttpError.badRequest('Informe um e-mail válido.', 'INVALID_EMAIL');
    }
    return email;
  }

  normalizeEmailLoose(value) {
    return String(value ?? '').trim().toLowerCase();
  }

  validateName(value) {
    const name = String(value ?? '').trim().replace(/\s+/g, ' ');
    if (!name || name.length > 60) {
      throw HttpError.badRequest('Informe seu nome (até 60 caracteres).', 'INVALID_NAME');
    }
    return name;
  }

  validatePassword(value) {
    const password = String(value ?? '');
    // bcrypt só considera os primeiros 72 bytes; acima disso a senha seria cortada em silêncio.
    if (password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
      throw HttpError.badRequest('A senha precisa ter entre 8 e 72 caracteres.', 'WEAK_PASSWORD');
    }
    return password;
  }
}
