import { Router } from 'express';
import { asyncHandler } from '../../http/asyncHandler.js';

export class GoalsController {
  constructor(service) {
    this.service = service;
    this.router = Router();
    this.router.get('/', asyncHandler(this.list));
    this.router.post('/', asyncHandler(this.create));
    this.router.put('/:id', asyncHandler(this.update));
    this.router.delete('/:id', asyncHandler(this.remove));
    this.router.post('/:id/contributions', asyncHandler(this.addContribution));
  }

  list = async (req, res) => {
    res.json(await this.service.list(req.user.id));
  };

  create = async (req, res) => {
    const created = await this.service.create(req.user.id, req.body ?? {});
    res.status(201).json(created);
  };

  update = async (req, res) => {
    await this.service.update(req.user.id, req.params.id, req.body ?? {});
    res.json({ ok: true });
  };

  remove = async (req, res) => {
    await this.service.remove(req.user.id, req.params.id);
    res.status(204).send();
  };

  addContribution = async (req, res) => {
    await this.service.addContribution(req.user.id, req.params.id, req.body?.amount, req.body?.date);
    res.status(201).json({ ok: true });
  };
}
