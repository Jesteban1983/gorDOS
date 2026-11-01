import { eq, inArray, sql } from 'drizzle-orm';
import { getDb } from '../../config/db';
import { orderItems, products, categories } from '../../config/schema';
import type { ProductRecommendation } from './types';

/**
 * A3 — RECOMENDADOR (Sugerencias contextuales y venta cruzada)
 * Algoritmo de co-ocurrencia ("Quien pidió X también pidió Y") + reglas gastronómicas.
 */
export async function getRecommendations(
  currentProductIds: number[] = [],
  limit: number = 4,
): Promise<ProductRecommendation[]> {
  const db = getDb();

  // 1. Catálogo de productos disponibles
  const allProducts = await db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      price: products.price,
      imageUrl: products.imageUrl,
      categoryName: categories.name,
    })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(eq(products.isAvailable, true));

  if (allProducts.length === 0) return [];
  const productMap = new Map(allProducts.map((p) => [p.id, p]));

  // 2. Si el cliente tiene productos en carrito o está viendo un producto específico:
  // Calculamos la frecuencia de co-ocurrencia en pedidos anteriores
  if (currentProductIds.length > 0) {
    // Pedidos que contienen alguno de los productos actuales
    const ordersWithProducts = await db
      .select({ orderId: orderItems.orderId })
      .from(orderItems)
      .where(sql`${orderItems.productId} in (${sql.join(currentProductIds, sql`, `)})`)
      .limit(100);

    const targetOrderIds = ordersWithProducts.map((o) => o.orderId);

    if (targetOrderIds.length > 0) {
      // Platos que se pidieron en esos mismos pedidos pero no son los actuales
      const coOccurring = await db
        .select({
          productId: orderItems.productId,
          count: sql<number>`count(*)::int`,
        })
        .from(orderItems)
        .where(
          and(
            sql`${orderItems.orderId} in (${sql.join(targetOrderIds, sql`, `)})`,
            sql`${orderItems.productId} not in (${sql.join(currentProductIds, sql`, `)})`,
          ),
        )
        .groupBy(orderItems.productId)
        .orderBy(sql`count(*) desc`)
        .limit(limit);

      if (coOccurring.length > 0) {
        const results: ProductRecommendation[] = [];
        for (const item of coOccurring) {
          const p = productMap.get(item.productId);
          if (p) {
            results.push({
              productId: p.id,
              productName: p.name,
              slug: p.slug,
              price: p.price,
              imageUrl: p.imageUrl,
              categoryName: p.categoryName,
              score: item.count,
              type: 'frequently_bought_together',
              reason: 'Los clientes que ordenaron este plato también agregaron',
            });
          }
        }
        if (results.length > 0) return results;
      }
    }
  }

  // 3. Reglas gastronómicas de venta cruzada (Bebidas & Guarniciones)
  // En fast food peruano: Pollos y Parrillas combinan con Chicha, Inca Kola y Guarniciones
  const crossSell = allProducts
    .filter((p) => !currentProductIds.includes(p.id))
    .filter((p) => p.categoryName === 'Bebidas' || p.categoryName === 'Guarniciones');

  if (crossSell.length > 0) {
    return crossSell.slice(0, limit).map((p) => ({
      productId: p.id,
      productName: p.name,
      slug: p.slug,
      price: p.price,
      imageUrl: p.imageUrl,
      categoryName: p.categoryName,
      score: 1.0,
      type: 'complementary' as const,
      reason:
        p.categoryName === 'Bebidas'
          ? 'El acompañamiento perfecto para tu comida'
          : 'Ideal como porción para compartir',
    }));
  }

  // 4. Fallback general: productos destacados
  return allProducts
    .filter((p) => !currentProductIds.includes(p.id))
    .slice(0, limit)
    .map((p) => ({
      productId: p.id,
      productName: p.name,
      slug: p.slug,
      price: p.price,
      imageUrl: p.imageUrl,
      categoryName: p.categoryName,
      score: 0.5,
      type: 'time_slot' as const,
      reason: 'Sugerencia especial de la carta gorDOS',
    }));
}
function and(arg0: any, arg1: any): any {
  return sql`(${arg0}) and (${arg1})`;
}
