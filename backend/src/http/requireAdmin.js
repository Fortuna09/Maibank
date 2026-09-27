import { config } from '../config.js';
import { HttpError } from './HttpError.js';

/** Quem pode administrar: e-mails listados em ADMIN_EMAILS (separados por vírgula). */
export function isAdmin(user) {
  return Boolean(user?.email) && config.adminEmails.includes(String(user.email).toLowerCase());
}

/** Depois do authenticate: deixa passar só administradores. */
export function requireAdmin(req, _res, next) {
  return isAdmin(req.user) ? next() : next(HttpError.forbidden('Área restrita.', 'NOT_ADMIN'));
}
