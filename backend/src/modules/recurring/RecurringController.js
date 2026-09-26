import { Router } from 'express';
import { asyncHandler } from '../../http/asyncHandler.js';

export class RecurringController {
  constructor(service) {
    this.service = service;
    this.router = Router();
    this.router.get('/', asyncHandler(this.list));
    this.router.post('/process', asyncHandler(this.process));
    this.router.delete('/:id', asyncHandler(this.remove));
  }

  list = async (req, res) => {
    res.json(await this.service.list(req.user.id));
  };

  /** Chamado ao abrir o app: lança os meses que venceram. Sempre 200. */
  process = async (req, res) => {
    res.json(await this.service.process(req.user.id));
  };

  remove = async (req, res) => {
    await this.service.remove(req.user.id, req.params.id);
    res.status(204).send();
  };
}
