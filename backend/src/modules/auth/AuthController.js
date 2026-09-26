import { Router } from 'express';
import { asyncHandler } from '../../http/asyncHandler.js';
import { resolveSessionUser } from '../../http/authenticate.js';

export class AuthController {
  constructor(service, sessions, authenticate) {
    this.service = service;
    this.sessions = sessions;
    this.router = Router();

    this.router.post('/register', asyncHandler(this.register));
    this.router.post('/resend-verification', asyncHandler(this.resendVerification));
    this.router.post('/verify-email', asyncHandler(this.verifyEmail));
    this.router.post('/login', asyncHandler(this.login));
    this.router.post('/logout', asyncHandler(this.logout));
    this.router.post('/forgot-password', asyncHandler(this.forgotPassword));
    this.router.post('/reset-password', asyncHandler(this.resetPassword));

    this.router.get('/session', asyncHandler(this.session));
    this.router.get('/me', authenticate, asyncHandler(this.me));
    this.router.post('/logout-all', authenticate, asyncHandler(this.logoutAll));
  }

  register = async (req, res) => {
    const result = await this.service.register(req.body ?? {});
    res.status(201).json({ ok: true, ...result });
  };

  resendVerification = async (req, res) => {
    await this.service.resendVerification(req.body?.email);
    res.json({ ok: true });
  };

  /** Confirmar o e-mail já deixa a pessoa logada. */
  verifyEmail = async (req, res) => {
    const user = await this.service.verifyEmail(req.body?.token);
    this.sessions.setCookie(res, user);
    res.json({ user: this.service.toPublic(user) });
  };

  login = async (req, res) => {
    const user = await this.service.login(req.body ?? {});
    this.sessions.setCookie(res, user);
    res.json({ user: this.service.toPublic(user) });
  };

  logout = async (_req, res) => {
    this.sessions.clearCookie(res);
    res.status(204).send();
  };

  forgotPassword = async (req, res) => {
    await this.service.forgotPassword(req.body?.email);
    res.json({ ok: true });
  };

  resetPassword = async (req, res) => {
    const user = await this.service.resetPassword(req.body ?? {});
    this.sessions.setCookie(res, user);
    res.json({ user: this.service.toPublic(user) });
  };

  /** Quem está logado — ou `user: null`. Sempre 200: não estar logado não é erro (e não suja o console). */
  session = async (req, res) => {
    const user = await resolveSessionUser(req, res, this.service, this.sessions);
    res.json({ user: user ? this.service.toPublic(user) : null });
  };

  me = async (req, res) => {
    res.json({ user: this.service.toPublic(req.user) });
  };

  logoutAll = async (req, res) => {
    await this.service.logoutEverywhere(req.user.id);
    this.sessions.clearCookie(res);
    res.status(204).send();
  };
}
