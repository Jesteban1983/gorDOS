import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { env } from './env';

let pool: Pool;

export function getDb() {
  if (!pool) {
    pool = new Pool({
      connectionString: env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }
  return drizzle(pool);
}

export async function closeDb() {
  if (pool) {
    await pool.end();
    pool = undefined!;
  }
}