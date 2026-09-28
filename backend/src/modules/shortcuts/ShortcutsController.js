import express, { Router } from 'express';
import { asyncHandler } from '../../http/asyncHandler.js';
import { HttpError } from '../../http/HttpError.js';

/**
 * A frase vem no campo `texto` do corpo — mas o app Atalhos às vezes grava o nome como
 * "Texto" (ou a pessoa digita "text"), e o corpo pode chegar como JSON, formulário ou texto
 * puro. Aceita tudo isso. `null` = o atalho não mandou frase nenhuma (erro de montagem).
 */
function readPhrase(body) {
  if (typeof body === 'string') {
    return body;
  }
  if (!body || typeof body !== 'object') {
    return null;
  }
  for (const [key, value] of Object.entries(body)) {
    if (/^(texto|text|frase)$/i.test(key.trim()) && typeof value === 'string') {
      return value;
    }
  }
  const strings = Object.values(body).filter((value) => typeof value === 'string');
  return strings.length === 1 ? strings[0] : null;
}

/**
 * /api/atalho
 * - POST /gasto  → chamado pelo atalho da Siri, com `Authorization: Bearer <chave>` (sem login)
 * - /chave e /testar → tela "Siri e atalhos", com a sessão normal do app
 */
export class ShortcutsController {
  constructor(service, authenticate) {
    this.service = service;
    this.router = Router();
    // JSON já vem do app.js; aqui entram também formulário e texto puro (outras opções do Atalhos)
    const lenientBody = [express.urlencoded({ extended: false, limit: '10kb' }), express.text({ type: 'text/*', limit: '10kb' })];
    this.router.post('/gasto', ...lenientBody, asyncHandler(this.expense));
    this.router.get('/chave', authenticate, asyncHandler(this.keyInfo));
    this.router.post('/chave', authenticate, asyncHandler(this.createKey));
    this.router.delete('/chave', authenticate, asyncHandler(this.revokeKey));
    this.router.post('/testar', authenticate, asyncHandler(this.preview));
  }

  /** Sempre responde `{ ok, mensagem }`: o atalho fala a mensagem, dê certo ou não. */
  expense = async (req, res) => {
    const header = String(req.headers.authorization ?? '');
    const key = header.toLowerCase().startsWith('bearer ') ? header.slice(7) : '';
    const user = key ? await this.service.authenticate(key) : null;
    if (!user) {
      return res.status(401).json({
        ok: false,
        mensagem: 'Chave do atalho inválida. Gere uma nova no Maibank, em Configurações, Siri e atalhos.',
      });
    }

    const phrase = readPhrase(req.body);
    if (phrase === null) {
      return res.status(400).json({
        ok: false,
        mensagem: 'O atalho não mandou a frase. No Obter Conteúdo do URL, o corpo precisa ser JSON com o campo texto igual a Texto Ditado.',
      });
    }

    try {
      const result = await this.service.addExpense(user.id, phrase);
      return res.status(201).json({ ok: true, ...result });
    } catch (error) {
      if (error instanceof HttpError && error.status < 500) {
        return res.status(error.status).json({ ok: false, mensagem: error.message });
      }
      throw error;
    }
  };

  keyInfo = async (req, res) => {
    res.json(await this.service.keyInfo(req.user.id));
  };

  createKey = async (req, res) => {
    res.status(201).json(await this.service.createKey(req.user.id));
  };

  revokeKey = async (req, res) => {
    await this.service.revokeKey(req.user.id);
    res.status(204).send();
  };

  preview = async (req, res) => {
    res.json(await this.service.preview(req.user.id, req.body?.texto));
  };
}
