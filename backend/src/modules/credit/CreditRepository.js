import { pool } from '../../db.js';

const DEFAULT_ROW = { closing_day: 25, due_day: 5 };

export class CreditRepository {
  constructor(db = pool) {
    this.db = db;
  }

  async findConfigRow(userId) {
    const { rows } = await this.db.query('SELECT closing_day, due_day FROM credit_config WHERE user_id = $1', [userId]);
    return rows[0] ?? DEFAULT_ROW;
  }

  async upsertConfig(userId, { closingDay, dueDay }) {
    await this.db.query(
      `INSERT INTO credit_config (user_id, closing_day, due_day) VALUES ($1, $2, $3)
       ON CONFLICT (user_id) DO UPDATE SET closing_day = EXCLUDED.closing_day, due_day = EXCLUDED.due_day`,
      [userId, closingDay, dueDay]
    );
  }
}
