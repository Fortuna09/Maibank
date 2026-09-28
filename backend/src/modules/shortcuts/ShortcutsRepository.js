import { pool } from '../../db.js';

export class ShortcutsRepository {
  constructor(db = pool) {
    this.db = db;
  }

  /** Cria ou troca a chave da pessoa (a antiga deixa de valer na hora). */
  async upsertKey(userId, keyHash, keyHint) {
    const { rows } = await this.db.query(
      `INSERT INTO shortcut_keys (user_id, key_hash, key_hint) VALUES ($1, $2, $3)
       ON CONFLICT (user_id) DO UPDATE SET key_hash = EXCLUDED.key_hash, key_hint = EXCLUDED.key_hint,
         created_at = now(), last_used_at = NULL
       RETURNING key_hint, created_at, last_used_at`,
      [userId, keyHash, keyHint]
    );
    return rows[0];
  }

  async findKey(userId) {
    const { rows } = await this.db.query('SELECT key_hint, created_at, last_used_at FROM shortcut_keys WHERE user_id = $1', [userId]);
    return rows[0] ?? null;
  }

  async deleteKey(userId) {
    await this.db.query('DELETE FROM shortcut_keys WHERE user_id = $1', [userId]);
  }

  /** Dono da chave, se ela vale e a conta está confirmada; já marca o uso. */
  async useKey(keyHash) {
    const { rows } = await this.db.query(
      `UPDATE shortcut_keys k SET last_used_at = now()
         FROM users u
        WHERE k.key_hash = $1 AND u.id = k.user_id AND u.email_verified_at IS NOT NULL
        RETURNING u.id, u.name`,
      [keyHash]
    );
    return rows[0] ?? null;
  }

  /** Registra um pedido da Siri e mantém só os `keep` mais recentes da pessoa. */
  async insertLog(userId, entry, keep = 15) {
    await this.db.query(
      `INSERT INTO shortcut_log (user_id, heard, amount, description, ok, message) VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, entry.heard, entry.amount, entry.description, entry.ok, entry.message]
    );
    await this.db.query(
      `DELETE FROM shortcut_log WHERE user_id = $1 AND id NOT IN (
         SELECT id FROM shortcut_log WHERE user_id = $1 ORDER BY created_at DESC, id DESC LIMIT $2)`,
      [userId, keep]
    );
  }

  async findLog(userId, limit = 15) {
    const { rows } = await this.db.query(
      `SELECT heard, amount, description, ok, message, created_at FROM shortcut_log
        WHERE user_id = $1 ORDER BY created_at DESC, id DESC LIMIT $2`,
      [userId, limit]
    );
    return rows.map((row) => ({
      heard: row.heard,
      amount: row.amount === null ? null : Number(row.amount),
      description: row.description,
      ok: row.ok,
      message: row.message,
      createdAt: row.created_at,
    }));
  }

  /** Saldo de uma divisão: soma das alocações (entradas positivas, saídas negativas). */
  async bucketBalance(userId, bucketId) {
    const { rows } = await this.db.query(
      'SELECT COALESCE(SUM(amount), 0) AS balance FROM transaction_allocations WHERE user_id = $1 AND bucket_id = $2',
      [userId, bucketId]
    );
    return Number(rows[0].balance);
  }
}
