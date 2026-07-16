# vita-live-scene

Nombre oficial del módulo: `vita-live-scene`.

## Objetivo

Crear una escena viva de atención de VITA con seis fotografías reales de pacientes.

El módulo se plantea como un componente independiente y reutilizable. Todavía no está integrado al Home.

## Estado actual

Composición estática editorial (`0.2.0`). El módulo continúa sin integrarse al Home y no contiene movimiento ni interacción.

## Archivos y carpetas

- `assets/personas/`: copias de trabajo intactas de los seis retratos aprobados.
- `assets/vita/`: copia de trabajo intacta de la imagen central oficial de VITA.
- `assets/background/`, `assets/icons/` y `assets/mockups/`: ubicaciones reservadas para recursos futuros.
- `docs/`: decisiones, dirección artística, sistema de movimiento y validación.
- `demo.html`: composición estática independiente y responsive.
- `config.json`: configuración inicial del módulo.
- `vita-live-scene.css`: estilos locales aislados de la composición.
- `vita-live-scene.js`: inicialización segura del módulo.

## Activos incorporados

Los siete archivos se copiaron sin conversión ni recompresión:

- `imagenes/vita/vita-card-01-costa-mayor.webp` → `assets/personas/paciente-01.webp`
- `imagenes/vita/vita-card-02-sierra-padre.webp` → `assets/personas/paciente-02.webp`
- `imagenes/vita/vita-card-03-selva-madre.webp` → `assets/personas/paciente-03.webp`
- `imagenes/vita/vita-card-04-costa-profesional.webp` → `assets/personas/paciente-04.webp`
- `imagenes/vita/vita-card-05-sierra-mayor.webp` → `assets/personas/paciente-05.webp`
- `imagenes/vita/vita-card-06-selva-joven.webp` → `assets/personas/paciente-06.webp`
- `imagenes/vita/vita-4.webp` → `assets/vita/vita-central.webp`
