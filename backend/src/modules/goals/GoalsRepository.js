import { pool } from '../../db.js';

export class GoalsRepository {
  constructor(db = pool) {
    this.db = db;
  }

  /** Metas com prazo primeiro (as mais próximas no topo), depois as sem prazo. */
  async findAll(userId) {
    const { rows } = await this.db.query(
      `SELECT id, title, target_amount, current_amount, due_date, save_amount, save_frequency, created_at
         FROM goals
        WHERE user_id = $1
        ORDER BY due_date ASC NULLS LAST, created_at DESC`,
      [userId]
    );

    return rows.map((goal) => ({
      id: goal.id,
      title: goal.title,
      targetAmount: Number(goal.target_amount),
      currentAmount: Number(goal.current_amount),
      dueDate: goal.due_date,
      saveAmount: Number(goal.save_amount ?? 0),
      saveFrequency: goal.save_frequency ?? 'mensal',
      createdAt: goal.created_at,
    }));
  }

  async insert(userId, goal) {
    await this.db.query(
      `INSERT INTO goals (id, user_id, title, target_amount, current_amount, due_date, save_amount, save_frequency, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [goal.id, userId, goal.title, goal.targetAmount, goal.currentAmount, goal.dueDate, goal.saveAmount, goal.saveFrequency, goal.createdAt]
    );
  }

  /** Devolve quantas metas alterou (0 se não existe ou é de outro usuário). */
  async update(userId, id, goal) {
    const { rowCount } = await this.db.query(
      `UPDATE goals
          SET title = $3, target_amount = $4, current_amount = $5, due_date = $6,
              save_amount = $7, save_frequency = $8, created_at = $9
        WHERE id = $1 AND user_id = $2`,
      [id, userId, goal.title, goal.targetAmount, goal.currentAmount, goal.dueDate, goal.saveAmount, goal.saveFrequency, goal.createdAt]
    );
    return rowCount;
  }

  async deleteById(userId, id) {
    const { rowCount } = await this.db.query('DELETE FROM goals WHERE id = $1 AND user_id = $2', [id, userId]);
    return rowCount;
  }

  /** Trava a meta para o aporte; false se ela não existe ou é de outro usuário. */
  async lockForUpdate(client, userId, id) {
    const { rows } = await client.query('SELECT id FROM goals WHERE id = $1 AND user_id = $2 FOR UPDATE', [id, userId]);
    return rows.length > 0;
  }

  async insertContribution(client, goalId, amount, date) {
    await client.query(
      'INSERT INTO goal_contributions (goal_id, amount, contribution_date) VALUES ($1, $2, $3)',
      [goalId, amount, date]
    );
  }

  async incrementCurrentAmount(client, goalId, amount) {
    await client.query('UPDATE goals SET current_amount = current_amount + $2 WHERE id = $1', [goalId, amount]);
  }
}
