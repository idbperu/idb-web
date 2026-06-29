# Base de Conocimiento Oficial IDB

La carpeta `knowledge/` es la fuente unica de informacion para el Instituto Digital de Bienestar. Esta arquitectura esta preparada para alimentar el Buscador Medico, `consulta.html`, VITA, futuras APIs, asistentes y aplicaciones moviles sin crear paginas HTML por tema.

## Arquitectura

Cada tema vive como un archivo JSON independiente:

`knowledge/{categoria}/{slug}.json`

Ejemplos futuros:

- `knowledge/enfermedades/gastritis.json`
- `knowledge/medicamentos/ibuprofeno.json`
- `knowledge/sintomas/dolor-de-cabeza.json`
- `knowledge/examenes/hemograma.json`

El archivo `knowledge/manifest.json` declara categorias, rutas, version, esquema activo, conteo de registros y consumidores previstos.

## Categorias oficiales

- `enfermedades/`
- `sintomas/`
- `medicamentos/`
- `examenes/`
- `procedimientos/`
- `vacunas/`
- `prevencion/`
- `nutricion/`
- `actividad-fisica/`
- `salud-mental/`
- `adulto-mayor/`
- `salud-infantil/`
- `salud-mujer/`
- `salud-hombre/`
- `evidence/`

## Formato unico

Todos los temas usan el mismo esquema. `tema.schema.json` es la unica fuente de verdad para nombres de campos, tipos y campos obligatorios:

`knowledge/schema/tema.schema.json`

El modelo base esta en:

`knowledge/schema/modelo-tema.json`

La documentacion del modelo esta en:

`knowledge/schema/modelo-tema.md`

Campos obligatorios:

- `id`
- `slug`
- `titulo`
- `tipo`
- `categoria`
- `descripcion`
- `respuesta_rapida`
- `para_que_sirve`
- `causas`
- `sintomas`
- `factores_riesgo`
- `prevencion`
- `cuando_consultar`
- `senales_alarma`
- `precauciones`
- `preguntas_frecuentes`
- `temas_relacionados`
- `fuentes`
- `ultima_revision`
- `version`

## Como agregar un nuevo tema

1. Elegir la categoria oficial.
2. Crear un slug estable en minusculas y sin acentos.
3. Crear el archivo JSON en `knowledge/{categoria}/{slug}.json`.
4. Usar exactamente el esquema `knowledge/schema/tema.schema.json`.
5. Relacionar fuentes mediante el arreglo `fuentes`.
6. Actualizar `knowledge/manifest.json` incrementando el conteo de la categoria.

No se debe crear una pagina HTML para el tema.

## Evidencia

La evidencia vive en:

`knowledge/evidence/`

Cada registro futuro debe seguir:

`knowledge/evidence/schema-evidence.json`

Organizaciones previstas:

- OMS
- OPS
- MINSA
- INS
- EsSalud
- MedlinePlus
- CDC
- NIH
- FDA
- Sociedades cientificas

La evidencia puede asociarse a cualquier tema mediante `tema_id` o referencias dentro del arreglo `fuentes`.

## Flujo de consulta.html

`consulta.html` recibe `?q=slug`.

Flujo:

1. Carga `search-index.json` para resolver titulo, tipo, categoria y slug.
2. Construye la ruta `knowledge/{categoria}/{slug}.json`.
3. Intenta cargar el JSON de la Base de Conocimiento.
4. Si existe, renderiza la informacion de la KB.
5. Si no existe, usa `search-index.json` como respaldo.

Este flujo permite que el sitio empiece con el indice actual y migre progresivamente a la KB sin romper el buscador.

## VITA

VITA consumira la misma Base de Conocimiento:

1. Detecta intencion del usuario.
2. Normaliza el tema o slug.
3. Consulta `knowledge/manifest.json`.
4. Carga `knowledge/{categoria}/{slug}.json`.
5. Usa `fuentes` y `knowledge/evidence/` para respaldar respuestas.
6. Si no hay tema KB, puede usar el indice publico como respaldo temporal.

VITA no debe depender del DOM ni de paginas HTML. Debe consumir los mismos JSON reutilizables que `consulta.html` y futuras APIs.

## Escalabilidad

La arquitectura permite crecer a cientos o miles de archivos por categoria. `consulta.html` no necesita cambios para soportar 100 medicamentos, 500 medicamentos, 5 000 enfermedades o 20 000 articulos, siempre que cada registro respete la ruta y el esquema.

## Reglas

- No duplicar informacion.
- No crear paginas HTML por tema.
- No guardar contenido medico en archivos no estructurados.
- No mezclar datos de usuario con la KB publica.
- Mantener `search-index.json` como respaldo hasta que todos los temas migren a `knowledge/`.
- No usar alias de campos. Todos los nombres deben coincidir exactamente con `knowledge/schema/tema.schema.json`.
