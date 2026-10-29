# MEMORY — gorDOS

> **Propósito**: Decisiones duraderas del proyecto, aprendizajes y contexto que deben sobrevivir entre sesiones.

---

## Decisiones técnicas

| Decisión | Opción | Justificación |
|---|---|---|
| Frontend separado del backend | Next.js (frontend) + Fastify (backend) | Si mañana se necesita app móvil, la API ya existe |
| Drizzle ORM en vez de Prisma | Drizzle | Consultas SQL reales, tipado fuerte, sin vendor lock-in |
| PostgreSQL como BD principal | Pgvector para embeddings RAG | Escalable, sin límite real, embeddings nativos |
| Redis + BullMQ para cola de pedidos | Cola persistente | No perder pedidos si hay pico de tráfico |
| Stripe como pasarela de pagos | Stripe | Estándar global, buena DX, escaleable |
| WhatsApp Cloud API oficial | Meta API | Sin límites de Twilio, plantillas aprobadas |
| Impresión por WebSocket → ESC/POS | WebSocket | Tiempo real, compatible con impresoras térmicas |

## Stack confirmado

- **Frontend**: Next.js 14+ (TypeScript)
- **Backend**: Node.js + TypeScript + Fastify
- **BD**: PostgreSQL 16 + Drizzle ORM + pgvector
- **Cache/Cola**: Redis + BullMQ
- **Pagos**: Stripe
- **WhatsApp**: WhatsApp Cloud API
- **Infra**: Docker + VPS

## Sistema multiagente

| Agente | Responsabilidad | Prioridad |
|---|---|---|
| A0 — Orquestador | Coordinar agentes según interacción | 🔴 Crítica |
| A1 — RAG | Memoria de interacciones + embeddings | 🔴 Alta |
| A2 — Predictor | Predicción de próximo pedido | 🟡 Media |
| A3 — Recomendador | Sugerencias en tiempo real | 🟡 Media |
| A4 — Analítico | Reportes y dashboard admin | 🟢 Media-baja |
| A5 — DevSecOps | Salud del sistema, backups, seguridad | 🟡 Media |

## Contexto del proyecto

- **Inspiración**: Gordo's Fast Food, Ventanilla, Perú (negocio anterior de Jonathan)
- **Propósito inicial**: Portfolio, pero diseñado para negocio real
- **Ubicación base**: Perú, adaptable a Barcelona
- **Usuario GitHub**: jesteban1983
- **Nombre**: gorDOS (Gordo + DOS)

---

> MEMORY.md v1.0 — gorDOS Project