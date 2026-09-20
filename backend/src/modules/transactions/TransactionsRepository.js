import { pool } from '../../db.js';

export class TransactionsRepository {
  constructor(db = pool) {
    this.db = db;
  }

  /** Todos os lançamentos, do mais recente para o mais antigo, já com as alocações. */
  async findAll() {
    const [transactionRows] = await this.db.query(
      `SELECT id, description, type, amount, category, transaction_date AS date,
              allocation_mode AS allocationMode, installments, paid_invoice AS paidInvoice
         FROM transactions
        ORDER BY transaction_date DESC, created_at DESC`
    );

    const [allocationRows] = await this.db.query(
      'SELECT transaction_id AS transactionId, bucket_id AS bucketId, amount FROM transaction_allocations ORDER BY id ASC'
    );

    const allocationsByTransaction = new Map();
    for (const allocation of allocationRows) {
      const list = allocationsByTransaction.get(allocation.transactionId) ?? [];
      list.push({ bucketId: allocation.bucketId, amount: Number(allocation.amount) });
      allocationsByTransaction.set(allocation.transactionId, list);
    }

    return transactionRows.map((transaction) => ({
      id: transaction.id,
      description: transaction.description,
      type: transaction.type,
      amount: Number(transaction.amount),
      category: transaction.category,
      date: transaction.date,
      allocationMode: transaction.allocationMode,
      installments: Math.max(1, Number(transaction.installments ?? 1)),
      paidInvoice: transaction.paidInvoice ?? null,
      allocations: allocationsByTransaction.get(transaction.id) ?? [],
    }));
  }

  async insert(connection, transaction) {
    await connection.query(
      `INSERT INTO transactions
         (id, description, type, amount, category, transaction_date, allocation_mode, installments, paid_invoice)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        transaction.id,
        transaction.description,
        transaction.type,
        transaction.amount,
        transaction.category,
        transaction.date,
        transaction.allocationMode,
        transaction.installments,
        transaction.paidInvoice,
      ]
    );
  }

  async insertAllocation(connection, transactionId, allocation) {
    await connection.query(
      'INSERT INTO transaction_allocations (transaction_id, bucket_id, amount) VALUES (?, ?, ?)',
      [transactionId, String(allocation.bucketId), Number(allocation.amount)]
    );
  }

  async deleteById(id) {
    await this.db.query('DELETE FROM transactions WHERE id = ?', [id]);
  }
}
