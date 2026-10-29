import bcrypt from 'bcryptjs';
import { env } from '../config/env';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, env.BCRYPT_ROUNDS);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function generateResetToken(): Promise<string> {
  const { randomBytes } = await import('node:crypto');
  return randomBytes(32).toString('hex');
}