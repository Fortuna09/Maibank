import { readCookie } from './cookies.js';
import { HttpError } from './HttpError.js';

/**
 * Lê o cookie de sessão e devolve o usuário se a sessão ainda vale (ou null).
 * Sessões com mais de alguns dias ganham um cookie novo, para quem usa o app não ser deslogado;
 * cookie inválido é apagado.
 */
export async function resolveSessionUser(req, res, authService, sessions) {
  const token = readCookie(req, sessions.cookieName);
  const payload = token ? sessions.verify(token) : null;
  const user = payload ? await authService.findSessionUser(payload.sub, payload.sv) : null;

  if (!user) {
    if (token) {
      sessions.clearCookie(res);
    }
    return null;
  }

  if (sessions.shouldRefresh(payload)) {
    sessions.setCookie(res, user);
  }
  return user;
}

/** Middleware que exige sessão válida e põe o usuário em `req.user`. */
export function createAuthenticate(authService, sessions) {
  return async (req, res, next) => {
    try {
      const user = await resolveSessionUser(req, res, authService, sessions);
      if (!user) {
        return next(HttpError.unauthorized());
      }

      req.user = user;
      return next();
    } catch (error) {
      return next(error);
    }
  };
}
