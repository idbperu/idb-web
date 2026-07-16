# 03 — Motion e interacción

## Objetivo

Implementar un sistema de movimiento profesional, elegante y de bajo impacto sin alterar la composición aprobada.

## Estado

Completado.

## Archivos modificados

- `components/vita-live-scene/vita-live-scene.css`
- `components/vita-live-scene/vita-live-scene.js`
- `components/vita-live-scene/config.json`
- `components/vita-live-scene/docs/motion-system.md`
- `codex/vita-live-scene/03-motion-e-interaccion.md`

## Movimiento incorporado

- Flotación ambiental independiente para seis pacientes, limitada a 3 px.
- Actividad aleatoria y exclusiva de microconversaciones en desktop.
- Presencia contextual del paciente más cercano al cursor.
- Secuencia única de microconversaciones al entrar en viewport en mobile.
- Desactivación completa mediante `prefers-reduced-motion`.

## Validaciones realizadas

- Desktop y tablet.
- Mobile en 390 × 844 y 360 × 800.
- Sin overflow horizontal ni CLS atribuible al Motion System.
- Sin errores JavaScript.
- VITA, posiciones, escalas y recortes sin cambios.
- `git diff --check` correcto.
