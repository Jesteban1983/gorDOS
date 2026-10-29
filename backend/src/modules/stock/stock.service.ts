import { and, asc, eq, lt, sql } from 'drizzle-orm';
import { getDb } from '../../config/db';
import { products } from '../../config/schema';
import { NotFoundError, BadRequestError } from '../../shared/errors';
import { broadcastStockUpdate } from './stock.hub';

// ─── Umbral de alerta de stock bajo ─────────────────────
export const LOW_STOCK_THRESHOLD = 10;

// ─── Consultas ──────────────────────────────────────────
export async function listStock() {
  const db = getDb();
  return db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      price: products.price,
      stock: products.stock,
      isAvailable: products.isAvailable,
      lowStock: sql<boolean>`${products.stock} <= ${LOW_STOCK_THRESHOLD}`,
      outOfStock: sql<boolean>`${products.stock} <= 0`,
      updatedAt: products.updatedAt,
    })
    .from(products)
    .orderBy(asc(products.id));
}

export async function listLowStock() {
  const db = getDb();
  return db
    .select({
      id: products.id,
      name: products.name,
      stock: products.stock,
      isAvailable: products.isAvailable,
      updatedAt: products.updatedAt,
    })
    .from(products)
    .where(lt(products.stock, LOW_STOCK_THRESHOLD))
    .orderBy(asc(products.stock));
}

/**
 * Actualiza el stock de un producto y transmite el cambio por WebSocket.
 * Si stock llega a 0 → isAvailable = false (desaparece de la carta).
 */
export async function updateStock(productId: number, newStock: number) {
  if (!Number.isInteger(newStock) || newStock < 0) {
    throw new BadRequestError('Stock debe ser un entero >= 0');
  }

  const db = getDb();
  const [existing] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
  if (!existing) {
    throw new NotFoundError('Producto no encontrado');
  }

  // Actualización manual admin: stock > 0 → disponible; stock = 0 → agotado.
  // (El toggle de disponibilidad manual está en catalog, aquí el stock manda.)
  const isAvailable = newStock > 0;

  const [updated] = await db
    .update(products)
    .set({
      stock: newStock,
      isAvailable,
      updatedAt: sql`now()`,
    })
    .where(eq(products.id, productId))
    .returning({ id: products.id, stock: products.stock, isAvailable: products.isAvailable });

  broadcastStockUpdate([updated]);
  return updated;
}

/**
 * Descuenta stock al confirmar un pedido.
 * Si no hay suficiente → error (el producto se agotó después de verlo).
 */
export async function decrementStock(productId: number, quantity: number) {
  const db = getDb();
  const [existing] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
  if (!existing) {
    throw new NotFoundError('Producto no encontrado');
  }
  if (existing.stock < quantity) {
    throw new BadRequestError(`Stock insuficiente para "${existing.name}" (queda ${existing.stock})`);
  }

  const newStock = existing.stock - quantity;
  const isAvailable = newStock > 0;

  const [updated] = await db
    .update(products)
    .set({
      stock: newStock,
      isAvailable,
      updatedAt: sql`now()`,
    })
    .where(eq(products.id, productId))
    .returning({ id: products.id, stock: products.stock, isAvailable: products.isAvailable });

  broadcastStockUpdate([updated]);
  return updated;
}

/**
 * Aumenta stock al cancelar un pedido (devuelve inventario).
 */
export async function incrementStock(productId: number, quantity: number) {
  const db = getDb();
  const [existing] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
  if (!existing) {
    throw new NotFoundError('Producto no encontrado');
  }

  const newStock = existing.stock + quantity;
  const isAvailable = newStock > 0 ? true : existing.isAvailable;

  const [updated] = await db
    .update(products)
    .set({
      stock: newStock,
      isAvailable,
      updatedAt: sql`now()`,
    })
    .where(eq(products.id, productId))
    .returning({ id: products.id, stock: products.stock, isAvailable: products.isAvailable });

  broadcastStockUpdate([updated]);
  return updated;
}

export async function bulkUpdateStock(updates: { id: number; stock: number }[]) {
  if (updates.length === 0) return [];
  const results = [];
  for (const u of updates) {
    results.push(await updateStock(u.id, u.stock));
  }
  return results;
}