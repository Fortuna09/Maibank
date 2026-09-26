import pg from 'pg';
import { config } from './config.js';

// DATE vem como 'AAAA-MM-DD' (sem virar Date e sem pular de dia por fuso).
pg.types.setTypeParser(1082, (value) => value);
// COUNT(*) e ids bigint: números pequenos o bastante para Number.
pg.types.setTypeParser(20, (value) => Number(value));

export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  // Em função serverless cada instância precisa de poucas conexões; o Neon faz o pooling de verdade.
  max: config.isProduction ? 3 : 10,
  // Solta conexões paradas antes de o Neon suspender o banco e derrubá-las.
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 10_000,
});

// Conexão ociosa derrubada (ex.: Neon dormiu) emite 'error' no pool; sem isso o processo cai.
pool.on('error', (error) => {
  console.warn('Conexão ociosa com o banco encerrada:', error.message);
});

export async function testDatabaseConnection() {
  await pool.query('SELECT 1');
}

/**
 * Roda `work(client)` dentro de uma transação: commit se resolver,
 * rollback se lançar. A conexão sempre volta para o pool.
 */
export async function withTransaction(work) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
