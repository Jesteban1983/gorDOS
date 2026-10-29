# AGENTS.md — Sistema Multiagente gorDOS

> **Propósito**: Definir los agentes inteligentes que dan vida al sistema de pedidos predictivo de gorDOS.
> **Base**: Cada agente es un módulo con responsabilidad única, memoria propia y herramientas específicas.

---

## Arquitectura de agentes

```
                    ┌──────────────────────┐
                    │   ORQUESTRADOR (A0)   │ ← Coordina todos los agentes
                    └──────────┬───────────┘
                               │
         ┌─────────────────────┼─────────────────────┐
         ▼                     ▼                     ▼
┌──────────────┐    ┌──────────────────┐    ┌──────────────────┐
│  A1 — RAG    │    │  A2 — PREDICTOR  │    │  A3 — RECOMEND. │
│  (Memoria    │    │  (Probabilidad   │    │  (Sugerencias    │
│   clientes)  │    │   de pedido)     │    │   personalizadas)│
└──────┬───────┘    └────────┬─────────┘    └────────┬─────────┘
       │                     │                       │
       └─────────────────────┼───────────────────────┘
                             ▼
                    ┌──────────────────┐
                    │  Memoria Central  │
                    │  (PostgreSQL +    │
                    │   Embeddings)     │
                    └──────────────────┘
```

---

## Agentes del sistema

### A0 — ORQUESTRADOR
| Campo | Descripción |
|---|---|
| **Rol** | Coordina las consultas entre agentes. Decide qué agente activar según la interacción del cliente. |
| **Activa** | A1 cuando un cliente nuevo interactúa. A2 cuando hay suficiente histórico. A3 tras confirmar un pedido. |
| **Prioridad** | 🔴 Crítica — Sin él, los agentes no se coordinan. |

### A1 — RAG (Memoria de interacciones)
| Campo | Descripción |
|---|---|
| **Rol** | Almacena y recupera interacciones de cada cliente: qué pidió, cuándo, observaciones, tiempo entre pedidos. |
| **Tecnología** | Embeddings (pgvector) + PostgreSQL. Cada interacción genera un vector de búsqueda semántica. |
| **Salida** | Contexto enriquecido del cliente para los otros agentes. |
| **Prioridad** | 🔴 Alta — Es la base del aprendizaje del sistema. |

### A2 — PREDICTOR
| Campo | Descripción |
|---|---|
| **Rol** | Predice qué producto probablemente pedirá un cliente basado en su histórico + hora + día + temporada. |
| **Modelo** | Regresión logística simple + reglas (sin depender de APIs externas de ML). Datos: día de semana, hora, pedidos anteriores, clima. |
| **Salida** | Top 3 productos con probabilidad > umbral. |
| **Prioridad** | 🟡 Media — Mejora con el tiempo. |

### A3 — RECOMENDADOR
| Campo | Descripción |
|---|---|
| **Rol** | Sugiere productos complementarios o alternativos durante el pedido. |
| **Reglas** | "Quien pidió X también pidió Y" (frecuencia de pares) + "Los clientes que piden a las 14:00 suelen pedir bebida grande". |
| **Salida** | Sugerencias en tiempo real durante la navegación del menú. |
| **Prioridad** | 🟢 Media-baja — Valor añadido, no crítico. |

### A4 — ANALÍTICO (Backoffice)
| Campo | Descripción |
|---|---|
| **Rol** | Genera reportes automáticos: productos más vendidos, picos de demanda, rotación de stock. |
| **Salida** | Datos estructurados para el dashboard del admin. |
| **Prioridad** | 🟢 Media — Para la parte administrativa. |

### A5 — DEVSECOPS (Automantenimiento)
| Campo | Descripción |
|---|---|
| **Rol** | Monitoriza la salud del sistema: backups, estado de la cola de pedidos, logs de errores, alertas de seguridad. |
| **Herramientas** | Scripts programados + alertas a Telegram del admin. |
| **Prioridad** | 🟡 Media — Crítica para producción. |

---

## Ciclo de vida de una interacción

```
1. Cliente abre la web/hace pedido por WhatsApp
   → A0 captura el evento

2. A0 consulta a A1 (RAG):
   "¿Quién es este cliente? ¿Ha pedido antes? ¿Qué sabe de él?"

3. A1 devuelve:
   - Cliente recurrente (3 pedidos en los últimos 15 días)
   - Último pedido: Pollo a la brasa + Inca Kola
   - Horario típico: 13:00 - 14:00

4. A0 activa A2 (PREDICTOR):
   "Con estos datos + día martes 13:30"
   → A2 responde: "Probabilidad de Pollo a la Brasa: 78%"
                      "Probabilidad de Lomo Saltado: 45%"

5. Cuando el cliente añade un producto al carrito
   → A0 activa A3 (RECOMENDADOR):
   "Sugiere: Crema de ají (quien pidió pollo también pidió ají)"

6. Al confirmar el pedido
   → A1 guarda la interacción en memoria
   → A4 actualiza estadísticas
```

---

## Almacenamiento

| Dato | Dónde | Formato |
|---|---|---|
| Interacciones de clientes | PostgreSQL (tabla `interactions`) | JSON + timestamps |
| Embeddings semánticos | pgvector | Vector de 384 dimensiones |
| Reglas de recomendación | Redis (hash) | `producto_X: [productos_asociados]` |
| Modelo predictivo | PostgreSQL + script en Node.js | Coeficientes de regresión |
| Logs del sistema | `memory/logs/` | JSON rotativo |

---

> AGENTS.md v1.0 — gorDOS Project