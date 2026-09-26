import dotenv from 'dotenv';

dotenv.config();

function readNumber(name, defaultValue) {
  const raw = process.env[name];
  if (!raw) {
    return defaultValue;
  }

  const parsed = Number(raw);
  return Number.isNaN(parsed) ? defaultValue : parsed;
}

// Na Vercel, VERCEL=1 e NODE_ENV=production já vêm definidos.
const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';

const DEV_JWT_SECRET = 'maibank-dev-secret-troque-em-producao';
const jwtSecret = process.env.JWT_SECRET || (isProduction ? '' : DEV_JWT_SECRET);

if (!jwtSecret) {
  throw new Error('JWT_SECRET não configurado. Defina a variável de ambiente antes de subir em produção.');
}

/** URL pública do app, usada nos links dos e-mails. */
function resolveAppUrl() {
  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/+$/, '');
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  return 'http://localhost:4200';
}

export const config = {
  isProduction,
  port: readNumber('PORT', 3001),
  appUrl: resolveAppUrl(),
  /** Fuso usado para "hoje" (salário automático, datas padrão) — o servidor da Vercel roda em UTC. */
  timeZone: process.env.APP_TIMEZONE || 'America/Sao_Paulo',
  databaseUrl: process.env.DATABASE_URL || 'postgres://maibank:maibank@localhost:5432/maibank',
  auth: {
    jwtSecret,
    cookieName: 'maibank_session',
    sessionDays: 30,
    /** Renova o cookie quando a sessão tem mais que isso, para quem usa o app não cair. */
    refreshAfterDays: 7,
    bcryptRounds: 11,
  },
  mail: {
    resendApiKey: process.env.RESEND_API_KEY || '',
    // Sem domínio próprio, o Resend só entrega para o e-mail dono da conta.
    from: process.env.EMAIL_FROM || 'Maibank <onboarding@resend.dev>',
  },
};
