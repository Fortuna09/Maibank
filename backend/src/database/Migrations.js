import { pool } from '../db.js';

/**
 * Ajustes de esquema idempotentes que rodam a cada subida do servidor.
 * O esquema base vem de infra/mysql/init.sql; aqui só entram colunas e
 * tabelas adicionadas depois, para não exigir migração manual.
 */
export class Migrations {
  constructor(db = pool) {
    this.db = db;
  }

  async run() {
    await this.ensureTransactionColumns();
    await this.ensureGoalColumns();
    await this.ensureGoalContributionsTable();
    await this.ensureSalaryConfigTable();
    await this.ensureCreditConfigTable();
  }

  async ensureTransactionColumns() {
    await this.addMissingColumns('transactions', [
      ['installments', 'INT NOT NULL DEFAULT 1'],
      ['paid_invoice', 'VARCHAR(7) NULL'],
    ]);
  }

  async ensureGoalColumns() {
    const [columns] = await this.db.query('SHOW COLUMNS FROM goals');
    const dueDateColumn = columns.find((column) => column.Field === 'due_date');

    if (dueDateColumn && dueDateColumn.Null !== 'YES') {
      await this.db.query('ALTER TABLE goals MODIFY COLUMN due_date DATE NULL');
    }

    await this.addMissingColumns('goals', [
      ['save_amount', 'DECIMAL(12,2) NOT NULL DEFAULT 0'],
      ['save_frequency', 'VARCHAR(20) NOT NULL DEFAULT "mensal"'],
    ]);
  }

  async ensureGoalContributionsTable() {
    await this.db.query(`CREATE TABLE IF NOT EXISTS goal_contributions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      goal_id CHAR(36) NOT NULL,
      amount DECIMAL(12, 2) NOT NULL,
      contribution_date DATE NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_contribution_goal FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE
    )`);
  }

  async ensureSalaryConfigTable() {
    await this.db.query(`CREATE TABLE IF NOT EXISTS salary_config (
      id INT AUTO_INCREMENT PRIMARY KEY,
      is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
      amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
      description VARCHAR(255) NOT NULL DEFAULT 'Salário automático',
      business_day INT NOT NULL DEFAULT 5,
      last_processed_month INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`);

    await this.seedSingleRow(
      'salary_config',
      'INSERT INTO salary_config (is_enabled, amount, description, business_day, last_processed_month) VALUES (?, ?, ?, ?, ?)',
      [false, 0, 'Salário automático', 5, 0]
    );
  }

  async ensureCreditConfigTable() {
    await this.db.query(`CREATE TABLE IF NOT EXISTS credit_config (
      id INT AUTO_INCREMENT PRIMARY KEY,
      closing_day INT NOT NULL DEFAULT 25,
      due_day INT NOT NULL DEFAULT 5,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`);

    await this.seedSingleRow('credit_config', 'INSERT INTO credit_config (closing_day, due_day) VALUES (?, ?)', [25, 5]);
  }

  async addMissingColumns(table, definitions) {
    const [columns] = await this.db.query(`SHOW COLUMNS FROM ${table}`);
    const existing = new Set(columns.map((column) => column.Field));

    for (const [name, definition] of definitions) {
      if (!existing.has(name)) {
        await this.db.query(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`);
      }
    }
  }

  /** Tabelas de configuração têm exatamente uma linha; cria se estiver vazia. */
  async seedSingleRow(table, insertSql, params) {
    const [[row]] = await this.db.query(`SELECT COUNT(*) AS count FROM ${table}`);
    if (row.count === 0) {
      await this.db.query(insertSql, params);
    }
  }
}
