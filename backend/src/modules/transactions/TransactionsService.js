import { randomUUID } from 'crypto';
import { withTransaction } from '../../db.js';
import { HttpError } from '../../http/HttpError.js';
import { clampMonthDay, monthKeyOf } from '../../utils/monthDay.js';

const TYPES = new Set(['entrada', 'saida', 'credito']);
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const INVOICE_PATTERN = /^\d{4}-\d{2}$/;

export class TransactionsService {
  constructor(repository, recurringRepository) {
    this.repository = repository;
    this.recurringRepository = recurringRepository;
  }

  list(userId) {
    return this.repository.findAll(userId);
  }

  /**
   * Cria um lançamento com suas alocações. Crédito não mexe em saldo nem
   * divisões — só cai na fatura — então não tem alocações.
   * Com `recurring.dayOfMonth`, este lançamento é a primeira ocorrência de um modelo
   * que se repete todo mês a partir do mês seguinte.
   */
  async create(userId, payload) {
    const { description, type, amount, category, date, allocationMode, allocations, installments, paidInvoice } = payload;

    const isCredit = type === 'credito';
    const allocationList = isCredit ? [] : Array.isArray(allocations) ? allocations : [];
    const numericAmount = Number(amount);

    if (!description || !TYPES.has(type) || !(numericAmount > 0) || !category || !DATE_PATTERN.test(String(date)) || !allocationMode) {
      throw HttpError.badRequest('Dados de transacao invalidos.');
    }
    if (!isCredit && allocationList.length === 0) {
      throw HttpError.badRequest('Dados de transacao invalidos.');
    }

    const recurringDay = payload.recurring?.dayOfMonth;
    if (recurringDay != null && isCredit) {
      throw HttpError.badRequest('Compras no crédito ainda não podem ser recorrentes.');
    }

    const transaction = {
      id: randomUUID(),
      description: String(description).slice(0, 200),
      type,
      amount: numericAmount,
      category: String(category).slice(0, 120),
      date,
      allocationMode,
      installments: isCredit ? Math.min(60, Math.max(1, Math.round(Number(installments) || 1))) : 1,
      paidInvoice: INVOICE_PATTERN.test(String(paidInvoice ?? '')) ? paidInvoice : null,
    };

    await withTransaction(async (client) => {
      if (recurringDay != null) {
        transaction.recurringId = await this.recurringRepository.insert(client, userId, {
          description: transaction.description,
          type,
          amount: numericAmount,
          category: transaction.category,
          allocationMode: allocationMode === 'percentual' ? 'percentual' : 'especifico',
          bucketId: allocationMode === 'percentual' ? null : String(allocationList[0]?.bucketId ?? ''),
          dayOfMonth: clampMonthDay(recurringDay, 1),
          lastGeneratedMonth: monthKeyOf(date),
        });
      }

      await this.repository.insert(client, userId, transaction);
      for (const allocation of allocationList) {
        await this.repository.insertAllocation(client, userId, transaction.id, allocation);
      }
    });

    return { id: transaction.id };
  }

  async remove(userId, id) {
    const deleted = await this.repository.deleteById(userId, id);
    if (!deleted) {
      throw HttpError.notFound('Lançamento não encontrado.');
    }
  }
}
