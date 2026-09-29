import { randomUUID } from 'crypto';
import { withTransaction } from '../../db.js';
import { HttpError } from '../../http/HttpError.js';
import { todayIso } from '../../utils/monthDay.js';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const FREQUENCIES = new Set(['mensal', 'semanal']);

export class GoalsService {
  constructor(repository) {
    this.repository = repository;
  }

  list(userId) {
    return this.repository.findAll(userId);
  }

  async create(userId, payload) {
    const goal = { id: randomUUID(), ...this.normalize(payload) };
    await this.repository.insert(userId, goal);
    return { id: goal.id };
  }

  async update(userId, id, payload) {
    const updated = await this.repository.update(userId, id, this.normalize(payload));
    if (!updated) {
      throw HttpError.notFound('Meta não encontrada.');
    }
  }

  async remove(userId, id) {
    const deleted = await this.repository.deleteById(userId, id);
    if (!deleted) {
      throw HttpError.notFound('Meta não encontrada.');
    }
  }

  /** Soma um valor guardado à meta e registra o aporte no histórico. */
  async addContribution(userId, goalId, rawAmount, rawDate) {
    const amount = Number(rawAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw HttpError.badRequest('O valor da contribuição deve ser maior que zero.');
    }

    const date = DATE_PATTERN.test(String(rawDate ?? '')) ? rawDate : todayIso();

    await withTransaction(async (client) => {
      const exists = await this.repository.lockForUpdate(client, userId, goalId);
      if (!exists) {
        throw HttpError.notFound('Meta não encontrada.');
      }

      await this.repository.insertContribution(client, goalId, amount, date);
      await this.repository.incrementCurrentAmount(client, goalId, amount);
    });
  }

  /**
   * Obrigatórios: nome e valor da meta (> 0). "Já guardado" e "quanto guardar por vez"
   * são opcionais — em branco viram zero; nenhum valor pode ser negativo.
   */
  normalize(payload) {
    const { title, targetAmount, dueDate, saveFrequency, createdAt } = payload;
    const name = String(title ?? '').trim();
    const target = Number(targetAmount);
    const current = Number(payload.currentAmount ?? 0);
    const save = Number(payload.saveAmount ?? 0);

    if (!name) {
      throw HttpError.badRequest('Dê um nome para a meta.');
    }
    if (!Number.isFinite(target) || target <= 0) {
      throw HttpError.badRequest('Informe o valor da meta (maior que zero).');
    }
    if (!Number.isFinite(current) || !Number.isFinite(save) || current < 0 || save < 0) {
      throw HttpError.badRequest('Os valores da meta não podem ser negativos.');
    }

    return {
      title: name.slice(0, 120),
      targetAmount: target,
      currentAmount: current,
      dueDate: DATE_PATTERN.test(String(dueDate ?? '')) ? dueDate : null,
      saveAmount: save,
      saveFrequency: FREQUENCIES.has(saveFrequency) ? saveFrequency : 'mensal',
      createdAt: DATE_PATTERN.test(String(createdAt ?? '').slice(0, 10)) ? String(createdAt).slice(0, 10) : todayIso(),
    };
  }
}
