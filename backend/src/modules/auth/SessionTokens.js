import jwt from 'jsonwebtoken';
import { config } from '../../config.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Sessão = JWT assinado (HS256) num cookie httpOnly. O token carrega o id do usuário
 * e a `session_version` dele: quando ela muda no banco, todo token antigo deixa de valer.
 */
export class SessionTokens {
  constructor(options = config.auth, isProduction = config.isProduction) {
    this.options = options;
    this.isProduction = isProduction;
  }

  get cookieName() {
    return this.options.cookieName;
  }

  sign(user) {
    return jwt.sign({ sv: user.session_version }, this.options.jwtSecret, {
      subject: user.id,
      expiresIn: `${this.options.sessionDays}d`,
      algorithm: 'HS256',
    });
  }

  /** Payload válido ou null (assinatura errada, expirado, malformado). */
  verify(token) {
    try {
      return jwt.verify(token, this.options.jwtSecret, { algorithms: ['HS256'] });
    } catch {
      return null;
    }
  }

  shouldRefresh(payload) {
    return Date.now() - payload.iat * 1000 > this.options.refreshAfterDays * DAY_MS;
  }

  /** httpOnly: o JavaScript da página não lê o token. SameSite=Lax: outro site não consegue usá-lo em POST. */
  cookieOptions() {
    return {
      httpOnly: true,
      secure: this.isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: this.options.sessionDays * DAY_MS,
    };
  }

  setCookie(res, user) {
    res.cookie(this.cookieName, this.sign(user), this.cookieOptions());
  }

  clearCookie(res) {
    const { maxAge, ...options } = this.cookieOptions();
    res.clearCookie(this.cookieName, options);
  }
}
