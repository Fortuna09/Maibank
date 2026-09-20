import { pool } from '../../db.js';

export class GoalsRepository {
  constructor(db = pool) {
    this.db = db;
  }

  async findAll() {
    const [rows] = await this.db.query(
      `SELECT id, title, target_amount AS targetAmount, current_amount AS currentAmount, due_date AS dueDate,
              save_amount AS saveAmount, save_frequency AS saveFrequency, created_at AS createdAt
         FROM goals
        ORDER BY due_date ASC, created_at DESC`
    );

    return rows.map((goal) => ({
      id: goal.id,
      title: goal.title,
      targetAmount: Number(goal.targetAmount),
      currentAmount: Number(goal.currentAmount),
      dueDate: goal.dueDate,
      saveAmount: Number(goal.saveAmount ?? 0),
      saveFrequency: goal.saveFrequency ?? 'mensal',
      createdAt: goal.createdAt,
    }));
  }

  async insert(goal) {
    await this.db.query(
      `INSERT INTO goals (id, title, target_amount, current_amount, due_date, save_amount, save_frequency, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [goal.id, goal.title, goal.targetAmount, goal.currentAmount, goal.dueDate, goal.saveAmount, goal.saveFrequency, goal.createdAt]
    );
  }

  async update(id, goal) {
    await this.db.query(
      `UPDATE goals
          SET title = ?, target_amount = ?, current_amount = ?, due_date = ?, save_amount = ?, save_frequency = ?, created_at = ?
        WHERE id = ?`,
      [goal.title, goal.targetAmount, goal.currentAmount, goal.dueDate, goal.saveAmount, goal.saveFrequency, goal.createdAt, id]
    );
  }

  async deleteById(id) {
    await this.db.query('DELETE FROM goals WHERE id = ?', [id]);
  }

  /** Trava a meta para a contribuição; devolve false se ela não existe. */
  async lockForUpdate(connection, id) {
    const [rows] = await connection.query('SELECT id FROM goals WHERE id = ? FOR UPDATE', [id]);
    return rows.length > 0;
  }

  async insertContribution(connection, goalId, amount, date) {
    await connection.query(
      'INSERT INTO goal_contributions (goal_id, amount, contribution_date) VALUES (?, ?, ?)',
      [goalId, amount, date]
    );
  }

  async incrementCurrentAmount(connection, goalId, amount) {
    await connection.query('UPDATE goals SET current_amount = current_amount + ? WHERE id = ?', [amount, goalId]);
  }
}
