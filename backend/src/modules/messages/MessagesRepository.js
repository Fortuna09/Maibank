import { pool } from '../../db.js';

/** Quantas pessoas a busca do administrador devolve por vez. */
const SEARCH_LIMIT = 20;

export class MessagesRepository {
  constructor(db = pool) {
    this.db = db;
  }

  // ----- quem recebe -----

  async findUnread(userId) {
    const { rows } = await this.db.query(
      `SELECT id, title, body, created_at FROM user_messages
        WHERE user_id = $1 AND read_at IS NULL
        ORDER BY created_at ASC`,
      [userId]
    );
    return rows;
  }

  /** Marca como lida só se a mensagem é da pessoa. Devolve false se não achou. */
  async markRead(userId, messageId) {
    const { rowCount } = await this.db.query(
      `UPDATE user_messages SET read_at = COALESCE(read_at, now()) WHERE id = $1 AND user_id = $2`,
      [messageId, userId]
    );
    return rowCount > 0;
  }

  // ----- administrador -----

  /** Contas confirmadas; sem busca, as mais recentes. */
  async searchUsers(query) {
    const pattern = `%${query.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
    const { rows } = await this.db.query(
      `SELECT id, name, email, created_at FROM users
        WHERE email_verified_at IS NOT NULL
          AND ($1 = '' OR name ILIKE $2 OR email ILIKE $2)
        ORDER BY created_at DESC
        LIMIT ${SEARCH_LIMIT}`,
      [query, pattern]
    );
    return rows;
  }

  async findVerifiedUserIds(client, userIds = null) {
    const { rows } = userIds
      ? await client.query(`SELECT id FROM users WHERE email_verified_at IS NOT NULL AND id = ANY($1::uuid[])`, [userIds])
      : await client.query(`SELECT id FROM users WHERE email_verified_at IS NOT NULL`);
    return rows.map((row) => row.id);
  }

  async insertBatch(client, { batchId, userIds, sentBy, toAll, title, body }) {
    await client.query(
      `INSERT INTO user_messages (batch_id, user_id, sent_by, to_all, title, body)
       SELECT $1, recipient, $3, $4, $5, $6 FROM unnest($2::uuid[]) AS recipient`,
      [batchId, userIds, sentBy, toAll, title, body]
    );
  }

  /** Envios agrupados: para quem foi, quantos leram. */
  async listBatches(limit = 30) {
    const { rows } = await this.db.query(
      `SELECT m.batch_id,
              MIN(m.title) AS title,
              MIN(m.body) AS body,
              BOOL_OR(m.to_all) AS to_all,
              MIN(m.created_at) AS created_at,
              COUNT(*)::int AS recipients,
              COUNT(m.read_at)::int AS read_count,
              JSON_AGG(JSON_BUILD_OBJECT('name', u.name, 'email', u.email, 'read', m.read_at IS NOT NULL) ORDER BY u.name) AS people
         FROM user_messages m
         JOIN users u ON u.id = m.user_id
        GROUP BY m.batch_id
        ORDER BY MIN(m.created_at) DESC
        LIMIT $1`,
      [limit]
    );
    return rows;
  }
}
