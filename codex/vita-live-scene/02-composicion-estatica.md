# 02 — Composición estática

## Objetivo

Construir la composición editorial, asimétrica y responsive de `vita-live-scene` con VITA y los seis pacientes aprobados.

## Estado

Completado.

## Archivos modificados

- `components/vita-live-scene/demo.html`
- `components/vita-live-scene/vita-live-scene.css`
- `components/vita-live-scene/config.json`
- `components/vita-live-scene/README.md`
- `components/vita-live-scene/docs/direccion-artistica.md`
- `components/vita-live-scene/docs/decisiones.md`
- `codex/vita-live-scene/02-composicion-estatica.md`

## Activos incorporados

- Seis copias intactas en `components/vita-live-scene/assets/personas/`.
- Una copia intacta de VITA en `components/vita-live-scene/assets/vita/`.
- Integridad comprobada mediante hashes SHA-256 coincidentes con las fuentes.

## Validaciones realizadas

- Presencia de los siete activos.
- Composición responsive en desktop, tablet y mobile.
- Ausencia de enlaces o botones sobre pacientes.
- Ausencia de comportamiento visual en JavaScript.
- Ausencia de overflow horizontal, errores JavaScript y cortes incorrectos de rostros.
- JSON válido y `git diff --check` correcto.

## Pendientes para Motion System

- Definir estados futuros respetando `prefers-reduced-motion`.
- Evaluar tiempos, easing y rendimiento en una tarea independiente.
- No se implementó movimiento en esta fase.
