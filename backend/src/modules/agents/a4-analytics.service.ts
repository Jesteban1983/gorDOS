import { sql, desc } from 'drizzle-orm';
import { getDb } from '../../config/db';
import { orders, orderItems, products } from '../../config/schema';
import type { DemandAnalyticsReport, DemandPeakHour, TimeSlotAnalysis } from './types';

/**
 * A4 — ANALÍTICO (Demanda, Horarios y Reportes del Sistema Inteligente)
 * Analiza picos de pedidos por franja horaria y rotación de productos.
 */
export async function getDemandAnalytics(): Promise<DemandAnalyticsReport> {
  const db = getDb();

  // 1. Distribución por hora del día (0-23)
  const hourlyRows = await db
    .select({
      hour: sql<number>`extract(hour from ${orders.createdAt})::int`,
      orderCount: sql<number>`count(*)::int`,
      totalRevenue: sql<string>`coalesce(round(sum(${orders.total}), 2), 0)::text`,
    })
    .from(orders)
    .groupBy(sql`extract(hour from ${orders.createdAt})`)
    .orderBy(sql`extract(hour from ${orders.createdAt})`);

  const hourlyMap = new Map<number, { orderCount: number; totalRevenue: string }>();
  for (const row of hourlyRows) {
    hourlyMap.set(row.hour, {
      orderCount: row.orderCount,
      totalRevenue: row.totalRevenue,
    });
  }

  const hourlyPeaks: DemandPeakHour[] = [];
  let maxHour = { hour: 13, hourLabel: '13:00 - 14:00', count: 0 };

  for (let h = 0; h < 24; h++) {
    const entry = hourlyMap.get(h) ?? { orderCount: 0, totalRevenue: '0.00' };
    const label = `${String(h).padStart(2, '0')}:00`;
    hourlyPeaks.push({
      hour: h,
      hourLabel: label,
      orderCount: entry.orderCount,
      totalRevenue: entry.totalRevenue,
    });

    if (entry.orderCount > maxHour.count) {
      maxHour = { hour: h, hourLabel: `${label} - ${String((h + 1) % 24).padStart(2, '0')}:00`, count: entry.orderCount };
    }
  }

  // 2. Análisis por Franjas Horarias
  // Almuerzo: 12:00 - 15:59
  // Tarde: 16:00 - 18:59
  // Cena: 19:00 - 22:59
  // Noche: 23:00 - 11:59
  const timeSlotsConfig = [
    { slot: 'almuerzo' as const, label: 'Almuerzo Familiar', hours: '12:00 - 16:00', minH: 12, maxH: 15 },
    { slot: 'tarde' as const, label: 'Media Tarde / Lonche', hours: '16:00 - 19:00', minH: 16, maxH: 18 },
    { slot: 'cena' as const, label: 'Cena & Parrillas', hours: '19:00 - 23:00', minH: 19, maxH: 22 },
    { slot: 'noche' as const, label: 'Trasnocho / Madrugada', hours: '23:00 - 12:00', minH: 23, maxH: 11 },
  ];

  const timeSlots: TimeSlotAnalysis[] = [];
  for (const conf of timeSlotsConfig) {
    let orderCount = 0;
    if (conf.minH <= conf.maxH) {
      for (let h = conf.minH; h <= conf.maxH; h++) {
        orderCount += hourlyMap.get(h)?.orderCount ?? 0;
      }
    } else {
      // Cruzando medianoche (23 a 11)
      for (let h = 23; h < 24; h++) orderCount += hourlyMap.get(h)?.orderCount ?? 0;
      for (let h = 0; h <= 11; h++) orderCount += hourlyMap.get(h)?.orderCount ?? 0;
    }

    // Top productos en esta franja
    const topInSlot = await db
      .select({
        productName: orderItems.productName,
        units: sql<number>`sum(${orderItems.quantity})::int`,
      })
      .from(orderItems)
      .innerJoin(orders, sql`${orderItems.orderId} = ${orders.id}`)
      .where(
        conf.minH <= conf.maxH
          ? sql`extract(hour from ${orders.createdAt}) between ${conf.minH} and ${conf.maxH}`
          : sql`extract(hour from ${orders.createdAt}) >= 23 or extract(hour from ${orders.createdAt}) <= 11`,
      )
      .groupBy(orderItems.productName)
      .orderBy(sql`sum(${orderItems.quantity}) desc`)
      .limit(3);

    timeSlots.push({
      slot: conf.slot,
      label: conf.label,
      hours: conf.hours,
      orderCount,
      topProducts: topInSlot,
    });
  }

  // 3. Día de mayor demanda
  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const dayRows = await db
    .select({
      dayOfWeek: sql<number>`extract(dow from ${orders.createdAt})::int`,
      count: sql<number>`count(*)::int`,
    })
    .from(orders)
    .groupBy(sql`extract(dow from ${orders.createdAt})`)
    .orderBy(sql`count(*) desc`)
    .limit(1);

  const busiestDay = dayRows.length > 0
    ? { dayName: dayNames[dayRows[0].dayOfWeek] || 'Sábado', count: dayRows[0].count }
    : { dayName: 'Sábado', count: 0 };

  return {
    hourlyPeaks,
    timeSlots,
    busiestHour: maxHour,
    busiestDay,
    agentStatus: {
      a0_orchestrator: true,
      a1_rag_memory: true,
      a2_predictor: true,
      a3_recommender: true,
      a4_analytics: true,
    },
  };
}

