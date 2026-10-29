import { eq } from 'drizzle-orm';
import { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import { getDb } from '../../config/db';
import { users, guestSessions } from '../../config/schema';
import { comparePassword, hashPassword } from '../../utils/password';
import { ConflictError, NotFoundError, UnauthorizedError } from '../../shared/errors';
import type { LoginDTO, RegisterDTO, TokenPayload } from '../../shared/types/auth';

export interface AuthResult {
  token: string;
  refreshToken: string;
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
}

function signTokens(app: FastifyInstance, payload: TokenPayload) {
  const token = app.jwt.sign(
    { ...payload, type: 'access' },
    { expiresIn: '7d' },
  );
  const refreshToken = app.jwt.sign(
    { ...payload, type: 'refresh' },
    { expiresIn: '30d' },
  );
  return { token, refreshToken };
}

function toAuthResult(app: FastifyInstance, user: typeof users.$inferSelect): AuthResult {
  const { token, refreshToken } = signTokens(app, {
    userId: user.id,
    role: user.role,
    type: 'access',
  });
  return {
    token,
    refreshToken,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  };
}

export async function register(app: FastifyInstance, dto: RegisterDTO): Promise<AuthResult> {
  const db = getDb();
  const existing = await db.select().from(users).where(eq(users.email, dto.email.toLowerCase())).limit(1);

  if (existing.length > 0) {
    throw new ConflictError('Ya existe una cuenta con ese email');
  }

  const passwordHash = await hashPassword(dto.password);
  const [user] = await db
    .insert(users)
    .values({
      name: dto.name.trim(),
      email: dto.email.toLowerCase().trim(),
      passwordHash,
      phone: dto.phone,
      role: 'customer',
      preferences: {},
    })
    .returning();

  return toAuthResult(app, user);
}

export async function login(app: FastifyInstance, dto: LoginDTO): Promise<AuthResult> {
  const db = getDb();
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, dto.email.toLowerCase()))
    .limit(1);

  if (!user || !user.isActive) {
    throw new UnauthorizedError('Email o contraseña incorrectos');
  }

  const valid = await comparePassword(dto.password, user.passwordHash);
  if (!valid) {
    throw new UnauthorizedError('Email o contraseña incorrectos');
  }

  return toAuthResult(app, user);
}

export async function refresh(app: FastifyInstance, refreshToken: string): Promise<AuthResult> {
  const db = getDb();
  let payload: TokenPayload;
  try {
    payload = app.jwt.verify<TokenPayload>(refreshToken);
  } catch {
    throw new UnauthorizedError('Sesión expirada, vuelve a iniciar sesión');
  }

  if (payload.type !== 'refresh') {
    throw new UnauthorizedError('Token inválido');
  }

  const [user] = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
  if (!user || !user.isActive) {
    throw new UnauthorizedError('Usuario no encontrado');
  }

  return toAuthResult(app, user);
}

export async function getProfile(userId: number) {
  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) {
    throw new NotFoundError('Usuario no encontrado');
  }
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    preferences: user.preferences,
    lastOrderAt: user.lastOrderAt,
    createdAt: user.createdAt,
  };
}

export async function createGuestSession(dto: { name?: string; phone?: string }) {
  const db = getDb();
  const token = randomUUID().replace(/-/g, '');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 días

  const [session] = await db
    .insert(guestSessions)
    .values({ token, name: dto.name, phone: dto.phone, expiresAt })
    .returning();

  return { guestToken: session.token, expiresAt: session.expiresAt };
}

export async function getGuestSession(token: string) {
  const db = getDb();
  const [session] = await db
    .select()
    .from(guestSessions)
    .where(eq(guestSessions.token, token))
    .limit(1);

  if (!session || session.expiresAt < new Date()) {
    throw new UnauthorizedError('Sesión de invitado expirada o inválida');
  }
  return session;
}