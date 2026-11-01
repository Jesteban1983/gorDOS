import { sql, eq, desc, asc, and, ilike, or, count, inArray } from 'drizzle-orm';
import { getDb } from '../../config/db';
import { orders, orderItems, products, categories, users } from '../../config/schema';
import { NotFoundError, BadRequestError } from '../../shared/errors';

export interface DashboardMetrics {
  totalRevenue: string;
  todayOrders: number;
  totalOrders: number;
  averageTicket: string;
  statusBreakdown: Record<string, number>;
  topProducts: {
    productId: number;
    productName: string;
    unitsSold: number;
    revenue: string;
  }[];
  recentOrders: {
    id: number;
    orderNumber: string;
    customer: string;
    status: string;
    paymentMethod: string;
    paymentStatus: string;
    total: string;
    itemCount: number;
    createdAt: string;
  }[];
  stockAlerts: {
    outOfStock: number;
    lowStock: number;
  };
}

/**
 * 7.1 Métricas del Dashboard para Admin
 */
export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const db = getDb();

  // 1. Total pedidos e ingresos totales (pedidos pagados o entregados)
  const [revenueRow] = await db
    .select({
      totalRevenue: sql<string>`coalesce(sum(case when ${orders.paymentStatus} = 'paid' or ${orders.status} = 'delivered' then ${orders.total} else 0 end), 0)::text`,
      totalOrders: sql<number>`count(*)::int`,
      avgTicket: sql<string>`coalesce(round(avg(case when ${orders.paymentStatus} = 'paid' or ${orders.status} = 'delivered' then ${orders.total} else 0 end), 2), 0)::text`,
    })
    .from(orders);

  // 2. Pedidos del día (hoy)
  const [todayRow] = await db
    .select({ todayOrders: sql<number>`count(*)::int` })
    .from(orders)
    .where(sql`date(${orders.createdAt}) = current_date`);

  // 3. Desglose por estado
  const statusRows = await db
    .select({
      status: orders.status,
      count: sql<number>`count(*)::int`,
    })
    .from(orders)
    .groupBy(orders.status);

  const statusBreakdown: Record<string, number> = {
    pending: 0,
    confirmed: 0,
    preparing: 0,
    ready: 0,
    delivered: 0,
    cancelled: 0,
  };
  for (const row of statusRows) {
    statusBreakdown[row.status] = row.count;
  }

  // 4. Top productos más vendidos
  const topProductRows = await db
    .select({
      productId: orderItems.productId,
      productName: orderItems.productName,
      unitsSold: sql<number>`sum(${orderItems.quantity})::int`,
      revenue: sql<string>`round(sum(${orderItems.totalPrice}::numeric), 2)::text`,
    })
    .from(orderItems)
    .groupBy(orderItems.productId, orderItems.productName)
    .orderBy(sql`sum(${orderItems.quantity}) desc`)
    .limit(5);

  // 5. Pedidos recientes
  const recentOrderRows = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      userId: orders.userId,
      guestToken: orders.guestToken,
      status: orders.status,
      paymentMethod: orders.paymentMethod,
      paymentStatus: orders.paymentStatus,
      total: orders.total,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .orderBy(desc(orders.createdAt))
    .limit(10);

  // Cantidad de items por cada pedido reciente
  const recentOrdersWithDetails = await Promise.all(
    recentOrderRows.map(async (o) => {
      const [itemCountRow] = await db
        .select({ count: sql<number>`coalesce(sum(${orderItems.quantity}), 0)::int` })
        .from(orderItems)
        .where(eq(orderItems.orderId, o.id));

      let customer = 'Invitado';
      if (o.userId) {
        const [u] = await db.select({ name: users.name }).from(users).where(eq(users.id, o.userId)).limit(1);
        if (u) customer = u.name;
      }

      return {
        id: o.id,
        orderNumber: o.orderNumber,
        customer,
        status: o.status,
        paymentMethod: o.paymentMethod,
        paymentStatus: o.paymentStatus,
        total: o.total,
        itemCount: itemCountRow?.count ?? 0,
        createdAt: o.createdAt.toISOString(),
      };
    }),
  );

  // 6. Alertas de inventario
  const [stockRow] = await db
    .select({
      outOfStock: sql<number>`count(case when ${products.stock} <= 0 or ${products.isAvailable} = false then 1 end)::int`,
      lowStock: sql<number>`count(case when ${products.stock} > 0 and ${products.stock} <= 10 then 1 end)::int`,
    })
    .from(products);

  return {
    totalRevenue: revenueRow?.totalRevenue ?? '0.00',
    todayOrders: todayRow?.todayOrders ?? 0,
    totalOrders: revenueRow?.totalOrders ?? 0,
    averageTicket: revenueRow?.avgTicket ?? '0.00',
    statusBreakdown,
    topProducts: topProductRows,
    recentOrders: recentOrdersWithDetails,
    stockAlerts: {
      outOfStock: stockRow?.outOfStock ?? 0,
      lowStock: stockRow?.lowStock ?? 0,
    },
  };
}

/**
 * 7.3 Listado de pedidos para el Admin con búsqueda y filtros
 */
export async function listAdminOrders(params: {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const db = getDb();
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(50, Math.max(5, params.limit ?? 20));
  const offset = (page - 1) * limit;

  const conditions = [];

  if (params.status && params.status !== 'all') {
    conditions.push(eq(orders.status, params.status as any));
  }

  if (params.search && params.search.trim()) {
    const q = `%${params.search.trim()}%`;
    conditions.push(
      or(
        ilike(orders.orderNumber, q),
        ilike(orders.notes, q),
        ilike(orders.deliveryAddress, q),
      ),
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalRow] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(orders)
    .where(whereClause);

  const orderRows = await db
    .select()
    .from(orders)
    .where(whereClause)
    .orderBy(desc(orders.createdAt))
    .limit(limit)
    .offset(offset);

  const orderIds = orderRows.map((o) => o.id);
  let itemsByOrder = new Map<number, any[]>();
  if (orderIds.length > 0) {
    const items = await db
      .select()
      .from(orderItems)
      .where(inArray(orderItems.orderId, orderIds))
      .orderBy(asc(orderItems.id));

    for (const it of items) {
      if (!itemsByOrder.has(it.orderId)) {
        itemsByOrder.set(it.orderId, []);
      }
      itemsByOrder.get(it.orderId)!.push(it);
    }
  }

  return {
    orders: orderRows.map((o) => ({
      ...o,
      items: itemsByOrder.get(o.id) ?? [],
    })),
    pagination: {
      page,
      limit,
      total: totalRow?.total ?? 0,
      totalPages: Math.ceil((totalRow?.total ?? 0) / limit),
    },
  };
}

/**
 * 7.4 Listado de Clientes con historial y métricas
 */
export async function listCustomers() {
  const db = getDb();

  const customerRows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      role: users.role,
      isActive: users.isActive,
      lastOrderAt: users.lastOrderAt,
      createdAt: users.createdAt,
      ordersCount: sql<number>`(select count(*) from ${orders} where ${orders.userId} = ${users.id})::int`,
      totalSpent: sql<string>`coalesce((select round(sum(${orders.total}), 2) from ${orders} where ${orders.userId} = ${users.id} and (${orders.paymentStatus} = 'paid' or ${orders.status} = 'delivered')), 0)::text`,
    })
    .from(users)
    .orderBy(desc(users.createdAt));

  return customerRows;
}

/**
 * Activar o desactivar cuenta de cliente
 */
export async function toggleCustomerActive(id: number) {
  const db = getDb();
  const [existing] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!existing) {
    throw new NotFoundError('Usuario no encontrado');
  }

  const [updated] = await db
    .update(users)
    .set({ isActive: !existing.isActive, updatedAt: sql`now()` })
    .where(eq(users.id, id))
    .returning();

  return { id: updated.id, email: updated.email, isActive: updated.isActive };
}

/**
 * 7.6 Exportación de Pedidos en formato CSV (UTF-8 con BOM)
 */
export async function exportOrdersCsv(): Promise<string> {
  const db = getDb();

  const allOrders = await db
    .select({
      orderNumber: orders.orderNumber,
      createdAt: orders.createdAt,
      status: orders.status,
      paymentMethod: orders.paymentMethod,
      paymentStatus: orders.paymentStatus,
      total: orders.total,
      deliveryAddress: orders.deliveryAddress,
      notes: orders.notes,
    })
    .from(orders)
    .orderBy(desc(orders.createdAt));

  const headers = [
    'Numero Pedido',
    'Fecha',
    'Hora',
    'Estado Pedido',
    'Metodo Pago',
    'Estado Pago',
    'Total (PEN)',
    'Direccion Entrega',
    'Notas',
  ];

  const rows = allOrders.map((o) => {
    const d = new Date(o.createdAt);
    const dateStr = d.toISOString().slice(0, 10);
    const timeStr = d.toLocaleTimeString('es-PE', { hour12: false });
    return [
      `"${o.orderNumber}"`,
      `"${dateStr}"`,
      `"${timeStr}"`,
      `"${o.status}"`,
      `"${o.paymentMethod}"`,
      `"${o.paymentStatus}"`,
      `"${o.total}"`,
      `"${(o.deliveryAddress ?? '').replace(/"/g, '""')}"`,
      `"${(o.notes ?? '').replace(/"/g, '""')}"`,
    ].join(',');
  });

  // \uFEFF es el BOM para que Excel abra UTF-8 con acentos y tildes correctamente
  return '\uFEFF' + [headers.join(','), ...rows].join('\n');
}

/**
 * 7.6 Exportación de Inventario y Productos en formato CSV
 */
export async function exportProductsCsv(): Promise<string> {
  const db = getDb();

  const productRows = await db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      categoryName: categories.name,
      price: products.price,
      stock: products.stock,
      isAvailable: products.isAvailable,
      prepTime: products.preparationTime,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .orderBy(asc(categories.name), asc(products.name));

  const headers = [
    'ID',
    'Producto',
    'Categoria',
    'Precio (PEN)',
    'Stock Actual',
    'Disponible',
    'Tiempo Preparacion (min)',
  ];

  const rows = productRows.map((p) => [
    p.id,
    `"${p.name.replace(/"/g, '""')}"`,
    `"${(p.categoryName ?? 'Sin Categoria').replace(/"/g, '""')}"`,
    p.price,
    p.stock,
    p.isAvailable ? 'SI' : 'NO',
    p.prepTime ?? 15,
  ].join(','));

  return '\uFEFF' + [headers.join(','), ...rows].join('\n');
}

