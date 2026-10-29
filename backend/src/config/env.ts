import { config } from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// env.ts está en src/config/ → subimos 2 niveles hasta backend/
config({ path: path.resolve(__dirname, '../..', '.env') });

export const env = {
  // Server
  PORT: parseInt(process.env.PORT || '4000', 10),
  HOST: process.env.HOST || '0.0.0.0',
  NODE_ENV: process.env.NODE_ENV || 'development',

  // Database
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://gordos:***@localhost:5432/gordos',

  // Redis
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',

  // JWT
  JWT_SECRET: process.env.JWT_SECRET || '***',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '30d',

  // Stripe
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',

  // WhatsApp
  WHATSAPP_TOKEN: process.env.WHATSAPP_TOKEN || '',

  // CORS
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',

  // Crypto
  BCRYPT_ROUNDS: 12,
  get JWT_SECRET_BYTES() { return new TextEncoder().encode(this.JWT_SECRET); },
};