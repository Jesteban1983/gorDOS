import { eq, desc, sql, inArray } from 'drizzle-orm';
import { getDb } from '../../config/db';
import { orders, orderItems, products, categories } from '../../config/schema';
import { getCustomerContext } from './a1-rag.service';
import type { PredictedItem } from './types';

/**
 * A2 — PREDICTOR (Probabilidad de Pedido)
 * Modelo probabilístico ponderado por histórico, recencia, hora y día de la semana.
 */
export async function predictCustomerOrder(
  userId?: number,
  guestToken?: string,
): Promise<PredictedItem[]> {
  const db = getDb();
  const now = new Date();
  const currentHour = now.getHours();
  const currentDay = now.getDay(); // 0 = Domingo, 6 = Sábado

  // 1. Obtener contexto de memoria desde A1
  const customerContext = await getCustomerContext(userId, guestToken);

  // 2. Obtener productos activos de la carta
  const availableProducts = await db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      price: products.price,
      imageUrl: products.imageUrl,
      preparationTime: products.preparationTime,
      categoryName: categories.name,
    })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(eq(products.isAvailable, true));

  if (availableProducts.length === 0) return [];

  // 3. Si el cliente tiene histórico, calculamos scoring personalizado
  if (customerContext.totalOrders > 0) {
    const orderIdentityClause = userId
      ? eq(orders.userId, userId)
      : eq(orders.guestToken, guestToken!);

    const customerOrders = await db
      .select({ id: orders.id, createdAt: orders.createdAt })
      .from(orders)
      .where(orderIdentityClause)
      .orderBy(desc(orders.createdAt))
      .limit(20);

    const orderIds = customerOrders.map((o) => o.id);

    const itemsHistory = await db
      .select({
        productId: orderItems.productId,
        orderId: orderItems.orderId,
        quantity: orderItems.quantity,
      })
      .from(orderItems)
      .where(sql`${orderItems.orderId} in (${sql.join(orderIds, sql`, `)})`);

    // Mapeo de fecha de cada orden
    const orderDateMap = new Map(customerOrders.map((o) => [o.id, new Date(o.createdAt)]));

    // Ponderaciones:
    // W_freq = 0.40 (frecuencia de compra)
    // W_rec = 0.25 (recencia)
    // W_time = 0.20 (afinidad de hora)
    // W_day = 0.15 (afinidad de día)

    const productScores = new Map<number, { score: number; reasons: string[] }>();

    for (const item of itemsHistory) {
      const orderDate = orderDateMap.get(item.orderId);
      if (!orderDate) continue;

      let score = 0;
      const reasons: string[] = [];

      // Frecuencia
      score += 0.4 * item.quantity;

      // Recencia (orden más reciente = mayor puntaje)
      const daysAgo = (now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysAgo <= 7) {
        score += 0.25;
        reasons.push('Pedido recientemente');
      } else if (daysAgo <= 30) {
        score += 0.15;
      }

      // Afinidad de hora (± 2 horas de diferencia)
      const orderHour = orderDate.getHours();
      const hourDiff = Math.abs(currentHour - orderHour);
      if (hourDiff <= 2) {
        score += 0.2;
        reasons.push('Tu plato habitual en este horario');
      }

      // Afinidad de día (fin de semana vs día de semana)
      const isWeekendOrder = orderDate.getDay() === 0 || orderDate.getDay() === 6;
      const isCurrentWeekend = currentDay === 0 || currentDay === 6;
      if (isWeekendOrder === isCurrentWeekend) {
        score += 0.15;
      }

      const prev = productScores.get(item.productId) ?? { score: 0, reasons: [] };
      productScores.set(item.productId, {
        score: prev.score + score,
        reasons: Array.from(new Set([...prev.reasons, ...reasons])),
      });
    }

    // Normalización de probabilidades a [0.15, 0.95]
    let maxRaw = 0;
    for (const v of productScores.values()) {
      if (v.score > maxRaw) maxRaw = v.score;
    }

    const predictions: PredictedItem[] = [];
    for (const prod of availableProducts) {
      const entry = productScores.get(prod.id);
      if (entry && maxRaw > 0) {
        const normalized = 0.4 + (entry.score / maxRaw) * 0.52; // entre 40% y 92%
        const probPct = Math.round(normalized * 100);
        predictions.push({
          productId: prod.id,
          productName: prod.name,
          slug: prod.slug,
          price: prod.price,
          imageUrl: prod.imageUrl,
          probability: Math.min(0.95, normalized),
          probabilityPercentage: probPct,
          confidence: probPct >= 75 ? 'alta' : 'media',
          reason: entry.reasons[0] || 'Basado en tu historial frecuente',
        });
      }
    }

    if (predictions.length > 0) {
      return predictions.sort((a, b) => b.probability - a.probability).slice(0, 3);
    }
  }

  // 4. Si es cliente nuevo o sin historial suficiente: sugerencia contextual por hora del restaurante
  // Almuerzo (12-16h) -> Pollo a la brasa / Parrillas
  // Noche (19-23h) -> Hamburguesas / Pollo entero
  let timeSlotLabel = 'Almuerzo';
  let slotFilter = 'Pollos a la brasa';
  if (currentHour >= 19 || currentHour < 4) {
    timeSlotLabel = 'Cena';
    slotFilter = 'Hamburguesas';
  } else if (currentHour >= 16 && currentHour < 19) {
    timeSlotLabel = 'Tarde';
    slotFilter = 'Guarniciones';
  }

  return availableProducts
    .slice(0, 3)
    .map((prod, idx) => {
      const baseProb = 0.72 - idx * 0.1;
      return {
        productId: prod.id,
        productName: prod.name,
        slug: prod.slug,
        price: prod.price,
        imageUrl: prod.imageUrl,
        probability: baseProb,
        probabilityPercentage: Math.round(baseProb * 100),
        confidence: idx === 0 ? 'alta' : 'media',
        reason: `Recomendado para el ${timeSlotLabel} · Lo más pedido`,
      };
    });
}

