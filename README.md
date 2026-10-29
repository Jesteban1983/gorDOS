# gorDOS 🍔🔥

> **Sistema de pedidos inteligente para comida rápida peruana**
> *De Gordo's Fast Food para el mundo* 

gorDOS es un sistema completo de gestión de pedidos online con inteligencia predictiva. Nació como un proyecto para digitalizar **Gordo's Fast Food** (Ventanilla, Perú) y está diseñado para escalar a cualquier restaurante de comida rápida.

## ✨ Funcionalidades

| Funcionalidad | Estado |
|---|---|
| 🛒 Pedido vía web (rápido, 3 clics) | ⏳ En desarrollo |
| 💬 Pedido vía WhatsApp | 📅 Planificado |
| 📋 Carta digital con personalización | ⏳ En desarrollo |
| 👤 Clientes registrados + invitados | ⏳ En desarrollo |
| 💳 Pago online (Stripe) + contra entrega | 📅 Planificado |
| 📊 Stock en tiempo real | 📅 Planificado |
| 🖨️ Comandas en cocina y caja | 📅 Planificado |
| 🤖 RAG predictivo (recomendaciones + predicciones) | 📅 Planificado |
| 📊 Panel de administración completo | 📅 Planificado |

## 🏗️ Stack

```
Frontend:  Next.js 14+ (TypeScript)
Backend:   Node.js + Fastify (TypeScript)
BD:        PostgreSQL 16 + Drizzle ORM + pgvector
Cache:     Redis + BullMQ (cola de pedidos)
Pagos:     Stripe
WhatsApp:  WhatsApp Cloud API
Infra:     Docker + VPS
```

## 🧠 Sistema multiagente

gorDOS incluye su propio sistema de agentes inteligentes:

| Agente | Función |
|---|---|
| **A0 — Orquestador** | Coordina todos los agentes según la interacción del cliente |
| **A1 — RAG** | Memoria de interacciones con embeddings (pgvector) |
| **A2 — Predictor** | Predice qué producto pedirá el cliente |
| **A3 — Recomendador** | Sugiere productos complementarios |
| **A4 — Analítico** | Reportes y dashboard |
| **A5 — DevSecOps** | Salud del sistema y seguridad |

## 🚀 Inicio rápido

```bash
# Próximamente...
```

## 📊 Proyecto

- **Inspiración**: Gordo's Fast Food — Ventanilla, Perú 🇵🇪
- **Autor**: Jonathan Esteban Barona
- **Repositorio**: github.com/jesteban1983/gorDOS

---

> *Hecho con ✨ para los amantes de la comida peruana rápida.*