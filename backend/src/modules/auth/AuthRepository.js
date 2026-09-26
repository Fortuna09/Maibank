import { pool } from '../../db.js';

const USER_COLUMNS = 'id, email, name, password_hash, email_verified_at, session_version';

export class AuthRepository {
  constructor(db = pool) {
    this.db = db;
  }

  async findByEmail(email, executor = this.db) {
    const { rows } = await executor.query(`SELECT ${USER_COLUMNS} FROM users WHERE email = $1`, [email]);
    return rows[0] ?? null;
  }

  async findById(id, executor = this.db) {
    const { rows } = await executor.query(`SELECT ${USER_COLUMNS} FROM users WHERE id = $1`, [id]);
    return rows[0] ?? null;
  }

  async insertUser(client, { email, name, passwordHash }) {
    const { rows } = await client.query(
      `INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING ${USER_COLUMNS}`,
      [email, name, passwordHash]
    );
    return rows[0];
  }

  /** Cadastro refeito antes de confirmar: troca nome e senha da conta ainda não verificada. */
  async updateUnverifiedUser(client, id, { name, passwordHash }) {
    const { rows } = await client.query(
      `UPDATE users SET name = $2, password_hash = $3 WHERE id = $1 AND email_verified_at IS NULL RETURNING ${USER_COLUMNS}`,
      [id, name, passwordHash]
    );
    return rows[0] ?? null;
  }

  async markEmailVerified(client, id) {
    const { rows } = await client.query(
      `UPDATE users SET email_verified_at = COALESCE(email_verified_at, now()) WHERE id = $1 RETURNING ${USER_COLUMNS}`,
      [id]
    );
    return rows[0] ?? null;
  }

  /** Nova senha derruba as outras sessões e, como provou posse do e-mail, confirma o e-mail. */
  async updatePassword(client, id, passwordHash) {
    const { rows } = await client.query(
      `UPDATE users
          SET password_hash = $2,
              session_version = session_version + 1,
              email_verified_at = COALESCE(email_verified_at, now())
        WHERE id = $1
        RETURNING ${USER_COLUMNS}`,
      [id, passwordHash]
    );
    return rows[0] ?? null;
  }

  async bumpSessionVersion(id) {
    await this.db.query('UPDATE users SET session_version = session_version + 1 WHERE id = $1', [id]);
  }

  async insertToken(executor, { userId, purpose, tokenHash, expiresAt }) {
    await executor.query(
      'INSERT INTO auth_tokens (user_id, purpose, token_hash, expires_at) VALUES ($1, $2, $3, $4)',
      [userId, purpose, tokenHash, expiresAt]
    );
  }

  async lastTokenCreatedAt(userId, purpose) {
    const { rows } = await this.db.query(
      'SELECT created_at FROM auth_tokens WHERE user_id = $1 AND purpose = $2 ORDER BY created_at DESC LIMIT 1',
      [userId, purpose]
    );
    return rows[0]?.created_at ?? null;
  }

  /** Usa o token uma única vez: só acerta se existir, for do propósito certo, não estiver usado nem vencido. */
  async consumeToken(client, tokenHash, purpose) {
    const { rows } = await client.query(
      `UPDATE auth_tokens SET used_at = now()
        WHERE token_hash = $1 AND purpose = $2 AND used_at IS NULL AND expires_at > now()
        RETURNING user_id`,
      [tokenHash, purpose]
    );
    return rows[0]?.user_id ?? null;
  }

  async invalidateTokens(client, userId, purpose) {
    await client.query(
      'UPDATE auth_tokens SET used_at = now() WHERE user_id = $1 AND purpose = $2 AND used_at IS NULL',
      [userId, purpose]
    );
  }
}
