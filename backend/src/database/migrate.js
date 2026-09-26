import { pool } from '../db.js';
import { Migrator } from './Migrator.js';

/**
 * `npm run migrate` — aplica as migrations pendentes.
 * Com `--if-configured` (usado no build da Vercel) não faz nada se não houver DATABASE_URL.
 */
if (process.argv.includes('--if-configured') && !process.env.DATABASE_URL) {
  console.log('[migrate] DATABASE_URL não definido; pulando migrations.');
  process.exit(0);
}

try {
  const applied = await new Migrator().run();
  console.log(applied.length ? `[migrate] Aplicadas: ${applied.join(', ')}` : '[migrate] Banco já está atualizado.');
} catch (error) {
  console.error('[migrate] Falhou:', error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
