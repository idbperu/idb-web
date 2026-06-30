# Evidence Knowledge Base

Esta carpeta contiene la arquitectura para asociar evidencia cientifica a cualquier tema del ecosistema IDB.

## Archivos

- `schema-evidence.json`: define la estructura minima de un registro de evidencia.
- `ejemplo-evidence.json`: muestra un registro de ejemplo sin contenido medico definitivo.

## Uso previsto

Cada registro de evidencia se conecta con un tema mediante `tema_id`. Asi, una enfermedad, sintoma, medicamento, examen o recurso puede tener una o varias fuentes asociadas sin duplicar contenido.

## Reutilizacion

- Buscador: podra mostrar fuente, nivel de evidencia y enlaces relevantes.
- Recursos: podra agrupar documentos institucionales, guias y articulos.
- Temas: podra respaldar recomendaciones y secciones informativas.
- VITA: podra recuperar evidencia validada para orientar respuestas futuras.
- Futuras APIs: podran exponer registros filtrados por tema, organizacion, idioma, estado o tipo.

## Estado

No contiene contenido medico final. Es una base estructural para carga y validacion posterior.
