import { pool } from '../../db.js';

export class TransactionsRepository {
  constructor(db = pool) {
    this.db = db;
  }

  /** Lançamentos do usuário, do mais recente para o mais antigo, já com as alocações. */
  async findAll(userId) {
    const [transactions, allocations] = await Promise.all([
      this.db.query(
        `SELECT id, description, type, amount, category, transaction_date AS date,
                allocation_mode AS "allocationMode", installments, paid_invoice AS "paidInvoice"
           FROM transactions
          WHERE user_id = $1
          ORDER BY transaction_date DESC, created_at DESC`,
        [userId]
      ),
      this.db.query(
        `SELECT transaction_id AS "transactionId", bucket_id AS "bucketId", amount
           FROM transaction_allocations
          WHERE user_id = $1
          ORDER BY id ASC`,
        [userId]
      ),
    ]);

    const allocationsByTransaction = new Map();
    for (const allocation of allocations.rows) {
      const list = allocationsByTransaction.get(allocation.transactionId) ?? [];
      list.push({ bucketId: allocation.bucketId, amount: Number(allocation.amount) });
      allocationsByTransaction.set(allocation.transactionId, list);
    }

    return transactions.rows.map((transaction) => ({
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

  async insert(client, userId, transaction) {
    await client.query(
      `INSERT INTO transactions
         (id, user_id, description, type, amount, category, transaction_date, allocation_mode, installments, paid_invoice)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        transaction.id,
        userId,
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

  async insertAllocation(client, userId, transactionId, allocation) {
    await client.query(
      'INSERT INTO transaction_allocations (transaction_id, user_id, bucket_id, amount) VALUES ($1, $2, $3, $4)',
      [transactionId, userId, String(allocation.bucketId), Number(allocation.amount)]
    );
  }

  /** Devolve quantos lançamentos apagou (0 se não existe ou é de outro usuário). */
  async deleteById(userId, id) {
    const { rowCount } = await this.db.query('DELETE FROM transactions WHERE id = $1 AND user_id = $2', [id, userId]);
    return rowCount;
  }
}
