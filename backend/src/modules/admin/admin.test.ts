import { describe, it, expect } from 'vitest';
import {
  getDashboardMetrics,
  listAdminOrders,
  listCustomers,
  exportOrdersCsv,
  exportProductsCsv,
} from './admin.service';

describe('Admin Service (Fase 7)', () => {
  it('obtiene métricas completas para el dashboard (7.1)', async () => {
    const metrics = await getDashboardMetrics();
    expect(metrics).toBeDefined();
    expect(metrics).toHaveProperty('totalRevenue');
    expect(metrics).toHaveProperty('todayOrders');
    expect(metrics).toHaveProperty('totalOrders');
    expect(metrics).toHaveProperty('averageTicket');
    expect(metrics).toHaveProperty('statusBreakdown');
    expect(metrics).toHaveProperty('topProducts');
    expect(metrics).toHaveProperty('recentOrders');
    expect(metrics).toHaveProperty('stockAlerts');
  });

  it('lista pedidos para administración con soporte de paginación (7.3)', async () => {
    const res = await listAdminOrders({ page: 1, limit: 10 });
    expect(res).toBeDefined();
    expect(Array.isArray(res.orders)).toBe(true);
    expect(res.pagination).toBeDefined();
    expect(res.pagination.page).toBe(1);
    expect(res.pagination.limit).toBe(10);
  });

  it('lista clientes registrados y sus estadísticas de gasto (7.4)', async () => {
    const customers = await listCustomers();
    expect(Array.isArray(customers)).toBe(true);
    if (customers.length > 0) {
      expect(customers[0]).toHaveProperty('id');
      expect(customers[0]).toHaveProperty('email');
      expect(customers[0]).toHaveProperty('ordersCount');
      expect(customers[0]).toHaveProperty('totalSpent');
    }
  });

  it('genera reporte CSV de pedidos con cabeceras y BOM UTF-8 (7.6)', async () => {
    const csv = await exportOrdersCsv();
    expect(typeof csv).toBe('string');
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('Numero Pedido');
    expect(csv).toContain('Total (PEN)');
  });

  it('genera reporte CSV de productos e inventario (7.6)', async () => {
    const csv = await exportProductsCsv();
    expect(typeof csv).toBe('string');
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('ID,Producto,Categoria');
    expect(csv).toContain('Stock Actual');
  });
});

