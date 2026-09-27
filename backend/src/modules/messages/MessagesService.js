import { randomUUID } from 'crypto';
import { withTransaction } from '../../db.js';
import { HttpError } from '../../http/HttpError.js';

const TITLE_MAX = 80;
const BODY_MAX = 1000;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function toMessage(row) {
  return { id: row.id, title: row.title, body: row.body, createdAt: row.created_at };
}

export class MessagesService {
  constructor(repository) {
    this.repository = repository;
  }

  // ----- quem recebe -----

  async listUnread(userId) {
    return (await this.repository.findUnread(userId)).map(toMessage);
  }

  async markRead(userId, messageId) {
    if (!UUID_PATTERN.test(String(messageId))) {
      throw HttpError.notFound('Mensagem não encontrada.');
    }
    if (!(await this.repository.markRead(userId, messageId))) {
      throw HttpError.notFound('Mensagem não encontrada.');
    }
  }

  // ----- administrador -----

  async searchUsers(rawQuery) {
    const query = String(rawQuery ?? '').trim().slice(0, 80);
    const rows = await this.repository.searchUsers(query);
    return rows.map((row) => ({ id: row.id, name: row.name, email: row.email, createdAt: row.created_at }));
  }

  /**
   * Envia para uma lista de pessoas ou para todas as contas confirmadas.
   * payload: { to: 'all' | string[] (ids), title, body }
   */
  async send(adminId, payload) {
    const title = String(payload?.title ?? '').trim();
    const body = String(payload?.body ?? '').trim();
    if (!title || title.length > TITLE_MAX) {
      throw HttpError.badRequest(`Dê um título de até ${TITLE_MAX} caracteres.`);
    }
    if (!body || body.length > BODY_MAX) {
      throw HttpError.badRequest(`Escreva a mensagem (até ${BODY_MAX} caracteres).`);
    }

    const toAll = payload?.to === 'all';
    const requested = toAll ? null : [...new Set(Array.isArray(payload?.to) ? payload.to.map(String) : [])];
    if (!toAll && (!requested.length || requested.some((id) => !UUID_PATTERN.test(id)))) {
      throw HttpError.badRequest('Escolha pelo menos uma pessoa.');
    }

    return withTransaction(async (client) => {
      const userIds = await this.repository.findVerifiedUserIds(client, requested);
      if (!userIds.length) {
        throw HttpError.badRequest('Nenhuma conta confirmada para receber.');
      }

      await this.repository.insertBatch(client, { batchId: randomUUID(), userIds, sentBy: adminId, toAll, title, body });
      return { sent: userIds.length };
    });
  }

  async history() {
    const rows = await this.repository.listBatches();
    return rows.map((row) => ({
      batchId: row.batch_id,
      title: row.title,
      body: row.body,
      toAll: row.to_all,
      createdAt: row.created_at,
      recipients: row.recipients,
      readCount: row.read_count,
      people: row.people,
    }));
  }
}
