import { randomUUID } from 'crypto';
import { withTransaction } from '../../db.js';
import { HttpError } from '../../http/HttpError.js';
import { splitByPercentage } from '../../utils/money.js';
import { dateInMonth, localDateParts, nextMonthKey } from '../../utils/monthDay.js';

/** Quantos meses atrasados um modelo recupera de uma vez (quem ficou muito tempo sem abrir o app). */
const MAX_CATCH_UP_MONTHS = 24;

/**
 * Lançamentos que se repetem todo mês. O modelo guarda o último mês lançado; ao abrir o app,
 * `process` lança os meses que venceram desde então (até hoje, no fuso do app).
 */
export class RecurringService {
  constructor(repository, settingsRepository, transactionsRepository) {
    this.repository = repository;
    this.settingsRepository = settingsRepository;
    this.transactionsRepository = transactionsRepository;
  }

  async list(userId) {
    const rows = await this.repository.findAll(userId);
    return rows.map((row) => ({
      id: row.id,
      description: row.description,
      type: row.type,
      amount: Number(row.amount),
      category: row.category,
      allocationMode: row.allocation_mode,
      bucketId: row.bucket_id,
      dayOfMonth: Number(row.day_of_month),
      nextDate: dateInMonth(nextMonthKey(Number(row.last_generated_month)), Number(row.day_of_month)),
    }));
  }

  async remove(userId, id) {
    const deleted = await this.repository.deleteById(userId, id);
    if (!deleted) {
      throw HttpError.notFound('Lançamento recorrente não encontrado.');
    }
  }

  async process(userId, now = new Date()) {
    return withTransaction(async (client) => {
      const templates = await this.repository.lockAll(client, userId);
      if (templates.length === 0) {
        return { created: 0 };
      }

      const { year, month, day } = localDateParts(now);
      const currentMonth = year * 100 + month;
      const buckets = await this.settingsRepository.findBuckets(userId, client);
      let created = 0;

      for (const template of templates) {
        const dayOfMonth = Number(template.day_of_month);
        let lastGenerated = Number(template.last_generated_month);
        let cursor = nextMonthKey(lastGenerated);

        for (let guard = 0; cursor <= currentMonth && guard < MAX_CATCH_UP_MONTHS; guard++) {
          // No mês atual, só depois de chegar o dia.
          if (cursor === currentMonth && day < dayOfMonth) {
            break;
          }

          const allocations = this.allocationsFor(template, buckets);
          if (allocations.length === 0) {
            break;
          }

          const transaction = {
            id: randomUUID(),
            description: template.description,
            type: template.type,
            amount: Number(template.amount),
            category: template.category,
            date: dateInMonth(cursor, dayOfMonth),
            allocationMode: template.allocation_mode,
            installments: 1,
            paidInvoice: null,
            recurringId: template.id,
          };

          await this.transactionsRepository.insert(client, userId, transaction);
          for (const allocation of allocations) {
            await this.transactionsRepository.insertAllocation(client, userId, transaction.id, allocation);
          }

          lastGenerated = cursor;
          cursor = nextMonthKey(cursor);
          created++;
        }

        if (lastGenerated !== Number(template.last_generated_month)) {
          await this.repository.markGenerated(client, template.id, lastGenerated);
        }
      }

      return { created };
    });
  }

  /** Entrada soma, saída subtrai; "distribuir" usa as porcentagens atuais das divisões. */
  allocationsFor(template, buckets) {
    const signed = template.type === 'entrada' ? Number(template.amount) : -Number(template.amount);

    if (template.allocation_mode === 'percentual') {
      return buckets.length ? splitByPercentage(signed, buckets) : [];
    }
    return template.bucket_id ? [{ bucketId: template.bucket_id, amount: signed }] : [];
  }
}
