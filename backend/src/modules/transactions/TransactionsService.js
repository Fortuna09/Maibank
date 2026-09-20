import { randomUUID } from 'crypto';
import { withTransaction } from '../../db.js';
import { HttpError } from '../../http/HttpError.js';

const TYPES = new Set(['entrada', 'saida', 'credito']);

export class TransactionsService {
  constructor(repository) {
    this.repository = repository;
  }

  list() {
    return this.repository.findAll();
  }

  /**
   * Cria um lançamento com suas alocações. Crédito não mexe em saldo nem
   * divisões — só cai na fatura — então não tem alocações.
   */
  async create(payload) {
    const { description, type, amount, category, date, allocationMode, allocations, installments, paidInvoice } = payload;

    const isCredit = type === 'credito';
    const allocationList = isCredit ? [] : Array.isArray(allocations) ? allocations : [];

    if (!description || !TYPES.has(type) || !amount || !category || !date || !allocationMode) {
      throw HttpError.badRequest('Dados de transacao invalidos.');
    }
    if (!isCredit && allocationList.length === 0) {
      throw HttpError.badRequest('Dados de transacao invalidos.');
    }

    const transaction = {
      id: randomUUID(),
      description,
      type,
      amount: Number(amount),
      category,
      date,
      allocationMode,
      installments: isCredit ? Math.max(1, Math.round(Number(installments) || 1)) : 1,
      paidInvoice: paidInvoice ? String(paidInvoice).slice(0, 7) : null,
    };

    await withTransaction(async (connection) => {
      await this.repository.insert(connection, transaction);
      for (const allocation of allocationList) {
        await this.repository.insertAllocation(connection, transaction.id, allocation);
      }
    });

    return { id: transaction.id };
  }

  remove(id) {
    return this.repository.deleteById(id);
  }
}
