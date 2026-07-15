# RCO 2.0 — implementación inicial

## Arquitectura

`search.js` conserva su API pública y el ranking anterior como fallback. Durante la carga inicial obtiene una sola vez `clinical-search-dictionary.json`, importa `clinical-search-engine.mjs`, construye índices normalizados en memoria y reutiliza la instancia y una caché acotada de resoluciones.

El motor ejecuta, en orden: normalización y corrección conservadora; extracción de expresiones, conceptos y negaciones; detección de intención, motivo, temporalidad, intensidad, contexto y urgencia; ranking clínico determinista; separación de resultado principal, relacionados, exámenes y medicamentos; sugerencias y explicación de confianza. La puntuación de confianza describe la calidad de recuperación y no una probabilidad médica o diagnóstica.

Si falla la descarga, el parseo o la inicialización del diccionario, la promesa se resuelve sin propagar el error y siguen activos el buscador y la resolución RCO anteriores.

## Contrato enriquecido

`window.IDBMedicalSearch.resolve()` y `window.IDBVita.resolve()` mantienen sus propiedades previas y añaden: `intent`, `concepts`, `primaryResult`, `relatedResults`, `exams`, `medications`, `rco`, `suggestions`, `explanation` y `confidence`.

## Casos obligatorios

| Consulta | Esperado | Resultado real |
|---|---|---|
| Me duele mucho la garganta al tragar y tengo fiebre | Dolor de garganta | Dolor de garganta |
| Tengo mucha sed, voy al baño a cada rato y he bajado de peso | Diabetes | Diabetes |
| Desde ayer me cuesta respirar y siento presión en el pecho | Dolor de pecho o falta de aire; alarma | Dolor de pecho; alarma detectada |
| Me duele el estómago después de comer y siento ardor | Gastritis o acidez | Acidez |
| Hace varios días tengo dolor fuerte en la parte baja de la espalda | Dolor de espalda | Dolor de espalda |
| ¿Para qué sirve la ferritina que me pidió el médico? | Ferritina | Ferritina |
| Me van a hacer una resonancia de rodilla, ¿en qué consiste? | Resonancia magnética de rodilla | Resonancia magnética de rodilla |
| Tengo dolor en los huesos desde hace semanas | Dolor corporal o articular; nunca medicamento | Dolor articular |
| Mi mamá tiene la presión alta y le pidieron un MAPA | MAPA | Monitoreo ambulatorio de presión arterial (MAPA) |
| Quiero saber cómo es una colonoscopia y si requiere preparación | Colonoscopia | Colonoscopia |
| No tengo fiebre, pero me duele la garganta | Dolor de garganta; fiebre negada | Dolor de garganta; fiebre negada |
| ¿Para qué sirve el ibuprofeno? | Ibuprofeno | Ibuprofeno |

## Rendimiento y pruebas

- Carga local inicial, parseo e indexación: 13.41 ms.
- Inicialización exclusiva del motor: 6.72 ms.
- Resolución promedio de 300 ejecuciones: 1.11 ms.
- Índice interno: 211 registros y 1,838 expresiones.
- Regresión de títulos canónicos: 185/185.
- Casos obligatorios desde el Home: 12/12.
- Errores JavaScript en navegador: 0.

Las cifras son mediciones locales de desarrollo y pueden variar según el dispositivo, almacenamiento y servidor de producción.

## Incidencias y siguientes pasos

No quedan incidencias bloqueantes en esta primera versión. Para una fase posterior se recomienda ampliar el corpus de pruebas con consultas anonimizadas reales, revisar los umbrales con métricas de relevancia y versionar cambios del diccionario junto con sus pruebas de regresión.
