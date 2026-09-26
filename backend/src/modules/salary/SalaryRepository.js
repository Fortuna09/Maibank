import { pool } from '../../db.js';

const DEFAULT_ROW = {
  is_enabled: false,
  amount: 0,
  description: 'Salário automático',
  pay_day: 5,
  last_processed_month: 0,
};

export class SalaryRepository {
  constructor(db = pool) {
    this.db = db;
  }

  /** Configuração do usuário, ou os valores padrão se ele nunca salvou. */
  async findConfigRow(userId) {
    const { rows } = await this.db.query('SELECT * FROM salary_config WHERE user_id = $1', [userId]);
    return rows[0] ?? DEFAULT_ROW;
  }

  async upsertConfig(userId, { isEnabled, amount, description, payDay }) {
    await this.db.query(
      `INSERT INTO salary_config (user_id, is_enabled, amount, description, pay_day) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id) DO UPDATE
         SET is_enabled = EXCLUDED.is_enabled, amount = EXCLUDED.amount,
             description = EXCLUDED.description, pay_day = EXCLUDED.pay_day`,
      [userId, isEnabled, amount, description, payDay]
    );
  }

  /** Garante a linha e a trava até o fim da transação (evita lançar o salário duas vezes). */
  async lockConfig(client, userId) {
    await client.query('INSERT INTO salary_config (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING', [userId]);
    const { rows } = await client.query('SELECT * FROM salary_config WHERE user_id = $1 FOR UPDATE', [userId]);
    return rows[0];
  }

  async markProcessed(client, userId, month) {
    await client.query('UPDATE salary_config SET last_processed_month = $2 WHERE user_id = $1', [userId, month]);
  }
}
