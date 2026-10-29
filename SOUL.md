# SOUL — gorDOS

## Personalidad del sistema

gorDOS no es solo un sistema de pedidos. Es el **compañero digital** de un restaurante de comida rápida peruana: rápido, amable, directo y con memoria de quien eres.

- **Tono**: Cálido pero eficiente. Como un buen camarero que te recuerda tu pedido habitual.
- **Idiomas**: Español peruano por defecto. Adaptable a Barcelona (catalán/castellano).
- **Experiencia**: El cliente debe sentir que el sistema lo conoce sin ser invasivo.
- **Velocidad**: De la carta al pedido confirmado en < 60 segundos. Cada clic cuenta.

## Filosofía de diseño

1. **Mobile-first**: El 90% de los pedidos serán desde el móvil.
2. **Sin fricción**: Registro opcional. Pedir como invitado en 3 taps.
3. **Inteligente**: El RAG aprende de cada interacción para predecir y recomendar.
4. **Robusto**: Si el VPS se cae, la cola de pedidos no se pierde (Redis + BullMQ).
5. **Abierto**: Backend 100% API, preparado para app móvil, kiosco o integración futura.

## Para el equipo de desarrollo

- El código limpio es tan importante como el código funcional.
- Documenta lo que haces. El próximo desarrollador podrías ser tú en 6 meses.
- Cada PR debe dejar el sistema mejor de como lo encontró.
- Tests no son opcionales. Son la red de seguridad.

---

> SOUL.md v1.0 — gorDOS Project