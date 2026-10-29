import { z } from 'zod';

// ─── Register ───────────────────────────────────────────
export const registerSchema = z.object({
  name: z.string().min(2).max(255),
  email: z.string().email().max(255),
  password: z.string().min(6).max(128),
  phone: z.string().max(20).optional(),
});

export type RegisterDTO = z.infer<typeof registerSchema>;

// ─── Login ──────────────────────────────────────────────
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type LoginDTO = z.infer<typeof loginSchema>;

// ─── Guest Session ──────────────────────────────────────
export const createGuestSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  phone: z.string().max(20).optional(),
});

export type CreateGuestDTO = z.infer<typeof createGuestSchema>;

// ─── Response ───────────────────────────────────────────
export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
}

export interface TokenPayload {
  userId: number;
  role: string;
  type: 'access' | 'refresh';
}