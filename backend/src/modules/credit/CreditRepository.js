import { pool } from '../../db.js';

const DEFAULT_CONFIG = { id: 1, closing_day: 25, due_day: 5 };

export class CreditRepository {
  constructor(db = pool) {
    this.db = db;
  }

  async findConfigRow() {
    const [rows] = await this.db.query('SELECT * FROM credit_config LIMIT 1');
    return rows[0] || DEFAULT_CONFIG;
  }

  async updateConfig({ closingDay, dueDay }) {
    await this.db.query('UPDATE credit_config SET closing_day = ?, due_day = ? WHERE id = 1', [closingDay, dueDay]);
  }
}
