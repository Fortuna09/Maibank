import { Router } from 'express';
import { asyncHandler } from '../../http/asyncHandler.js';

export class CreditController {
  constructor(service) {
    this.service = service;
    this.router = Router();
    this.router.get('/', asyncHandler(this.get));
    this.router.put('/', asyncHandler(this.update));
  }

  get = async (req, res) => {
    res.json(await this.service.getConfig(req.user.id));
  };

  update = async (req, res) => {
    await this.service.updateConfig(req.user.id, req.body ?? {});
    res.json({ ok: true });
  };
}
