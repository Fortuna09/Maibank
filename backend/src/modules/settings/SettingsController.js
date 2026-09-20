import { Router } from 'express';
import { asyncHandler } from '../../http/asyncHandler.js';

export class SettingsController {
  constructor(service) {
    this.service = service;
    this.router = Router();
    this.router.get('/', asyncHandler(this.get));
    this.router.put('/', asyncHandler(this.update));
  }

  get = async (_req, res) => {
    res.json(await this.service.getSettings());
  };

  update = async (req, res) => {
    await this.service.updateSettings(req.body ?? {});
    res.json({ ok: true });
  };
}
