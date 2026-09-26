import { randomUUID } from 'crypto';
import { withTransaction } from '../../db.js';
import { HttpError } from '../../http/HttpError.js';

const TYPES = new Set(['entrada', 'saida', 'credito']);
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const INVOICE_PATTERN = /^\d{4}-\d{2}$/;

export class TransactionsService {
  constructor(repository) {
    this.repository = repository;
  }

  list(userId) {
    return this.repository.findAll(userId);
  }

  /**
   * Cria um lançamento com suas alocações. Crédito não mexe em saldo nem
   * divisões — só cai na fatura — então não tem alocações.
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
