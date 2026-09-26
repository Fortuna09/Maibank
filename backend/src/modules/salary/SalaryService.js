import { randomUUID } from 'crypto';
import { withTransaction } from '../../db.js';
import { HttpError } from '../../http/HttpError.js';
import { clampMonthDay, localDateParts, todayIso } from '../../utils/monthDay.js';

const DEFAULT_PAY_DAY = 5;

/**
 * Salário automático: uma entrada por mês, distribuída entre as divisões
 * pelas porcentagens configuradas. O "dia" é o do fuso do app, não o do servidor.
 */
export class SalaryService {
  constructor(repository, settingsRepository, transactionsRepository) {
    this.repository = repository;
    this.settingsRepository = settingsRepository;
    this.transactionsRepository = transactionsRepository;
  }

  async getConfig(userId) {
    const row = await this.repository.findConfigRow(userId);
    return {
      isEnabled: Boolean(row.is_enabled),
      amount: Number(row.amount),
      description: row.description,
      payDay: clampMonthDay(row.pay_day, DEFAULT_PAY_DAY),
      lastProcessedMonth: Number(row.last_processed_month),
    };
  }

  async updateConfig(userId, { isEnabled, amount, description, payDay }) {
    await this.repository.upsertConfig(userId, {
      isEnabled: Boolean(isEnabled),
      amount: Math.max(0, Number(amount) || 0),
      description: String(description || 'Salário automático').slice(0, 120),
      payDay: clampMonthDay(payDay, DEFAULT_PAY_DAY),
    });
  }

  /**
   * Lança o salário do mês se estiver ativo, ainda não processado e já for o dia.
   * Devolve `{ processed: false, reason }` quando não há nada a fazer.
   */
  async process(userId, now = new Date()) {
    return withTransaction(async (client) => {
      const config = await this.repository.lockConfig(client, userId);

      if (!config.is_enabled) {
        return { processed: false, reason: 'Salário automático não ativado' };
      }

      const { year, month, day } = localDateParts(now);
      const currentMonth = year * 100 + month;
      if (Number(config.last_processed_month) === currentMonth) {
        return { processed: false, reason: 'Salário já processado este mês' };
      }

      const payDay = clampMonthDay(config.pay_day, DEFAULT_PAY_DAY);
      if (day < payDay) {
        return { processed: false, reason: `O salário só é lançado a partir do dia ${payDay}` };
      }

      const amount = Number(config.amount);
      if (!(amount > 0)) {
        return { processed: false, reason: 'Informe o valor do salário' };
      }

      const buckets = await this.settingsRepository.findBuckets(userId, client);
      if (buckets.length === 0) {
        throw HttpError.badRequest('Nenhuma divisão configurada');
      }

      const transaction = {
        id: randomUUID(),
        description: config.description,
        type: 'entrada',
        amount,
        category: 'salário',
        date: todayIso(now),
        allocationMode: 'percentual',
        installments: 1,
        paidInvoice: null,
      };

      await this.transactionsRepository.insert(client, userId, transaction);
      for (const allocation of this.splitByPercentage(amount, buckets)) {
        await this.transactionsRepository.insertAllocation(client, userId, transaction.id, allocation);
      }
      await this.repository.markProcessed(client, userId, currentMonth);

      return { processed: true, id: transaction.id };
    });
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
