import { Router } from 'express';
import { asyncHandler } from '../../http/asyncHandler.js';

/** /api/messages — as mensagens que a pessoa logada ainda não leu. */
export class MessagesController {
  constructor(service) {
    this.service = service;
    this.router = Router();
    this.router.get('/', asyncHandler(this.list));
    this.router.post('/:id/read', asyncHandler(this.markRead));
  }

  list = async (req, res) => {
    res.json(await this.service.listUnread(req.user.id));
  };

  markRead = async (req, res) => {
    await this.service.markRead(req.user.id, req.params.id);
    res.status(204).send();
  };
}

/** /api/admin — só para os e-mails de ADMIN_EMAILS (ver requireAdmin). */
export class AdminController {
  constructor(service) {
    this.service = service;
    this.router = Router();
    this.router.get('/users', asyncHandler(this.searchUsers));
    this.router.get('/messages', asyncHandler(this.history));
    this.router.post('/messages', asyncHandler(this.send));
  }

  searchUsers = async (req, res) => {
    res.json(await this.service.searchUsers(req.query.q));
  };

  history = async (_req, res) => {
    res.json(await this.service.history());
  };

  send = async (req, res) => {
    res.status(201).json(await this.service.send(req.user.id, req.body ?? {}));
  };
}
