import { Router } from 'express';
import { asyncHandler } from '../../http/asyncHandler.js';

export class SalaryController {
  constructor(service) {
    this.service = service;
    this.router = Router();
    this.router.get('/', asyncHandler(this.get));
    this.router.put('/', asyncHandler(this.update));
    this.router.post('/process', asyncHandler(this.process));
  }

  get = async (_req, res) => {
    res.json(await this.service.getConfig());
  };

  update = async (req, res) => {
    await this.service.updateConfig(req.body ?? {});
    res.json({ ok: true });
  };

  process = async (_req, res) => {
    const result = await this.service.process();
    // 201 só quando um lançamento foi criado; "nada a fazer" é 200 para não sujar o console do app.
    res.status(result.processed ? 201 : 200).json({ ok: true, ...result });
  };
}
