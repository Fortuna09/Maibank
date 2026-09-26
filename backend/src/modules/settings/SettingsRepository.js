import { pool } from '../../db.js';
import { DEFAULT_BASE_INCOME, DEFAULT_BUCKETS } from './defaults.js';

export class SettingsRepository {
  constructor(db = pool) {
    this.db = db;
  }

  async findBaseIncome(userId) {
    const { rows } = await this.db.query('SELECT base_income FROM allocation_settings WHERE user_id = $1', [userId]);
    return rows[0] ? Number(rows[0].base_income) : DEFAULT_BASE_INCOME;
  }

  async findBuckets(userId, executor = this.db) {
    const { rows } = await executor.query(
      'SELECT id, label, percentage FROM allocation_buckets WHERE user_id = $1 ORDER BY position ASC, id ASC',
      [userId]
    );
    return rows.map((bucket) => ({ id: bucket.id, label: bucket.label, percentage: Number(bucket.percentage) }));
  }

  async upsertBaseIncome(client, userId, baseIncome) {
    await client.query(
      `INSERT INTO allocation_settings (user_id, base_income) VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET base_income = EXCLUDED.base_income`,
      [userId, baseIncome]
    );
  }

  async countAllocationsForBucket(client, userId, bucketId) {
    const { rows } = await client.query(
      'SELECT COUNT(*) AS count FROM transaction_allocations WHERE user_id = $1 AND bucket_id = $2',
      [userId, bucketId]
    );
    return rows[0].count;
  }

  async deleteBucket(client, userId, bucketId) {
    await client.query('DELETE FROM allocation_buckets WHERE user_id = $1 AND id = $2', [userId, bucketId]);
  }

  async upsertBucket(client, userId, bucket, position) {
    await client.query(
      `INSERT INTO allocation_buckets (user_id, id, label, percentage, position) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, id) DO UPDATE
         SET label = EXCLUDED.label, percentage = EXCLUDED.percentage, position = EXCLUDED.position`,
      [userId, bucket.id, bucket.label, bucket.percentage, position]
    );
  }

  /** Configuração inicial de uma conta nova (roda na mesma transação do cadastro). */
  async seedDefaults(client, userId) {
    await this.upsertBaseIncome(client, userId, DEFAULT_BASE_INCOME);
    for (const [position, bucket] of DEFAULT_BUCKETS.entries()) {
      await this.upsertBucket(client, userId, bucket, position);
    }
  }
}
