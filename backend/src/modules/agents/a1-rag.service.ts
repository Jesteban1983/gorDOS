import { eq, or, desc, sql, and } from 'drizzle-orm';
import { getDb } from '../../config/db';
import { interactions, orders, orderItems, products, users } from '../../config/schema';
import {
  generateEmbedding,
  serializeEmbedding,
  deserializeEmbedding,
  cosineSimilarity,
} from './embedding';
import type { AgentInteractionInput, CustomerMemoryProfile } from './types';

/**
 * A1 — RAG (Memoria de Interacciones & Perfil del Cliente)
 * Almacena interacciones y recupera contexto enriquecido para personalización.
 */
export async function recordInteraction(input: AgentInteractionInput) {
  const db = getDb();

  // Construcción del texto descriptivo para el embedding semántico
  let semanticText = `Tipo: ${input.type}`;
  if (input.metadata) {
    if (input.metadata.query) {
      semanticText += ` Búsqueda: ${input.metadata.query}`;
    }
    if (input.metadata.productName) {
      semanticText += ` Producto: ${input.metadata.productName}`;
    }
    if (input.metadata.categoryName) {
      semanticText += ` Categoría: ${input.metadata.categoryName}`;
    }
    if (input.metadata.items && Array.isArray(input.metadata.items)) {
      const names = input.metadata.items.map((i: any) => i.productName || i.name).filter(Boolean);
      semanticText += ` Platos: ${names.join(', ')}`;
    }
  }

  const embeddingVector = generateEmbedding(semanticText);

  const [created] = await db
    .insert(interactions)
    .values({
      userId: input.userId ?? null,
      guestToken: input.guestToken ?? null,
      type: input.type,
      metadata: input.metadata,
      embedding: serializeEmbedding(embeddingVector),
    })
    .returning();

  return created;
}

/**
 * Recupera el perfil de memoria del cliente a partir de su historial en gorDOS
 */
export async function getCustomerContext(
  userId?: number,
  guestToken?: string,
): Promise<CustomerMemoryProfile> {
  const db = getDb();

  if (!userId && !guestToken) {
    return {
      totalInteractions: 0,
      totalOrders: 0,
      favoriteProducts: [],
      preferredTimeSlot: 'almuerzo',
      typicalDayOfWeek: 'Sábado',
      lastInteractionAt: null,
      tags: ['nuevo_visitante'],
    };
  }

  const identityClause = userId
    ? eq(interactions.userId, userId)
    : eq(interactions.guestToken, guestToken!);

  // 1. Total interacciones
  const [interactionCountRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(interactions)
    .where(identityClause);

  // 2. Pedidos realizados y productos favoritos
  const orderIdentityClause = userId
    ? eq(orders.userId, userId)
    : eq(orders.guestToken, guestToken!);

  const userOrders = await db
    .select({ id: orders.id, createdAt: orders.createdAt })
    .from(orders)
    .where(orderIdentityClause)
    .orderBy(desc(orders.createdAt));

  const totalOrders = userOrders.length;
  let favoriteProducts: { productId: number; productName: string; count: number }[] = [];
  let preferredTimeSlot: 'almuerzo' | 'tarde' | 'cena' | 'noche' = 'almuerzo';
  let typicalDayOfWeek = 'Viernes';
  const tags: string[] = [];

  if (totalOrders > 0) {
    const orderIds = userOrders.map((o) => o.id);
    const favRows = await db
      .select({
        productId: orderItems.productId,
        productName: orderItems.productName,
        count: sql<number>`sum(${orderItems.quantity})::int`,
      })
      .from(orderItems)
      .where(sql`${orderItems.orderId} in (${sql.join(orderIds, sql`, `)})`)
      .groupBy(orderItems.productId, orderItems.productName)
      .orderBy(sql`sum(${orderItems.quantity}) desc`)
      .limit(5);

    favoriteProducts = favRows;

    // Análisis de franja horaria favorita
    const hours = userOrders.map((o) => new Date(o.createdAt).getHours());
    let lunchCount = 0;
    let afternoonCount = 0;
    let dinnerCount = 0;
    let nightCount = 0;

    for (const h of hours) {
      if (h >= 12 && h < 16) lunchCount++;
      else if (h >= 16 && h < 19) afternoonCount++;
      else if (h >= 19 && h < 23) dinnerCount++;
      else nightCount++;
    }

    const maxSlot = Math.max(lunchCount, afternoonCount, dinnerCount, nightCount);
    if (maxSlot === lunchCount) preferredTimeSlot = 'almuerzo';
    else if (maxSlot === afternoonCount) preferredTimeSlot = 'tarde';
    else if (maxSlot === dinnerCount) preferredTimeSlot = 'cena';
    else preferredTimeSlot = 'noche';

    // Día de la semana frecuente
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const dayCounts = new Array(7).fill(0);
    for (const o of userOrders) {
      dayCounts[new Date(o.createdAt).getDay()]++;
    }
    const maxDayIdx = dayCounts.indexOf(Math.max(...dayCounts));
    typicalDayOfWeek = days[maxDayIdx];

    tags.push('cliente_frecuente');
    if (totalOrders >= 5) tags.push('vip');
    if (lunchCount > dinnerCount) tags.push('horario_almuerzo');
    else tags.push('horario_cena');
  } else {
    tags.push('primer_pedido_pendiente');
  }

  // Última interacción registrada
  const [lastRow] = await db
    .select({ createdAt: interactions.createdAt })
    .from(interactions)
    .where(identityClause)
    .orderBy(desc(interactions.createdAt))
    .limit(1);

  return {
    totalInteractions: interactionCountRow?.count ?? 0,
    totalOrders,
    favoriteProducts,
    preferredTimeSlot,
    typicalDayOfWeek,
    lastInteractionAt: lastRow ? lastRow.createdAt.toISOString() : null,
    tags,
  };
}

/**
 * Búsqueda semántica sobre interacciones históricas usando similitud del coseno
 */
export async function searchSimilarInteractions(query: string, limit: number = 5) {
  const db = getDb();
  const queryVector = generateEmbedding(query);

  const rows = await db
    .select({
      id: interactions.id,
      type: interactions.type,
      metadata: interactions.metadata,
      embedding: interactions.embedding,
      createdAt: interactions.createdAt,
    })
    .from(interactions)
    .orderBy(desc(interactions.createdAt))
    .limit(100);

  const scored = rows
    .map((r) => {
      const vec = deserializeEmbedding(r.embedding);
      const similarity = vec ? cosineSimilarity(queryVector, vec) : 0;
      return {
        id: r.id,
        type: r.type,
        metadata: r.metadata,
        similarity,
        createdAt: r.createdAt.toISOString(),
      };
    })
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);

  return scored;
}

