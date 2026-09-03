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

export const config = {
  port: readNumber('PORT', 3001),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:4200',
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: readNumber('DB_PORT', 3306),
    user: process.env.DB_USER || 'maibank_user',
    password: process.env.DB_PASSWORD || 'maibank_pass',
    database: process.env.DB_NAME || 'maibank',
    connectionLimit: 10,
  },
};
