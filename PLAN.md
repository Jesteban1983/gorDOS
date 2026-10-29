# Plan de Desarrollo — gorDOS

> **Propósito**: Sistema de pedidos online para restaurante de comida rápida peruana, con gestión completa (carta, stock, cocina, caja, pagos) e inteligencia predictiva basada en RAG.
> **Stack**: TypeScript + React/Next.js + Node.js/Fastify + PostgreSQL + Drizzle + Redis + Stripe + WhatsApp Cloud API
> **Repo**: `github.com/jesteban1983/gorDOS`

---

## 🌿 Estructura de ramas

```
main ─── dev ─── feat/[funcionalidad]
                ├── fix/[bug]
                ├── refactor/[area]
                └── docs/[mejora]
```

## 🏗️ Arquitectura del sistema

```
┌─────────────────────────────────────────────────────┐
│                   gorDOS App                         │
├──────────────┬──────────────┬───────────────────────┤
│  Frontend    │   Backend    │   Agentes IA          │
│  (Next.js)   │  (Fastify)   │   (RAG + ML)          │
├──────────────┴──────────────┴───────────────────────┤
│  PostgreSQL  │   Redis     │   Stripe  │ WhatsApp   │
└─────────────────────────────────────────────────────┘
```

---

## 📋 Fases del proyecto

### Fase 0: Setup y fundación (Días 1-3)
- [ ] 0.1 Inicializar repositorio Git con estructura de ramas
- [ ] 0.2 Configurar proyecto: frontend (Next.js) + backend (Fastify) + DB (PostgreSQL + Drizzle)
- [ ] 0.3 Configurar Docker + docker-compose para desarrollo local
- [ ] 0.4 Crear estructura de archivos del sistema multiagente (`AGENTS.md`, `SOUL.md`, `TOOLS.md`, `memory/`)
- [ ] 0.5 Configurar CI básico (GitHub Actions: lint + type check)
- [ ] 0.6 Configurar Redis + BullMQ para cola de pedidos
- [ ] **Criterio de éxito**: `docker compose up` levanta frontend, backend y DB. Los agentes tienen su estructura de archivos.

### Fase 1: Autenticación y registro (Días 4-6)
- [ ] 1.1 Sistema de registro de clientes (email + contraseña + datos básicos)
- [ ] 1.2 Pedido como invitado (sin registro)
- [ ] 1.3 JWT + refresh tokens
- [ ] 1.4 Perfil de cliente: historial, datos guardados
- [ ] 1.5 Recuperación de contraseña
- [ ] **Criterio de éxito**: Un cliente puede registrarse, iniciar sesión, o pedir como invitado.

### Fase 2: Catálogo y carta digital (Días 7-10)
- [ ] 2.1 Modelo de datos: categorías, productos, variantes (adicionales, cremas, bebidas)
- [ ] 2.2 API CRUD de productos (admin)
- [ ] 2.3 Frontend: carta visual tipo fast food con categorías
- [ ] 2.4 Personalizaciones: observaciones, adicionales, cremas por producto
- [ ] 2.5 Búsqueda y filtros en la carta
- [ ] **Criterio de éxito**: El cliente ve la carta completa, puede personalizar su pedido.

### Fase 3: Carrito y pedidos (Días 11-15)
- [ ] 3.1 Carrito de compras (session/localStorage para invitados, DB para registrados)
- [ ] 3.2 Flujo de pedido: carrito → resumen → confirmar
- [ ] 3.3 Selección de método de pago (online vs contra entrega)
- [ ] 3.4 Integración con Stripe (pago online)
- [ ] 3.5 Pago contra entrega (solo clientes registrados)
- [ ] 3.6 Historial de pedidos para el cliente
- [ ] **Criterio de éxito**: Pedido completo pasando por carrito, pago y confirmación.

### Fase 4: Stock en tiempo real (Días 16-18)
- [ ] 4.1 Sistema de stock con WebSockets
- [ ] 4.2 Al reducirse stock disponible, actualización en vivo en la carta
- [ ] 4.3 Alertas de stock bajo (admin)
- [ ] 4.4 Gestión de inventario desde panel admin
- [ ] **Criterio de éxito**: Si un producto se agota, desaparece de la carta en tiempo real.

### Fase 5: Cocina y caja — Comandas (Días 19-21)
- [ ] 5.1 Panel de cocina: pedidos entrantes en tiempo real
- [ ] 5.2 Impresión de comanda en cocina (WebSocket → ESC/POS)
- [ ] 5.3 Impresión de comanda en caja (ticket resumen)
- [ ] 5.4 Estados del pedido: pendiente → en cocina → listo → entregado
- [ ] 5.5 Notificaciones al cliente del estado del pedido (web + WhatsApp)
- [ ] **Criterio de éxito**: Un pedido nuevo aparece en cocina, se imprime, y al marcarlo listo el cliente recibe notificación.

### Fase 6: WhatsApp — Pedido por chat (Días 22-25)
- [ ] 6.1 Integración con WhatsApp Cloud API
- [ ] 6.2 Bot que responde al cliente con link a formulario web
- [ ] 6.3 Flujo completo: mensaje → link → pedido → confirmación por WhatsApp
- [ ] 6.4 Plantillas de mensajes aprobadas por Meta
- [ ] **Criterio de éxito**: Cliente escribe a WhatsApp, recibe link, hace pedido, recibe confirmación.

### Fase 7: Panel de administración (Días 26-30)
- [ ] 7.1 Dashboard con métricas: pedidos/día, ingresos, productos más vendidos
- [ ] 7.2 Gestión de productos: alta, baja, modificación, precios
- [ ] 7.3 Gestión de pedidos: ver, filtrar, cambiar estado
- [ ] 7.4 Gestión de clientes: listado, historial
- [ ] 7.5 Gestión de stock: ajuste manual, alertas
- [ ] 7.6 Reportes exportables (PDF/CSV)
- [ ] **Criterio de éxito**: Admin puede gestionar todo el restaurante desde el panel.

### Fase 8: Sistema Multiagente + RAG (Días 31-38) ⭐
- [ ] 8.1 Diseñar arquitectura RAG + agentes
- [ ] 8.2 AGENTS.md: definir agentes del sistema (Predictor, Recomendador, Analítico)
- [ ] 8.3 SOUL.md: personalidad y tono del sistema
- [ ] 8.4 TOOLS.md: herramientas de cada agente
- [ ] 8.5 Sistema de memoria (interacciones, preferencias, historial)
- [ ] 8.6 Motor de recomendaciones basado en histórico del cliente
- [ ] 8.7 Predicción de pedido: "Este cliente probablemente pedirá X"
- [ ] 8.8 Análisis de horarios: picos de demanda, productos por franja horaria
- [ ] 8.9 (Opcional) Fine-tuning con datos de interacciones
- [ ] **Criterio de éxito**: El sistema sugiere productos con acierto >60% basado en histórico.

### Fase 9: UX/UI y experiencia de cliente (Días 39-42)
- [ ] 9.1 Diseño responsive mobile-first
- [ ] 9.2 Flujo reducido a 3 clics: elegir → personalizar → pedir
- [ ] 9.3 Micro-interacciones y feedback visual
- [ ] 9.4 Modo oscuro / branding personalizable
- [ ] 9.5 Optimización de rendimiento (Core Web Vitals)
- [ ] **Criterio de éxito**: Pedido completado en menos de 60 segundos en mobile.

### Fase 10: DevSecOps y QA (Días 43-47)
- [ ] 10.1 Tests unitarios (backend: modelos + servicios; frontend: componentes)
- [ ] 10.2 Tests de integración (API + DB)
- [ ] 10.3 Tests E2E (Playwright): flujo completo de pedido
- [ ] 10.4 Escaneo de seguridad (dependency audit, SAST)
- [ ] 10.5 GitHub Actions: CI completo (lint → test → build)
- [ ] 10.6 Configurar backups automáticos de BD
- [ ] 10.7 Documentación de API (OpenAPI/Swagger)
- [ ] **Criterio de éxito**: CI pasa con tests, cobertura >70%, sin vulnerabilidades críticas.

### Fase 11: Landing page y portfolio (Días 48-50)
- [ ] 11.1 Landing page del proyecto (gorDOS.app)
- [ ] 11.2 README.md profesional con badges, capturas, demo
- [ ] 11.3 Video demo funcional (30-60 seg)
- [ ] 11.4 Deploy a producción (VPS o Railway)
- [ ] **Criterio de éxito**: Proyecto público, funcional, con demo visible.

---

## 🎯 Milestones

| Milestone | Fecha estimada | ¿Qué incluye? |
|---|---|---|
| **MVP** | Día 15 | Catálogo + carrito + pedido + pago funcional |
| **Beta** | Día 30 | Stock en tiempo real + cocina + admin completo |
| **Release** | Día 42 | WhatsApp + RAG + UX pulido |
| **Portfolio** | Día 50 | Tests, seguridad, landing, documentación |

---

## 📊 Tablero Kanban

→ Se creará en GitHub Projects: `gorDOS — Kanban`

Columnas:
```
Backlog → To Do (Sprint) → In Progress → Review → Done
```

---

## 📝 Convenciones

- Commits: [Conventional Commits](GIT-CONVENTIONS.md)
- Ramas: `main` → `dev` → `feat/*`
- Code style: TypeScript estricto, ESLint + Prettier

---

## 🔮 Visión completa (post-MVP)

- App móvil (Flutter) consumiendo la misma API
- Notificaciones push
- Programa de fidelización con puntos
- Integración con Google Business Profile
- Multi-idioma (español, inglés, catalán)
- Multi-restaurante (una instancia por local)