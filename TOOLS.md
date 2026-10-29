# TOOLS.md — Herramientas del sistema gorDOS

## Herramientas de desarrollo

| Herramienta | Versión | Uso |
|---|---|---|
| Node.js | 22+ | Runtime del backend y frontend |
| TypeScript | 5.x | Tipado estricto en todo el proyecto |
| Fastify | 5.x | Framework del backend API |
| Next.js | 14+ | Frontend web (SSR + React) |
| PostgreSQL | 16 | Base de datos principal |
| Drizzle ORM | 0.12+ | ORM tipado para PostgreSQL |
| Redis | 7+ | Cache + cola de pedidos (BullMQ) |
| Stripe API | 2024-11+ | Pasarela de pagos online |
| WhatsApp Cloud API | — | Mensajería y notificaciones |
| Docker | — | Contenedores para desarrollo y producción |

## Herramientas del sistema multiagente

| Agente | Herramienta |
|---|---|
| A0 — Orquestador | Coordinación central, rutas de API |
| A1 — RAG (Memoria) | pgvector (PostgreSQL) + embeddings |
| A2 — Predictor | Módulo Node.js con regresión logística |
| A3 — Recomendador | Redis (frecuencia de pares) + SQL |
| A4 — Analítico | Reportes SQL + dashboard admin |
| A5 — DevSecOps | Scripts + GitHub Actions + alertas Telegram |

## APIs externas

| Servicio | Propósito | ¿API Key necesaria? |
|---|---|---|
| Stripe | Pagos online | ✅ Sí |
| WhatsApp Cloud API | Notificaciones y pedidos | ✅ Sí |
| Google Business Profile | Visibilidad del restaurante | ❌ Opcional |
| Resend / SendGrid | Emails transaccionales | ✅ Sí |

## Secretos y variables de entorno

```env
# .env.example
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
STRIPE_SECRET_KEY=sk_...
WHATSAPP_TOKEN=EA...
JWT_SECRET=...
RESEND_API_KEY=...
```

> TOOLS.md v1.0 — gorDOS Project