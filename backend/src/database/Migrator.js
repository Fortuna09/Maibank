import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { withTransaction } from '../db.js';

const MIGRATIONS_DIR = fileURLToPath(new URL('./migrations/', import.meta.url));

/**
 * Aplica os arquivos de `migrations/` (001_x.sql, 002_y.sql…) que ainda não rodaram.
 * Tudo numa transação só, com trava: dois deploys ao mesmo tempo não aplicam em dobro,
 * e se um arquivo falhar nada fica pela metade.
 */
export class Migrator {
  constructor(runInTransaction = withTransaction) {
    this.runInTransaction = runInTransaction;
  }

  async run() {
    const files = (await readdir(MIGRATIONS_DIR)).filter((name) => name.endsWith('.sql')).sort();

    return this.runInTransaction(async (client) => {
      await client.query("SELECT pg_advisory_xact_lock(hashtext('maibank_migrations'))");
      await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
        version    text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )`);

      const { rows } = await client.query('SELECT version FROM schema_migrations');
      const applied = new Set(rows.map((row) => row.version));
      const pending = files.filter((name) => !applied.has(name));

      for (const name of pending) {
        const sql = await readFile(join(MIGRATIONS_DIR, name), 'utf8');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [name]);
      }

      return pending;
    });
  }
}
