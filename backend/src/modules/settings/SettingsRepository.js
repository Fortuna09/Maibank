import { pool } from '../../db.js';

export class SettingsRepository {
  constructor(db = pool) {
    this.db = db;
  }

  async findSettings() {
    const [rows] = await this.db.query(
      'SELECT id, base_income AS baseIncome FROM allocation_settings ORDER BY id ASC LIMIT 1'
    );
    const row = rows[0] || { id: 1, baseIncome: 2700 };
    return { id: row.id, baseIncome: Number(row.baseIncome) };
  }

  async findBuckets(connection = this.db) {
    const [rows] = await connection.query('SELECT id, label, percentage FROM allocation_buckets ORDER BY id ASC');
    return rows.map((bucket) => ({
      id: bucket.id,
      label: bucket.label,
      percentage: Number(bucket.percentage),
    }));
  }

  async updateBaseIncome(connection, baseIncome) {
    await connection.query(
      'UPDATE allocation_settings SET base_income = ? WHERE id = (SELECT id FROM (SELECT id FROM allocation_settings ORDER BY id ASC LIMIT 1) AS t)',
      [baseIncome]
    );
  }

  async countAllocationsForBucket(connection, bucketId) {
    const [[row]] = await connection.query(
      'SELECT COUNT(*) AS count FROM transaction_allocations WHERE bucket_id = ?',
      [bucketId]
    );
    return Number(row.count);
  }

  async deleteBucket(connection, bucketId) {
    await connection.query('DELETE FROM allocation_buckets WHERE id = ?', [bucketId]);
  }

  async upsertBucket(connection, bucket) {
    await connection.query(
      'INSERT INTO allocation_buckets (id, label, percentage) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE label = VALUES(label), percentage = VALUES(percentage)',
      [bucket.id, bucket.label, bucket.percentage]
    );
  }
}
