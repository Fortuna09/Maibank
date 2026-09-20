import { pool } from '../../db.js';

const DEFAULT_CONFIG = {
  id: 1,
  is_enabled: false,
  amount: 0,
  description: 'Salário automático',
  business_day: 5,
  last_processed_month: 0,
};

export class SalaryRepository {
  constructor(db = pool) {
    this.db = db;
  }

  /** Linha crua da configuração (a tabela tem uma só). */
  async findConfigRow() {
    const [rows] = await this.db.query('SELECT * FROM salary_config LIMIT 1');
    return rows[0] || DEFAULT_CONFIG;
  }

  async updateConfig({ isEnabled, amount, description, payDay }) {
    await this.db.query(
      'UPDATE salary_config SET is_enabled = ?, amount = ?, description = ?, business_day = ? WHERE id = 1',
      [isEnabled, amount, description, payDay]
    );
  }

  async markProcessed(connection, month) {
    await connection.query('UPDATE salary_config SET last_processed_month = ? WHERE id = 1', [month]);
  }
}
