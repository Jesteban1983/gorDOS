import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  boolean,
  jsonb,
  integer,
  decimal,
  pgEnum,
} from 'drizzle-orm/pg-core';

// ─── Enums ──────────────────────────────────────────────
export const userRoleEnum = pgEnum('user_role', ['customer', 'admin', 'kitchen', 'cashier']);
export const orderStatusEnum = pgEnum('order_status', [
  'pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'
]);
export const paymentMethodEnum = pgEnum('payment_method', ['stripe', 'cash_on_delivery']);
export const paymentStatusEnum = pgEnum('payment_status', ['pending', 'paid', 'failed', 'refunded']);

// ─── Users ──────────────────────────────────────────────
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  role: userRoleEnum('role').notNull().default('customer'),
  isActive: boolean('is_active').notNull().default(true),
  preferences: jsonb('preferences').$type<{
    favoriteProducts?: number[];
    dietary?: string[];
    notes?: string;
  }>(),
  lastOrderAt: timestamp('last_order_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ─── Guest Sessions ──────────────────────────────────────
export const guestSessions = pgTable('guest_sessions', {
  id: serial('id').primaryKey(),
  token: varchar('token', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ─── Categories ──────────────────────────────────────────
export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  description: text('description'),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ─── Products ────────────────────────────────────────────
export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  categoryId: integer('category_id').notNull().references(() => categories.id),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  description: text('description'),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  imageUrl: varchar('image_url', { length: 500 }),
  isAvailable: boolean('is_available').notNull().default(true),
  stock: integer('stock').notNull().default(0),
  preparationTime: integer('preparation_time'), // minutes
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ─── Product Addons ──────────────────────────────────────
export const productAddons = pgTable('product_addons', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').notNull().references(() => products.id),
  name: varchar('name', { length: 255 }).notNull(), // e.g., "Crema de ají", "Extra queso"
  price: decimal('price', { precision: 10, scale: 2 }).notNull().default('0'),
  type: varchar('type', { length: 50 }).notNull().default('addon'), // addon, sauce, drink
  isRequired: boolean('is_required').notNull().default(false),
  maxSelect: integer('max_select').notNull().default(1),
});

// ─── Orders ──────────────────────────────────────────────
export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  orderNumber: varchar('order_number', { length: 20 }).notNull().unique(),
  userId: integer('user_id').references(() => users.id),
  guestToken: varchar('guest_token', { length: 255 }),
  status: orderStatusEnum('status').notNull().default('pending'),
  paymentMethod: paymentMethodEnum('payment_method').notNull(),
  paymentStatus: paymentStatusEnum('payment_status').notNull().default('pending'),
  stripePaymentIntentId: varchar('stripe_payment_intent_id', { length: 255 }),
  subtotal: decimal('subtotal', { precision: 10, scale: 2 }).notNull(),
  deliveryFee: decimal('delivery_fee', { precision: 10, scale: 2 }).notNull().default('0'),
  total: decimal('total', { precision: 10, scale: 2 }).notNull(),
  notes: text('notes'),
  deliveryAddress: text('delivery_address'),
  estimatedTime: integer('estimated_time'), // minutes
  confirmedAt: timestamp('confirmed_at'),
  readyAt: timestamp('ready_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ─── Order Items ─────────────────────────────────────────
export const orderItems = pgTable('order_items', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id').notNull().references(() => orders.id),
  productId: integer('product_id').notNull().references(() => products.id),
  productName: varchar('product_name', { length: 255 }).notNull(),
  quantity: integer('quantity').notNull().default(1),
  unitPrice: decimal('unit_price', { precision: 10, scale: 2 }).notNull(),
  addons: jsonb('addons').$type<{ name: string; price: string }[]>(),
  notes: text('notes'),
  totalPrice: decimal('total_price', { precision: 10, scale: 2 }).notNull(),
});

// ─── Interactions (RAG Memory) ──────────────────────────
export const interactions = pgTable('interactions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  guestToken: varchar('guest_token', { length: 255 }),
  type: varchar('type', { length: 50 }).notNull(), // 'order', 'view', 'search', 'click'
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  embedding: text('embedding'), // pgvector vector as string
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Product = typeof products.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type Interaction = typeof interactions.$inferSelect;
