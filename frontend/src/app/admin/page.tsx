'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  adminApi,
  type DashboardMetrics,
  type AdminCustomer,
  type CreateProductInput,
} from '@/lib/api/admin';
import { catalogApi, type CatalogCategory, type CatalogProduct } from '@/lib/api/catalog';
import { stockApi } from '@/lib/api/stock';
import { agentsApi, type DemandAnalyticsReport } from '@/lib/api/agents';
import {
  ordersApi,
  ORDER_STATUS_LABELS,
  PAYMENT_LABELS,
  type OrderView,
  type OrderStatus,
} from '@/lib/api/orders';
import { AuthProvider, useAuth } from '@/lib/store/auth-context';

const STATUS_BADGES: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800 border-amber-200',
  confirmed: 'bg-blue-100 text-blue-800 border-blue-200',
  preparing: 'bg-purple-100 text-purple-800 border-purple-200',
  ready: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  delivered: 'bg-slate-100 text-slate-700 border-slate-200',
  cancelled: 'bg-rose-100 text-rose-700 border-rose-200',
};

function AdminDashboardContent() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'metrics' | 'orders' | 'products' | 'customers' | 'reports' | 'ai'>('metrics');
  const [demandReport, setDemandReport] = useState<DemandAnalyticsReport | null>(null);
  const [loadingDemand, setLoadingDemand] = useState(false);

  // ─── Estados de Datos ──────────────────────────────────
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(true);

  const [orders, setOrders] = useState<OrderView[]>([]);
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [orderSearch, setOrderSearch] = useState<string>('');
  const [loadingOrders, setLoadingOrders] = useState(false);

  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<(CatalogProduct & { categoryId?: number; categoryName?: string }) | null>(null);
  const [stockModalProduct, setStockModalProduct] = useState<(CatalogProduct & { categoryName?: string }) | null>(null);
  const [stockModalMode, setStockModalMode] = useState<'set' | 'decrement'>('set');
  const [stockInputVal, setStockInputVal] = useState<string>('50');
  const [decrementInputQty, setDecrementInputQty] = useState<number>(1);
  const [savingStock, setSavingStock] = useState<boolean>(false);

  const [newProduct, setNewProduct] = useState<CreateProductInput & { stock?: number }>({
    categoryId: 0,
    name: '',
    price: '',
    stock: 50,
    preparationTime: 15,
    description: '',
  });

  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  const [selectedTicket, setSelectedTicket] = useState<{ text: string; type: string } | null>(null);

  // ─── Carga de Métricas ─────────────────────────────────
  const loadMetrics = useCallback(() => {
    setLoadingMetrics(true);
    adminApi
      .getMetrics()
      .then(setMetrics)
      .catch((err) => console.error('Error cargando métricas:', err))
      .finally(() => setLoadingMetrics(false));
  }, []);

  // ─── Carga de Pedidos ──────────────────────────────────
  const loadOrders = useCallback(() => {
    setLoadingOrders(true);
    adminApi
      .getOrders({ status: orderStatusFilter, search: orderSearch })
      .then((res) => setOrders(res.orders))
      .catch((err) => console.error('Error cargando pedidos:', err))
      .finally(() => setLoadingOrders(false));
  }, [orderStatusFilter, orderSearch]);

  // ─── Carga de Catálogo ─────────────────────────────────
  const loadProducts = useCallback(() => {
    setLoadingProducts(true);
    catalogApi
      .getCard()
      .then((cats) => {
        setCategories(cats);
        if (cats.length > 0 && newProduct.categoryId === 0) {
          setNewProduct((prev) => ({ ...prev, categoryId: cats[0].id }));
        }
      })
      .catch((err) => console.error('Error cargando catálogo:', err))
      .finally(() => setLoadingProducts(false));
  }, [newProduct.categoryId]);

  // ─── Carga de Clientes ─────────────────────────────────
  const loadCustomers = useCallback(() => {
    setLoadingCustomers(true);
    adminApi
      .getCustomers()
      .then(setCustomers)
      .catch((err) => console.error('Error cargando clientes:', err))
      .finally(() => setLoadingCustomers(false));
  }, []);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  useEffect(() => {
    if (activeTab === 'orders') loadOrders();
    if (activeTab === 'products') loadProducts();
    if (activeTab === 'customers') loadCustomers();
    if (activeTab === 'ai') {
      setLoadingDemand(true);
      agentsApi
        .getDemandAnalytics()
        .then(setDemandReport)
        .catch((err) => console.error('Error cargando IA:', err))
        .finally(() => setLoadingDemand(false));
    }
  }, [activeTab, loadOrders, loadProducts, loadCustomers]);

  // ─── Acciones de Pedidos ───────────────────────────────
  const handleOrderStatusChange = async (orderId: number, status: OrderStatus) => {
    try {
      await adminApi.updateOrderStatus(orderId, status);
      loadOrders();
      loadMetrics();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al actualizar estado');
    }
  };

  const handleOpenTicket = async (orderId: number, type: 'kitchen' | 'cashier') => {
    try {
      const ticket = await ordersApi.getTicket(orderId, type);
      setSelectedTicket({ text: ticket.text, type: ticket.type });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al obtener ticket');
    }
  };

  // ─── Acciones de Productos ─────────────────────────────
  const handleToggleProduct = async (productId: number) => {
    try {
      await adminApi.toggleProduct(productId);
      loadProducts();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al cambiar estado');
    }
  };

  const handleDeleteProduct = async (productId: number) => {
    if (!confirm('¿Estás seguro de eliminar este producto?')) return;
    try {
      await adminApi.deleteProduct(productId);
      loadProducts();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al eliminar producto');
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminApi.createProduct(newProduct);
      setShowProductModal(false);
      setNewProduct({
        categoryId: categories[0]?.id ?? 0,
        name: '',
        price: '',
        stock: 50,
        preparationTime: 15,
        description: '',
      });
      loadProducts();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al crear producto');
    }
  };

  const handleOpenEditModal = (p: CatalogProduct & { categoryId?: number; categoryName?: string }) => {
    let catId = p.categoryId;
    if (!catId) {
      const foundCat = categories.find((c) => c.products.some((prod) => prod.id === p.id));
      catId = foundCat?.id ?? categories[0]?.id ?? 0;
    }
    setEditingProduct({ ...p, categoryId: catId });
  };

  const handleSaveEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    try {
      await adminApi.updateProduct(editingProduct.id, {
        name: editingProduct.name,
        categoryId: editingProduct.categoryId,
        price: editingProduct.price,
        stock: editingProduct.stock !== undefined ? Number(editingProduct.stock) : undefined,
        preparationTime: editingProduct.preparationTime ?? undefined,
        description: editingProduct.description ?? undefined,
      });
      setEditingProduct(null);
      loadProducts();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al actualizar producto');
    }
  };

  const handleOpenStockModal = (p: CatalogProduct & { categoryName?: string }) => {
    setStockModalProduct(p);
    setStockInputVal(String(p.stock ?? 0));
    setDecrementInputQty(1);
    setStockModalMode('set');
  };

  const handleSaveDailyStock = async () => {
    if (!stockModalProduct) return;
    const newQty = parseInt(stockInputVal, 10);
    if (isNaN(newQty) || newQty < 0) {
      alert('Ingresa una cantidad válida de stock (número entero mayor o igual a 0).');
      return;
    }
    setSavingStock(true);
    try {
      await stockApi.update(stockModalProduct.id, newQty);
      setStockModalProduct((prev) => (prev ? { ...prev, stock: newQty, isAvailable: newQty > 0 } : null));
      loadProducts();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al actualizar stock');
    } finally {
      setSavingStock(false);
    }
  };

  const handleRegisterCounterSale = async (qtyToSubtract?: number) => {
    if (!stockModalProduct) return;
    const qty = qtyToSubtract ?? decrementInputQty;
    if (!qty || qty <= 0) {
      alert('Ingresa una cantidad válida a descontar.');
      return;
    }
    if ((stockModalProduct.stock ?? 0) < qty) {
      alert(`Stock insuficiente. Solo quedan ${stockModalProduct.stock ?? 0} unidades.`);
      return;
    }
    setSavingStock(true);
    try {
      const res = await stockApi.decrement(stockModalProduct.id, qty, 'Venta presencial en mostrador');
      setStockModalProduct((prev) =>
        prev ? { ...prev, stock: res.stock, isAvailable: res.isAvailable } : null
      );
      setStockInputVal(String(res.stock));
      loadProducts();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al descontar stock');
    } finally {
      setSavingStock(false);
    }
  };

  // ─── Acciones de Clientes ──────────────────────────────
  const handleToggleCustomer = async (userId: number) => {
    try {
      await adminApi.toggleCustomer(userId);
      loadCustomers();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al cambiar estado del cliente');
    }
  };

  const allProductsList = useMemo(
    () => categories.flatMap((c) => c.products.map((p) => ({ ...p, categoryId: c.id, categoryName: c.name }))),
    [categories],
  );

  return (
    <main className="min-h-screen bg-slate-50 pb-20">
      {/* ─── Header Admin ───────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur px-4 py-3">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-600 font-black text-white text-lg">
              gD
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900">Panel de Administración</h1>
                <span className="rounded bg-orange-100 px-2 py-0.5 text-xs font-bold text-orange-700">
                  gorDOS Control
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {user ? `${user.name} (${user.role})` : 'Modo Administrador'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/kitchen"
              className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800"
            >
              🍳 Pantalla Cocina (KDS)
            </Link>
            <Link
              href="/admin/stock"
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              📦 Inventario Rápido
            </Link>
            <Link
              href="/menu"
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              Ver Carta
            </Link>
          </div>
        </div>

        {/* ─── Pestañas de Navegación ─────────────────── */}
        <div className="mx-auto mt-3 flex max-w-7xl gap-2 overflow-x-auto text-sm border-t border-slate-100 pt-2">
          {[
            { id: 'metrics', label: '📊 Dashboard & Métricas' },
            { id: 'orders', label: '🛒 Pedidos' },
            { id: 'products', label: '🍗 Carta & Productos' },
            { id: 'customers', label: '👥 Clientes' },
            { id: 'ai', label: '🤖 Inteligencia Artificial & Agentes' },
            { id: 'reports', label: '📥 Reportes CSV' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`whitespace-nowrap rounded-lg px-3.5 py-1.5 text-xs font-bold transition-colors ${
                activeTab === tab.id
                  ? 'bg-orange-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* ─── Contenedor Principal ────────────────────────── */}
      <div className="mx-auto max-w-7xl px-4 py-6">
        {/* ═══════════════════════════════════════════════════
            PESTAÑA 1: DASHBOARD Y MÉTRICAS (7.1)
           ═══════════════════════════════════════════════════ */}
        {activeTab === 'metrics' && (
          <div className="space-y-6">
            {loadingMetrics && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-28 animate-pulse rounded-2xl bg-white border border-slate-200" />
                ))}
              </div>
            )}

            {!loadingMetrics && metrics && (
              <>
                {/* Tarjetas KPI */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Ingresos Totales</p>
                    <h3 className="mt-2 text-3xl font-black text-slate-900">S/ {metrics.totalRevenue}</h3>
                    <p className="mt-1 text-xs text-emerald-600 font-semibold">Pedidos completados y pagados</p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Pedidos Hoy</p>
                    <h3 className="mt-2 text-3xl font-black text-slate-900">{metrics.todayOrders}</h3>
                    <p className="mt-1 text-xs text-slate-500 font-semibold">
                      Total histórico: {metrics.totalOrders} pedidos
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Ticket Promedio</p>
                    <h3 className="mt-2 text-3xl font-black text-slate-900">S/ {metrics.averageTicket}</h3>
                    <p className="mt-1 text-xs text-slate-500 font-semibold">Gasto medio por orden</p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Alertas de Stock</p>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-3xl font-black text-slate-900">
                        {metrics.stockAlerts.outOfStock + metrics.stockAlerts.lowStock}
                      </span>
                      <span className="text-xs text-slate-400">productos</span>
                    </div>
                    <p className="mt-1 text-xs font-semibold">
                      {metrics.stockAlerts.outOfStock > 0 ? (
                        <span className="text-rose-600">{metrics.stockAlerts.outOfStock} agotados</span>
                      ) : (
                        <span className="text-emerald-600">Sin agotados</span>
                      )}
                      {metrics.stockAlerts.lowStock > 0 && (
                        <span className="text-amber-600 ml-2">({metrics.stockAlerts.lowStock} stock bajo)</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Desglose de Estados y Top Productos */}
                <div className="grid gap-6 lg:grid-cols-2">
                  {/* Desglose de Estados */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h3 className="text-base font-bold text-slate-900">Estado de Pedidos Actuales</h3>
                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {Object.entries(metrics.statusBreakdown).map(([st, cnt]) => (
                        <div key={st} className={`rounded-xl border p-3 ${STATUS_BADGES[st] || 'bg-slate-50'}`}>
                          <p className="text-xs font-bold">{ORDER_STATUS_LABELS[st as OrderStatus] || st}</p>
                          <p className="mt-1 text-2xl font-black">{cnt}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Top 5 Productos */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h3 className="text-base font-bold text-slate-900">Top Productos Más Vendidos</h3>
                    <div className="mt-4 space-y-3">
                      {metrics.topProducts.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">No hay suficientes ventas registradas aún.</p>
                      ) : (
                        metrics.topProducts.map((p, idx) => (
                          <div key={p.productId} className="flex items-center justify-between border-b border-slate-100 pb-2">
                            <div className="flex items-center gap-3">
                              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-100 text-xs font-black text-orange-700">
                                {idx + 1}
                              </span>
                              <div>
                                <p className="text-sm font-bold text-slate-900">{p.productName}</p>
                                <p className="text-xs text-slate-400">{p.unitsSold} unidades vendidas</p>
                              </div>
                            </div>
                            <span className="text-sm font-bold text-slate-900">S/ {p.revenue}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Pedidos Recientes */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between pb-3">
                    <h3 className="text-base font-bold text-slate-900">Pedidos Recientes</h3>
                    <button
                      onClick={() => setActiveTab('orders')}
                      className="text-xs font-bold text-orange-600 hover:underline"
                    >
                      Ver todos →
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-slate-100 bg-slate-50 text-slate-400 uppercase">
                        <tr>
                          <th className="py-2.5 px-3">N° Pedido</th>
                          <th className="py-2.5 px-3">Cliente</th>
                          <th className="py-2.5 px-3">Items</th>
                          <th className="py-2.5 px-3">Total</th>
                          <th className="py-2.5 px-3">Estado</th>
                          <th className="py-2.5 px-3">Fecha</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {metrics.recentOrders.map((o) => (
                          <tr key={o.id} className="hover:bg-slate-50/50">
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{o.orderNumber}</td>
                            <td className="py-2.5 px-3">{o.customer}</td>
                            <td className="py-2.5 px-3">{o.itemCount} plato(s)</td>
                            <td className="py-2.5 px-3 font-bold text-orange-600">S/ {o.total}</td>
                            <td className="py-2.5 px-3">
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${STATUS_BADGES[o.status]}`}>
                                {ORDER_STATUS_LABELS[o.status] || o.status}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-400">
                              {new Date(o.createdAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════
            PESTAÑA 2: GESTIÓN DE PEDIDOS (7.3)
           ═══════════════════════════════════════════════════ */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            {/* Barra de Filtros */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  placeholder="Buscar por N° o notas..."
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadOrders()}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-orange-500 w-56"
                />
                <select
                  value={orderStatusFilter}
                  onChange={(e) => setOrderStatusFilter(e.target.value)}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-500"
                >
                  <option value="all">Todos los estados</option>
                  <option value="pending">Pendientes</option>
                  <option value="confirmed">Confirmados</option>
                  <option value="preparing">En preparación</option>
                  <option value="ready">Listos</option>
                  <option value="delivered">Entregados</option>
                  <option value="cancelled">Cancelados</option>
                </select>
                <button
                  onClick={loadOrders}
                  className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800"
                >
                  Filtrar
                </button>
              </div>

              <a
                href={adminApi.getOrdersCsvUrl()}
                download
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                📥 Exportar Pedidos CSV
              </a>
            </div>

            {/* Tabla de Pedidos */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {loadingOrders ? (
                <div className="p-8 text-center text-xs text-slate-400">Cargando pedidos...</div>
              ) : orders.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">No se encontraron pedidos con estos filtros.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-100 bg-slate-50 text-slate-400 uppercase">
                      <tr>
                        <th className="py-3 px-4">Orden</th>
                        <th className="py-3 px-4">Items / Platos</th>
                        <th className="py-3 px-4">Total</th>
                        <th className="py-3 px-4">Pago</th>
                        <th className="py-3 px-4">Estado</th>
                        <th className="py-3 px-4 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {orders.map((o) => (
                        <tr key={o.id} className="hover:bg-slate-50/50">
                          <td className="py-3 px-4">
                            <p className="font-mono font-bold text-slate-900">{o.orderNumber}</p>
                            <p className="text-[10px] text-slate-400">
                              {new Date(o.createdAt).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })}
                            </p>
                            {o.deliveryAddress && (
                              <p className="text-[10px] text-slate-500 mt-0.5">📍 {o.deliveryAddress}</p>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <ul className="space-y-0.5">
                              {o.items.map((it) => (
                                <li key={it.id} className="text-slate-700">
                                  <strong>{it.quantity}x</strong> {it.productName}
                                </li>
                              ))}
                            </ul>
                            {o.notes && <p className="text-[10px] italic text-amber-600 mt-1">"{o.notes}"</p>}
                          </td>
                          <td className="py-3 px-4 font-bold text-orange-600 text-sm">S/ {o.total}</td>
                          <td className="py-3 px-4">
                            <p className="font-semibold text-slate-700">{PAYMENT_LABELS[o.paymentMethod]}</p>
                            <p className="text-[10px] text-slate-400">{o.paymentStatus}</p>
                          </td>
                          <td className="py-3 px-4">
                            <select
                              value={o.status}
                              onChange={(e) => handleOrderStatusChange(o.id, e.target.value as OrderStatus)}
                              className={`rounded-full px-2.5 py-1 text-[11px] font-bold border focus:outline-none ${STATUS_BADGES[o.status]}`}
                            >
                              <option value="pending">Pendiente</option>
                              <option value="confirmed">Confirmado</option>
                              <option value="preparing">En preparación</option>
                              <option value="ready">Listo</option>
                              <option value="delivered">Entregado</option>
                              <option value="cancelled">Cancelado</option>
                            </select>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenTicket(o.id, 'kitchen')}
                                className="rounded border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-700 hover:bg-slate-100"
                              >
                                🖨 Comanda
                              </button>
                              <button
                                onClick={() => handleOpenTicket(o.id, 'cashier')}
                                className="rounded border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-700 hover:bg-slate-100"
                              >
                                🧾 Caja
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════
            PESTAÑA 3: GESTIÓN DE PRODUCTOS (7.2)
           ═══════════════════════════════════════════════════ */}
        {activeTab === 'products' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div>
                <h3 className="font-bold text-slate-900">Catálogo de Productos</h3>
                <p className="text-xs text-slate-400">Total: {allProductsList.length} productos en la carta</p>
              </div>

              <div className="flex gap-2">
                <a
                  href={adminApi.getProductsCsvUrl()}
                  download
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  📥 Exportar Productos CSV
                </a>
                <button
                  onClick={() => setShowProductModal(true)}
                  className="rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-orange-500"
                >
                  + Nuevo Producto
                </button>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {loadingProducts ? (
                <div className="p-8 text-center text-xs text-slate-400">Cargando productos...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-100 bg-slate-50 text-slate-400 uppercase">
                      <tr>
                        <th className="py-3 px-4">Producto</th>
                        <th className="py-3 px-4">Categoría</th>
                        <th className="py-3 px-4">Precio</th>
                        <th className="py-3 px-4 text-center">Stock</th>
                        <th className="py-3 px-4">Tiempo</th>
                        <th className="py-3 px-4">Disponibilidad</th>
                        <th className="py-3 px-4 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {allProductsList.map((p) => {
                        const stock = p.stock ?? 0;
                        return (
                          <tr key={p.id} className="hover:bg-slate-50/50">
                            <td className="py-3 px-4">
                              <p className="font-bold text-slate-900">{p.name}</p>
                              <p className="text-[10px] text-slate-400 line-clamp-1">{p.description || p.slug}</p>
                            </td>
                            <td className="py-3 px-4 font-semibold text-slate-600">{p.categoryName}</td>
                            <td className="py-3 px-4 font-bold text-orange-600 text-sm">S/ {p.price}</td>
                            <td className="py-3 px-4 text-center">
                              <button
                                onClick={() => handleOpenStockModal(p)}
                                title="Haz clic para actualizar stock o registrar venta presencial"
                                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold border transition-colors hover:ring-2 hover:ring-offset-1 hover:ring-orange-300 ${
                                  stock <= 0
                                    ? 'bg-rose-100 text-rose-800 border-rose-200'
                                    : stock <= 5
                                    ? 'bg-amber-100 text-amber-800 border-amber-200'
                                    : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                }`}
                              >
                                <span
                                  className={`h-1.5 w-1.5 rounded-full ${
                                    stock <= 0 ? 'bg-rose-500' : stock <= 5 ? 'bg-amber-500' : 'bg-emerald-500'
                                  }`}
                                />
                                {stock} u.
                              </button>
                            </td>
                            <td className="py-3 px-4 text-slate-500">{p.preparationTime || 15} min</td>
                            <td className="py-3 px-4">
                              <button
                                onClick={() => handleToggleProduct(p.id)}
                                className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                                  p.isAvailable
                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                    : 'bg-rose-100 text-rose-800 border-rose-200'
                                }`}
                              >
                                {p.isAvailable ? 'Disponible' : 'Agotado'}
                              </button>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleOpenStockModal(p)}
                                  className="rounded border border-indigo-200 bg-indigo-50 px-2 py-1 text-[11px] font-bold text-indigo-700 hover:bg-indigo-100 transition-colors"
                                  title="Gestionar stock y registrar ventas presenciales"
                                >
                                  📦 Stock
                                </button>
                                <button
                                  onClick={() => handleOpenEditModal(p)}
                                  className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-100 transition-colors"
                                  title="Editar producto (nombre, precio, etc.)"
                                >
                                  ✏ Editar
                                </button>
                                <button
                                  onClick={() => handleDeleteProduct(p.id)}
                                  className="rounded border border-red-200 px-2 py-1 text-[11px] font-bold text-red-600 hover:bg-red-50 transition-colors"
                                  title="Eliminar producto"
                                >
                                  🗑
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════
            PESTAÑA 4: GESTIÓN DE CLIENTES (7.4)
           ═══════════════════════════════════════════════════ */}
        {activeTab === 'customers' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="font-bold text-slate-900">Clientes Registrados</h3>
              <p className="text-xs text-slate-400">Total: {customers.length} cuentas en el sistema</p>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {loadingCustomers ? (
                <div className="p-8 text-center text-xs text-slate-400">Cargando clientes...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-100 bg-slate-50 text-slate-400 uppercase">
                      <tr>
                        <th className="py-3 px-4">Nombre</th>
                        <th className="py-3 px-4">Email</th>
                        <th className="py-3 px-4">Rol</th>
                        <th className="py-3 px-4">Pedidos Realizados</th>
                        <th className="py-3 px-4">Total Gastado</th>
                        <th className="py-3 px-4">Estado</th>
                        <th className="py-3 px-4 text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {customers.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-50/50">
                          <td className="py-3 px-4 font-bold text-slate-900">{c.name}</td>
                          <td className="py-3 px-4 text-slate-600">{c.email}</td>
                          <td className="py-3 px-4">
                            <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 uppercase">
                              {c.role}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-800">{c.ordersCount} pedidos</td>
                          <td className="py-3 px-4 font-bold text-orange-600">S/ {c.totalSpent}</td>
                          <td className="py-3 px-4">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                c.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {c.isActive ? 'Activo' : 'Suspendido'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleToggleCustomer(c.id)}
                              className="rounded border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-700 hover:bg-slate-100"
                            >
                              {c.isActive ? 'Desactivar' : 'Activar'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════
            PESTAÑA 5: SISTEMA MULTIAGENTE + RAG (FASE 8)
           ═══════════════════════════════════════════════════ */}
        {activeTab === 'ai' && (
          <div className="space-y-6">
            {/* Estado de los Agentes Inteligentes */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    Arquitectura Multiagente gorDOS (AGENTS.md)
                  </h3>
                  <p className="text-xs text-slate-500">
                    5 agentes autónomos coordinados para predicción de pedidos, memoria RAG y análisis de demanda
                  </p>
                </div>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-200">
                  ● Sistema 100% Operativo
                </span>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {[
                  { id: 'A0', name: 'Orquestador', role: 'Coordinación central de agentes y eventos', status: 'Activo' },
                  { id: 'A1', name: 'RAG & Memoria', role: 'Vectores semánticos (384d) e histórico de clientes', status: 'Activo' },
                  { id: 'A2', name: 'Predictor', role: 'Scoring probabilístico (>60%) por franja horaria', status: 'Activo' },
                  { id: 'A3', name: 'Recomendador', role: 'Venta cruzada (co-ocurrencia) en tiempo real', status: 'Activo' },
                  { id: 'A4', name: 'Analítico', role: 'Picos de demanda y métricas de consumo', status: 'Activo' },
                ].map((ag) => (
                  <div key={ag.id} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
                    <div className="flex items-center justify-between">
                      <span className="rounded bg-orange-600 px-1.5 py-0.5 text-[10px] font-black text-white">
                        {ag.id}
                      </span>
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    </div>
                    <h4 className="mt-2 text-xs font-bold text-slate-900">{ag.name}</h4>
                    <p className="mt-1 text-[11px] text-slate-500 leading-snug">{ag.role}</p>
                  </div>
                ))}
              </div>
            </div>

            {loadingDemand && (
              <div className="h-64 animate-pulse rounded-2xl bg-white border border-slate-200" />
            )}

            {!loadingDemand && demandReport && (
              <>
                {/* Resumen de Demanda: Pico y Día más Fuerte */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Hora Pico de Mayor Demanda
                    </p>
                    <h3 className="mt-2 text-2xl font-black text-slate-900">
                      {demandReport.busiestHour.hourLabel}
                    </h3>
                    <p className="mt-1 text-xs text-orange-600 font-bold">
                      {demandReport.busiestHour.count} pedidos registrados en esta ventana horaria
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Día de Mayor Concurrencia
                    </p>
                    <h3 className="mt-2 text-2xl font-black text-slate-900">
                      {demandReport.busiestDay.dayName}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500 font-semibold">
                      Día preferido por los comensales para ordenar
                    </p>
                  </div>
                </div>

                {/* Análisis por Franjas Horarias (8.8) */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="text-base font-bold text-slate-900">
                    Consumo por Franjas Horarias (A4 Analítico)
                  </h3>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {demandReport.timeSlots.map((ts) => (
                      <div key={ts.slot} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-slate-900">{ts.label}</span>
                          <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">
                            {ts.hours}
                          </span>
                        </div>
                        <p className="mt-2 text-2xl font-black text-orange-600">{ts.orderCount} pedidos</p>

                        <div className="mt-3 border-t border-slate-200/60 pt-2">
                          <p className="text-[10px] uppercase font-bold text-slate-400">Platos más pedidos:</p>
                          {ts.topProducts.length === 0 ? (
                            <p className="text-[11px] text-slate-400 italic mt-0.5">Sin pedidos registrados</p>
                          ) : (
                            <ul className="mt-1 space-y-0.5 text-xs text-slate-700 font-medium">
                              {ts.topProducts.map((p, idx) => (
                                <li key={idx}>
                                  • {p.productName} ({p.units} u.)
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Gráfico de Barras: Distribución Horaria 0 - 23h */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="text-base font-bold text-slate-900">
                    Distribución de Pedidos por Hora (00:00 - 23:00)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Visualización de carga operativa para optimizar el encendido de brasas y preparación de stock
                  </p>

                  <div className="mt-6 flex h-48 items-end gap-1 overflow-x-auto pb-2">
                    {demandReport.hourlyPeaks.map((hp) => {
                      const maxOrders = Math.max(...demandReport.hourlyPeaks.map((p) => p.orderCount), 1);
                      const heightPct = Math.max(8, Math.round((hp.orderCount / maxOrders) * 100));
                      const isPeak = hp.orderCount > 0 && hp.orderCount === demandReport.busiestHour.count;

                      return (
                        <div key={hp.hour} className="group relative flex flex-1 flex-col items-center">
                          {/* Tooltip on hover */}
                          <div className="pointer-events-none absolute -top-10 z-10 hidden rounded bg-slate-900 px-2 py-1 text-[10px] font-bold text-white shadow group-hover:block whitespace-nowrap">
                            {hp.hourLabel}: {hp.orderCount} ped. (S/ {hp.totalRevenue})
                          </div>

                          <div
                            style={{ height: `${heightPct}%` }}
                            className={`w-full rounded-t transition-all ${
                              isPeak
                                ? 'bg-orange-600'
                                : hp.orderCount > 0
                                  ? 'bg-amber-400 hover:bg-amber-500'
                                  : 'bg-slate-100'
                            }`}
                          />
                          <span className="mt-1.5 text-[9px] text-slate-400 font-mono">
                            {hp.hour % 3 === 0 ? hp.hour : ''}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════
            PESTAÑA 6: REPORTES EXPORTABLES (7.6)
           ═══════════════════════════════════════════════════ */}
        {activeTab === 'reports' && (
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <span className="text-4xl">📊</span>
              <h3 className="mt-3 text-lg font-bold text-slate-900">Reporte de Pedidos y Ventas</h3>
              <p className="mt-1 text-xs text-slate-500">
                Descarga el historial completo de pedidos con número, fecha, hora, estado, forma de pago,
                total recaudado y dirección de entrega. Formato CSV con soporte para Microsoft Excel.
              </p>
              <div className="mt-6">
                <a
                  href={adminApi.getOrdersCsvUrl()}
                  download
                  className="inline-flex rounded-xl bg-orange-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-orange-500"
                >
                  Descargar Pedidos (.CSV)
                </a>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <span className="text-4xl">🍔</span>
              <h3 className="mt-3 text-lg font-bold text-slate-900">Reporte de Catálogo e Inventario</h3>
              <p className="mt-1 text-xs text-slate-500">
                Exporta el estado actual de la carta: productos, categorías asociadas, precios de venta, stock
                en almacén y disponibilidad actual.
              </p>
              <div className="mt-6">
                <a
                  href={adminApi.getProductsCsvUrl()}
                  download
                  className="inline-flex rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800"
                >
                  Descargar Inventario (.CSV)
                </a>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── Modal Crear Producto ───────────────────────── */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={handleCreateProduct}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-900">Crear Nuevo Producto</h3>
              <button
                type="button"
                onClick={() => setShowProductModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">Categoría</label>
              <select
                value={newProduct.categoryId}
                onChange={(e) => setNewProduct({ ...newProduct, categoryId: Number(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800"
                required
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">Nombre del Plato / Producto</label>
              <input
                type="text"
                placeholder="Ej: Salchipapa Especial"
                value={newProduct.name}
                onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700">Precio (S/)</label>
                <input
                  type="text"
                  placeholder="25.00"
                  value={newProduct.price}
                  onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">Stock Inicial (unidades)</label>
                <input
                  type="number"
                  min={0}
                  placeholder="50"
                  value={newProduct.stock ?? 50}
                  onChange={(e) => setNewProduct({ ...newProduct, stock: Number(e.target.value) })}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">Tiempo Prep (min)</label>
              <input
                type="number"
                min={1}
                value={newProduct.preparationTime}
                onChange={(e) => setNewProduct({ ...newProduct, preparationTime: Number(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">Descripción / Ingredientes</label>
              <textarea
                placeholder="Detalla los acompañamientos o receta..."
                rows={2}
                value={newProduct.description}
                onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 rounded-xl bg-orange-600 py-2.5 text-xs font-bold text-white hover:bg-orange-500"
              >
                Guardar en Carta
              </button>
              <button
                type="button"
                onClick={() => setShowProductModal(false)}
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ─── Modal Editar Producto ───────────────────────── */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleSaveEditProduct}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-bold text-slate-900">Editar Producto</h3>
                <p className="text-xs text-slate-500">Actualiza precios, nombres y características</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">Categoría</label>
              <select
                value={editingProduct.categoryId}
                onChange={(e) => setEditingProduct({ ...editingProduct, categoryId: Number(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800"
                required
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">Nombre del Plato / Producto</label>
              <input
                type="text"
                value={editingProduct.name}
                onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700">Precio (S/)</label>
                <input
                  type="text"
                  value={editingProduct.price}
                  onChange={(e) => setEditingProduct({ ...editingProduct, price: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800 font-bold text-orange-600"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">Stock Actual (u.)</label>
                <input
                  type="number"
                  min={0}
                  value={editingProduct.stock ?? 0}
                  onChange={(e) => setEditingProduct({ ...editingProduct, stock: Number(e.target.value) })}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800 font-bold"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700">Tiempo Prep (min)</label>
                <input
                  type="number"
                  min={1}
                  value={editingProduct.preparationTime ?? 15}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, preparationTime: Number(e.target.value) })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">Identificador (Slug)</label>
                <input
                  type="text"
                  disabled
                  value={editingProduct.slug}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-100 p-2 text-xs text-slate-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">Descripción / Ingredientes</label>
              <textarea
                rows={3}
                value={editingProduct.description ?? ''}
                onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 rounded-xl bg-orange-600 py-2.5 text-xs font-bold text-white hover:bg-orange-500 shadow-md transition-colors"
              >
                Guardar Cambios
              </button>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ─── Modal Gestión de Stock & Ventas Presenciales ──── */}
      {stockModalProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-150">
            <div className="flex items-start justify-between border-b pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600">
                  Control Diario & Mostrador
                </span>
                <h3 className="text-lg font-black text-slate-900">{stockModalProduct.name}</h3>
                <p className="text-xs text-slate-500">{stockModalProduct.categoryName || 'Plato de carta'}</p>
              </div>
              <button
                onClick={() => setStockModalProduct(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-xl leading-none"
              >
                ✕
              </button>
            </div>

            {/* Tarjeta de Stock Actual */}
            <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200 p-4">
              <div>
                <p className="text-xs text-slate-500 font-medium">Stock disponible ahora:</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-black text-slate-900">{stockModalProduct.stock ?? 0}</span>
                  <span className="text-sm font-semibold text-slate-500">porciones / u.</span>
                </div>
              </div>
              <div className="text-right">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold border ${
                    (stockModalProduct.stock ?? 0) <= 0
                      ? 'bg-rose-100 text-rose-800 border-rose-200'
                      : (stockModalProduct.stock ?? 0) <= 5
                      ? 'bg-amber-100 text-amber-800 border-amber-200'
                      : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                  }`}
                >
                  {(stockModalProduct.stock ?? 0) <= 0
                    ? '🔴 Agotado'
                    : (stockModalProduct.stock ?? 0) <= 5
                    ? '🟡 Stock Crítico'
                    : '🟢 En Carta'}
                </span>
                <p className="text-[10px] text-slate-400 mt-1">Precio: S/ {stockModalProduct.price}</p>
              </div>
            </div>

            {/* Selector de modo: Actualizar Día vs Venta Presencial */}
            <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setStockModalMode('set')}
                className={`py-2 rounded-lg transition-all ${
                  stockModalMode === 'set'
                    ? 'bg-white text-orange-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🌅 Stock Diario (Apertura)
              </button>
              <button
                type="button"
                onClick={() => setStockModalMode('decrement')}
                className={`py-2 rounded-lg transition-all ${
                  stockModalMode === 'decrement'
                    ? 'bg-white text-orange-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🧾 Venta Presencial (Mostrador)
              </button>
            </div>

            {/* Modo 1: Fijar Stock del Día */}
            {stockModalMode === 'set' && (
              <div className="space-y-4">
                <p className="text-xs text-slate-600">
                  Define la cantidad total preparada hoy para este plato. Al guardar, se sincronizará en tiempo real con la app web y la cocina.
                </p>
                <div>
                  <label className="text-xs font-bold text-slate-700">Nuevo Stock para hoy (unidades):</label>
                  <div className="flex gap-2 mt-1">
                    <input
                      type="number"
                      min={0}
                      value={stockInputVal}
                      onChange={(e) => setStockInputVal(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 p-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:border-orange-500"
                    />
                    <button
                      type="button"
                      onClick={handleSaveDailyStock}
                      disabled={savingStock}
                      className="whitespace-nowrap rounded-xl bg-orange-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-orange-500 disabled:opacity-50"
                    >
                      {savingStock ? 'Guardando...' : 'Fijar Stock'}
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[11px] text-slate-400 font-medium">Atajos rápidos:</span>
                  {[20, 30, 50, 100].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setStockInputVal(String(preset))}
                      className="rounded-md border border-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-100"
                    >
                      {preset} u.
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Modo 2: Registrar Venta Presencial (Descontar) */}
            {stockModalMode === 'decrement' && (
              <div className="space-y-4">
                <p className="text-xs text-slate-600">
                  ¿Se vendieron porciones presenciales en el local o caja? Descuenta el stock al instante para que no se sobrevendan por la app.
                </p>
                <div>
                  <label className="text-xs font-bold text-slate-700">Botones rápidos de venta en mostrador:</label>
                  <div className="grid grid-cols-4 gap-2 mt-1.5">
                    {[1, 2, 3, 5].map((qty) => (
                      <button
                        key={qty}
                        type="button"
                        onClick={() => handleRegisterCounterSale(qty)}
                        disabled={savingStock || (stockModalProduct.stock ?? 0) < qty}
                        className="rounded-xl border border-orange-200 bg-orange-50 py-2.5 text-xs font-extrabold text-orange-700 hover:bg-orange-100 disabled:opacity-40 transition-colors"
                      >
                        - {qty} {qty === 1 ? 'porción' : 'porciones'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-3">
                  <label className="text-xs font-bold text-slate-700">O ingresar otra cantidad:</label>
                  <div className="flex gap-2 mt-1">
                    <input
                      type="number"
                      min={1}
                      max={stockModalProduct.stock ?? 999}
                      value={decrementInputQty}
                      onChange={(e) => setDecrementInputQty(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full rounded-xl border border-slate-300 p-2.5 text-sm font-bold text-slate-900"
                    />
                    <button
                      type="button"
                      onClick={() => handleRegisterCounterSale()}
                      disabled={savingStock || (stockModalProduct.stock ?? 0) < decrementInputQty}
                      className="whitespace-nowrap rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-40"
                    >
                      {savingStock ? 'Registrando...' : `Descontar ${decrementInputQty}`}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="border-t pt-3 flex justify-end">
              <button
                type="button"
                onClick={() => setStockModalProduct(null)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal Ticket Preview ───────────────────────── */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-900">
                Ticket ({selectedTicket.type.toUpperCase()})
              </h3>
              <button onClick={() => setSelectedTicket(null)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <div className="my-4 max-h-[60vh] overflow-y-auto rounded-xl bg-amber-50 p-4 text-slate-900 shadow-inner">
              <pre className="font-mono text-xs whitespace-pre-wrap">{selectedTicket.text}</pre>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 rounded-xl bg-orange-600 py-2 text-xs font-bold text-white hover:bg-orange-500"
              >
                🖨 Imprimir
              </button>
              <button
                onClick={() => setSelectedTicket(null)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default function AdminDashboardPage() {
  return (
    <AuthProvider>
      <AdminDashboardContent />
    </AuthProvider>
  );
}

