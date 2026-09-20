import { randomUUID } from 'crypto';
import { withTransaction } from '../../db.js';
import { HttpError } from '../../http/HttpError.js';
import { clampMonthDay, todayIso } from '../../utils/monthDay.js';

const DEFAULT_PAY_DAY = 5;

/**
 * Salário automático: uma entrada por mês, distribuída entre as divisões
 * pelas porcentagens configuradas. A coluna no banco chama business_day por
 * compatibilidade, mas o valor é o dia do calendário (1–28).
 */
export class SalaryService {
  constructor(repository, settingsRepository, transactionsRepository) {
    this.repository = repository;
    this.settingsRepository = settingsRepository;
    this.transactionsRepository = transactionsRepository;
  }

  async getConfig() {
    const row = await this.repository.findConfigRow();
    return {
      id: row.id,
      isEnabled: Boolean(row.is_enabled),
      amount: Number(row.amount),
      description: row.description,
      payDay: clampMonthDay(row.business_day, DEFAULT_PAY_DAY),
      lastProcessedMonth: row.last_processed_month,
    };
  }

  async updateConfig({ isEnabled, amount, description, payDay }) {
    await this.repository.updateConfig({
      isEnabled: Boolean(isEnabled),
      amount: Number(amount),
      description: String(description),
      payDay: clampMonthDay(payDay, DEFAULT_PAY_DAY),
    });
  }

  /**
   * Lança o salário do mês se estiver ativo, ainda não processado e já for o dia.
   * Devolve `{ processed: false, reason }` quando não há nada a fazer.
   */
  async process(today = new Date()) {
    const config = await this.repository.findConfigRow();

    if (!config || !config.is_enabled) {
      return { processed: false, reason: 'Salário automático não ativado' };
    }

    const currentMonth = today.getFullYear() * 100 + (today.getMonth() + 1);
    if (config.last_processed_month === currentMonth) {
      return { processed: false, reason: 'Salário já processado este mês' };
    }

    const payDay = clampMonthDay(config.business_day, DEFAULT_PAY_DAY);
    if (today.getDate() < payDay) {
      return { processed: false, reason: `O salário só é lançado a partir do dia ${payDay}` };
    }

    const buckets = await this.settingsRepository.findBuckets();
    if (buckets.length === 0) {
      throw HttpError.badRequest('Nenhuma divisão configurada');
    }

    const amount = Number(config.amount);
    const transaction = {
      id: randomUUID(),
      description: config.description,
      type: 'entrada',
      amount,
      category: 'salário',
      date: todayIso(today),
      allocationMode: 'percentual',
      installments: 1,
      paidInvoice: null,
    };

    await withTransaction(async (connection) => {
      await this.transactionsRepository.insert(connection, transaction);

      for (const allocation of this.splitByPercentage(amount, buckets)) {
        await this.transactionsRepository.insertAllocation(connection, transaction.id, allocation);
      }

      await this.repository.markProcessed(connection, currentMonth);
    });

    return { processed: true, id: transaction.id };
  }

  /** Divide o valor pelas porcentagens; a última divisão absorve o arredondamento. */
  splitByPercentage(amount, buckets) {
    let allocated = 0;

    return buckets.map((bucket, index) => {
      const isLast = index === buckets.length - 1;
      const share = isLast
        ? Math.round((amount - allocated) * 100) / 100
        : Math.round(((amount * bucket.percentage) / 100) * 100) / 100;

      allocated += share;
      return { bucketId: bucket.id, amount: share };
    });
  }
}
