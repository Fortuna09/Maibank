import { pool } from '../../db.js';

const COLUMNS = `id, description, type, amount, category, allocation_mode, bucket_id, day_of_month, last_generated_month`;

export class RecurringRepository {
  constructor(db = pool) {
    this.db = db;
  }

  async findAll(userId) {
    const { rows } = await this.db.query(
      `SELECT ${COLUMNS} FROM recurring_transactions WHERE user_id = $1 ORDER BY type ASC, day_of_month ASC, created_at ASC`,
      [userId]
    );
    return rows;
  }

  /** Trava os modelos até o fim da transação: duas abas abertas não geram o mesmo mês duas vezes. */
  async lockAll(client, userId) {
    const { rows } = await client.query(
      `SELECT ${COLUMNS} FROM recurring_transactions WHERE user_id = $1 ORDER BY created_at ASC FOR UPDATE`,
      [userId]
    );
    return rows;
  }

  async insert(client, userId, recurring) {
    const { rows } = await client.query(
      `INSERT INTO recurring_transactions
         (user_id, description, type, amount, category, allocation_mode, bucket_id, day_of_month, last_generated_month)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [
        userId,
        recurring.description,
        recurring.type,
        recurring.amount,
        recurring.category,
        recurring.allocationMode,
        recurring.bucketId,
        recurring.dayOfMonth,
        recurring.lastGeneratedMonth,
      ]
    );
    return rows[0].id;
  }

  async markGenerated(client, id, month) {
    await client.query('UPDATE recurring_transactions SET last_generated_month = $2 WHERE id = $1', [id, month]);
  }

  /** Devolve quantos apagou (0 se não existe ou é de outro usuário). */
  async deleteById(userId, id) {
    const { rowCount } = await this.db.query('DELETE FROM recurring_transactions WHERE id = $1 AND user_id = $2', [id, userId]);
    return rowCount;
  }
}
