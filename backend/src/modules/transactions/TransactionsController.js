import { Router } from 'express';
import { asyncHandler } from '../../http/asyncHandler.js';

export class TransactionsController {
  constructor(service) {
    this.service = service;
    this.router = Router();
    this.router.get('/', asyncHandler(this.list));
    this.router.post('/', asyncHandler(this.create));
    this.router.delete('/:id', asyncHandler(this.remove));
  }

  list = async (req, res) => {
    res.json(await this.service.list(req.user.id));
  };

  create = async (req, res) => {
    const created = await this.service.create(req.user.id, req.body ?? {});
    res.status(201).json(created);
  };

  remove = async (req, res) => {
    await this.service.remove(req.user.id, req.params.id);
    res.status(204).send();
  };
}
