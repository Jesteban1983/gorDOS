import { Pool } from 'pg';
import { env } from './env';

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 1,
});

const SQL = `
  CREATE TABLE IF NOT EXISTS _migrations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    applied_at TIMESTAMP NOT NULL DEFAULT NOW()
  );
`;

async function seed() {
  const client = await pool.connect();
  try {
    await client.query(SQL);
    console.log('✅ DB ready — tables managed by Drizzle migrations');
    console.log('   Run: cd backend && npm run db:migrate');
  } catch (err) {
    console.error('❌ Seed error:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();