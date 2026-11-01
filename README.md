# gorDOS 🍔🔥

> **Sistema de pedidos inteligente para comida rápida peruana con sincronización en tiempo real e IA predictiva**  
> *De Gordo's Fast Food (Ventanilla, Perú) para el mundo.*

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14+-black?logo=next.js&logoColor=white)](https://nextjs.org/)
[![Fastify](https://img.shields.io/badge/Fastify-4.x-000000?logo=fastify&logoColor=white)](https://fastify.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16%20+%20pgvector-336791?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-0.30+-C5F74F?logo=drizzle&logoColor=black)](https://orm.drizzle.team/)
[![Vitest](https://img.shields.io/badge/Tests-17%20Passed-25c2a0?logo=vitest&logoColor=white)](https://vitest.dev/)

---

## 📖 Descripción General

**gorDOS** es una solución de comercio gastronómico diseñada específicamente para optimizar la operativa de pollerías, sangucherías y restaurantes de comida rápida. Integra en una única plataforma la experiencia del cliente final, la cocina en tiempo real, el control de caja/mostrador y agentes de inteligencia artificial para predecir demanda y recomendar combinaciones personalizadas.

---

## ✨ Características Principales

### 🍗 1. Carta Digital y Pedidos Web (`/menu`)
* Catálogo dinámico organizado por categorías: *Pollos a la brasa, Hamburguesas, Salchipapas, Broaster, Bebidas, etc.*
* Configuración avanzada de platos con variantes, adicionales (tocino, queso, huevo), selección de cremas peruanas y bebidas.
* Carrito en tiempo real con cálculo automático de totales y tiempos estimados de entrega.
* Checkout con soporte para clientes registrados e invitados, pago contra entrega y modo demo de pasarela de pago.

### 📦 2. Control de Stock en Tiempo Real & Venta Presencial
* **Sincronización WebSocket**: Si un plato se queda sin stock, la carta lo desactiva instantáneamente sin necesidad de recargar la página.
* **Control Diario de Apertura**: Modal en panel de administración para ingresar el stock preparado del día (ej. 50 porciones de pollo, 30 hamburguesas).
* **Descuento de Ventas Físicas (Mostrador / Caja)**: Botones rápidos (`-1`, `-2`, `-3`, `-5`) para registrar ventas físicas en caja y evitar sobreventas desde la app web.
* **Alertas visuales de stock**: Insignias verde (>5 u.), ámbar (≤5 u.) y roja (agotado).

### 🍳 3. Pantalla de Cocina KDS & Impresión de Comandas (`/kitchen`)
* Visualización Kanban para cocineros con actualización reactiva vía WebSocket.
* Transición de estados de comanda: `Pendiente` ➔ `Confirmado` ➔ `En Preparación` ➔ `Listo` ➔ `Entregado`.
* **Motor ESC/POS**: Generación de tickets formateados tanto para **Cocina** (desglose de platos, guarniciones y observaciones) como para **Caja / Facturación** (precios, subtotales, totales y forma de pago).

### 📊 4. Panel de Administración Completo (`/admin`)
* **Dashboard y Métricas en Vivo**: Ingresos totales, ticket promedio, volumen de órdenes y desglose por estado.
* **Gestión de Carta y Precios**: Edición en línea de nombres, precios, tiempos de preparación, categorías y stock.
* **Gestión de Clientes**: Historial de consumo por cliente, tickets acumulados y activación de cuentas.
* **Exportación de Reportes**: Descarga de reportes en formato CSV (con BOM UTF-8 para Excel) de órdenes e inventario actual.

### 🤖 5. Sistema Multiagente RAG con Memoria Semántica (pgvector)
Arquitectura multiagente modular para potenciar las ventas y la logística:
* **A0 — Orquestador Central**: Deriva consultas del cliente y coordina respuestas entre agentes.
* **A1 — RAG & Memoria de Interacciones**: Registro y búsqueda semántica de preferencias del cliente mediante embeddings vectoriales con `pgvector`.
* **A2 — Predictor de Pedidos**: Análisis probabilístico de consumo previo para sugerir "¿Lo de siempre?".
* **A3 — Recomendador Inteligente (Cross-Selling)**: Sugerencias contextuales de acompañamientos, salsas y bebidas complementarias.
* **A4 — Analítico de Demanda**: Detección de horas punta, productos estrella y patrones de venta semanal.

---

## 🏗️ Arquitectura y Tecnologías

```
┌────────────────────────────────────────────────────────────────────────┐
│                              gorDOS                                    │
├─────────────────────────┬──────────────────────────────────────────────┤
│  Frontend (Next.js 14)  │  • Tailwind CSS / Lucide Icons               │
│  Puerto: 3001           │  • WebSockets (Stock & Órdenes en vivo)      │
│                         │  • Context API (Auth, Carrito, Notif.)       │
├─────────────────────────┼──────────────────────────────────────────────┤
│  Backend (Fastify)      │  • Arquitectura modular por dominios         │
│  Puerto: 4001           │  • WebSocket Hubs (Stock, KDS, Orders)       │
│                         │  • Motor ESC/POS térmico para comandas       │
│                         │  • OpenAPI / Swagger integrado               │
├─────────────────────────┼──────────────────────────────────────────────┤
│  Capa de Datos & ML     │  • PostgreSQL 16 con extensión pgvector      │
│  Puerto: 5433           │  • Drizzle ORM (migraciones & tipado estricto)│
│                         │  • Pipeline de Embeddings (384 dims)         │
└─────────────────────────┴──────────────────────────────────────────────┘
```

---

## 🚀 Puesta en Marcha (Desarrollo Local)

### 1. Requisitos Previos
* Node.js v18 o superior y npm.
* PostgreSQL 16 con extensión `pgvector` habilitada.

### 2. Configuración de Base de Datos y Backend
Accede a la carpeta `backend`:
```bash
cd backend
npm install
```

Crea o revisa el archivo `.env` en `backend/.env`:
```env
PORT=4001
HOST=0.0.0.0
DATABASE_URL=postgresql://gordos:gordos123@localhost:5433/gordos
JWT_SECRET=super_secret_jwt_key_gordos_2026
FRONTEND_URL=http://localhost:3001
```

Aplica las migraciones y puebla la carta inicial con categorías y productos típicos:
```bash
# Aplicar esquema a PostgreSQL
npm run db:push

# Sembrar catálogo inicial de Gordo's
npm run db:seed
```

Inicia el backend en modo desarrollo:
```bash
npm run dev
# Servidor escuchando en http://localhost:4001
```

### 3. Configuración del Frontend
En otra terminal, accede a la carpeta `frontend`:
```bash
cd frontend
npm install
```

Crea o revisa el archivo `.env.local` en `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:4001
NEXT_PUBLIC_WS_URL=ws://localhost:4001
```

Inicia el frontend en el puerto 3001:
```bash
npm run dev -- -p 3001
# Aplicación web lista en http://localhost:3001
```

---

## 📍 Rutas de Navegación

| URL | Vista | Descripción |
|---|---|---|
| [`http://localhost:3001/menu`](http://localhost:3001/menu) | **Carta Digital** | Experiencia del comensal: catálogo, filtros y carrito. |
| [`http://localhost:3001/admin`](http://localhost:3001/admin) | **Panel Administrador** | Gestión de productos, ajuste diario de stock, ventas en mostrador y reportes. |
| [`http://localhost:3001/kitchen`](http://localhost:3001/kitchen) | **Pantalla de Cocina (KDS)** | Tablero para cocineros con actualización de pedidos en tiempo real. |
| [`http://localhost:3001/admin/stock`](http://localhost:3001/admin/stock) | **Inventario Rápido** | Ajuste veloz de disponibilidad de productos. |
| [`http://localhost:4001/docs`](http://localhost:4001/docs) | **API Swagger** | Documentación interactiva OpenAPI de los endpoints Fastify. |

---

## 🧪 Pruebas Unitarias y de Integración

El backend incluye una suite exhaustiva de pruebas automáticas con **Vitest**:
```bash
cd backend
npm test
```
* **Comandas ESC/POS**: Verificación de caracteres de control, saltos y formato de tickets de cocina y caja.
* **Servicio Admin**: Validación de métricas KPI, paginación de pedidos, cálculo de recaudación y exportación CSV.
* **Sistema Multiagente**: Comprobación de cálculo de similitud coseno en embeddings, memoria RAG y analítica de horarios.

---

## 📋 Estado del Proyecto

- [x] **Fase 1**: Autenticación, JWT, registro y pedidos como invitado.
- [x] **Fase 2**: Catálogo, categorías, productos, adicionales, cremas y bebidas.
- [x] **Fase 3**: Carrito de compras reactivo y flujo de checkout.
- [x] **Fase 4**: Sistema de stock en tiempo real con WebSockets.
- [x] **Fase 5**: Pantalla de cocina (KDS) y tickets térmicos ESC/POS.
- [x] **Fase 7**: Panel de control administrativo, métricas, edición de carta y exportación CSV.
- [x] **Fase 8**: Sistema Multiagente RAG con memoria de clientes (`pgvector`).
- [ ] **Fase 6**: Integración con canal de mensajería (WhatsApp Cloud API).
- [ ] **Fase 9 & 10**: Optimización avanzada mobile-first y suite E2E Playwright.

---

## 👨‍🍳 Inspiración y Autoría

* **Negocio**: Inspirado en el sabor y calidez de **Gordo's Fast Food** — Ventanilla, Callao, Perú 🇵🇪.
* **Desarrollo**: Jonathan Esteban Barona (`@jesteban1983`).
