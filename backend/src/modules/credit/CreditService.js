import { clampMonthDay } from '../../utils/monthDay.js';

const DEFAULT_CLOSING_DAY = 25;
const DEFAULT_DUE_DAY = 5;

/** Configuração do cartão: as faturas em si são calculadas no front a partir dos lançamentos. */
export class CreditService {
  constructor(repository) {
    this.repository = repository;
  }

  async getConfig(userId) {
    const row = await this.repository.findConfigRow(userId);
    return {
      closingDay: clampMonthDay(row.closing_day, DEFAULT_CLOSING_DAY),
      dueDay: clampMonthDay(row.due_day, DEFAULT_DUE_DAY),
    };
  }

  async updateConfig(userId, { closingDay, dueDay }) {
    await this.repository.upsertConfig(userId, {
      closingDay: clampMonthDay(closingDay, DEFAULT_CLOSING_DAY),
      dueDay: clampMonthDay(dueDay, DEFAULT_DUE_DAY),
    });
  }
}
