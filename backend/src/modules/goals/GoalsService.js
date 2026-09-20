import { randomUUID } from 'crypto';
import { withTransaction } from '../../db.js';
import { HttpError } from '../../http/HttpError.js';
import { todayIso } from '../../utils/monthDay.js';

export class GoalsService {
  constructor(repository) {
    this.repository = repository;
  }

  list() {
    return this.repository.findAll();
  }

  async create(payload) {
    const goal = { id: randomUUID(), ...this.normalize(payload) };
    await this.repository.insert(goal);
    return { id: goal.id };
  }

  async update(id, payload) {
    await this.repository.update(id, this.normalize(payload));
  }

  remove(id) {
    return this.repository.deleteById(id);
  }

  /** Soma um valor guardado à meta e registra o aporte no histórico. */
  async addContribution(goalId, rawAmount, rawDate) {
    const amount = Number(rawAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw HttpError.badRequest('O valor da contribuição deve ser maior que zero.');
    }

    const date = rawDate || todayIso();

    await withTransaction(async (connection) => {
      const exists = await this.repository.lockForUpdate(connection, goalId);
      if (!exists) {
        throw HttpError.notFound('Meta não encontrada.');
      }

      await this.repository.insertContribution(connection, goalId, amount, date);
      await this.repository.incrementCurrentAmount(connection, goalId, amount);
    });
  }

  normalize(payload) {
    const { title, targetAmount, currentAmount, dueDate, saveAmount, saveFrequency, createdAt } = payload;

    if (!title || targetAmount == null || currentAmount == null || saveAmount == null || !saveFrequency) {
      throw HttpError.badRequest('Dados da meta invalidos.');
    }

    return {
      title,
      targetAmount: Number(targetAmount),
      currentAmount: Number(currentAmount ?? 0),
      dueDate: dueDate || null,
      saveAmount: Number(saveAmount),
      saveFrequency,
      createdAt: createdAt ?? todayIso(),
    };
  }
}
