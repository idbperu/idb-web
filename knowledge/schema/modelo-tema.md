# Modelo Maestro de Contenido Medico IDB

`tema.schema.json` es la unica fuente de verdad del modelo de contenido de la Base de Conocimiento IDB.

Este documento explica como llenar los campos definidos en:

`knowledge/schema/tema.schema.json`

La plantilla editable esta en:

`knowledge/schema/modelo-tema.json`

## Objetivo

Todos los temas deben usar exactamente los mismos nombres de campos, sin alias ni duplicados. El mismo modelo debe servir para medicamentos, enfermedades, sintomas, examenes, procedimientos, vacunas y contenidos de bienestar.

Ejemplos compatibles:

- Ibuprofeno
- Diabetes
- Dolor de pecho
- Hemograma
- Hipertension

## Reglas Editoriales

- Usar lenguaje para pacientes.
- Evitar tecnicismos innecesarios.
- No indicar dosis.
- No prescribir tratamientos.
- No reemplazar una consulta medica.
- No presentar diagnosticos cerrados.
- Recomendar consulta profesional cuando corresponda.
- Mantener respuestas breves y reutilizables.

## Campos Obligatorios

Todos los campos declarados como `required` en `tema.schema.json` son obligatorios. Si un campo no aplica, debe mantenerse como texto vacio, arreglo vacio o respuesta orientativa segura segun corresponda.

## Campos del Schema Oficial

### `id`

Identificador unico del tema dentro de la KB.

Ejemplo: `med-ibuprofeno`

### `slug`

Identificador para URL, busqueda y carga dinamica. Debe ir en minusculas, sin acentos y con guiones.

Ejemplo: `ibuprofeno`

### `titulo`

Nombre visible del tema.

Ejemplo: `Ibuprofeno`

### `tipo`

Tipo principal del contenido.

Valores permitidos por el schema:

- `enfermedad`
- `sintoma`
- `medicamento`
- `examen`
- `procedimiento`
- `vacuna`
- `prevencion`
- `nutricion`
- `actividad-fisica`
- `salud-mental`
- `adulto-mayor`
- `salud-infantil`
- `salud-mujer`
- `salud-hombre`
- `bienestar`

### `categoria`

Agrupacion editorial o clinica del contenido.

Ejemplos:

- `Medicamentos`
- `Sistema digestivo`
- `Salud cardiovascular`
- `Laboratorio`

### `descripcion`

Explicacion sencilla para pacientes. Debe responder que es el tema o dar el contexto minimo para entenderlo.

Equivale al bloque visual "¿Que es?" cuando `consulta.html` o VITA necesiten mostrar esa seccion.

### `respuesta_rapida`

Respuesta principal en 2 a 4 lineas. Debe permitir que el paciente entienda lo esencial en pocos segundos.

No debe incluir dosis, prescripciones ni diagnosticos definitivos.

### `para_que_sirve`

Campo adaptable por tipo:

- Medicamentos: uso general.
- Sintomas: que puede significar.
- Enfermedades: que implica o que debe vigilarse.
- Examenes: para que sirve y que informacion puede aportar.
- Prevencion/bienestar: objetivo practico del contenido.

### `causas`

Texto breve sobre causas, origen o factores que pueden explicar el tema cuando aplique.

Si no aplica, mantener texto vacio.

### `sintomas`

Arreglo de sintomas o manifestaciones relacionadas.

Usar frases breves. No diagnosticar.

### `factores_riesgo`

Arreglo de factores que pueden aumentar probabilidad, complicaciones o necesidad de seguimiento.

### `prevencion`

Arreglo de medidas preventivas generales y seguras.

No debe contener tratamientos personalizados.

### `cuando_consultar`

Orientacion clara sobre cuando buscar apoyo profesional.

Debe ser prudente, no alarmista y especifica al tipo de contenido.

### `senales_alarma`

Situaciones en las que se debe buscar atencion inmediata.

Puede usar texto general cuando el tema aun no tenga senales especificas validadas.

### `precauciones`

Arreglo de puntos breves con advertencias seguras.

En medicamentos, no indicar dosis ni reemplazar indicacion profesional.

### `preguntas_frecuentes`

Arreglo con maximo 5 preguntas frecuentes. Cada item debe tener:

- `pregunta`
- `respuesta`

Las respuestas deben ser breves, educativas y no prescriptivas.

### `temas_relacionados`

Arreglo de temas vinculados. Cada item debe incluir:

- `id`
- `slug`
- `categoria`
- `titulo`

Debe ayudar a navegar hacia contenido complementario sin duplicar informacion.

### `fuentes`

Arreglo de fuentes usadas para respaldar el tema. Cada fuente puede incluir:

- `id`
- `organizacion`
- `titulo`
- `url`
- `tipo`

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

### `ultima_revision`

Fecha de revision editorial en formato `AAAA-MM`.

Ejemplo: `2026-06`

### `version`

Version del contenido.

Ejemplo: `1.0`

## Compatibilidad con consulta.html

`consulta.html` debe leer un tema con los nombres definidos por `tema.schema.json`.

Campos que puede usar directamente:

- `titulo`
- `descripcion`
- `respuesta_rapida`
- `para_que_sirve`
- `cuando_consultar`
- `senales_alarma`
- `precauciones`
- `preguntas_frecuentes`
- `temas_relacionados`
- `fuentes`

Si un tema aun no existe en la KB, `consulta.html` puede usar `search-index.json` como respaldo temporal.

## Compatibilidad con VITA

VITA debe consumir los mismos JSON de la KB y los mismos nombres del schema oficial.

Flujo futuro:

1. Identificar intencion del usuario.
2. Resolver `slug` y `categoria`.
3. Cargar `knowledge/{categoria}/{slug}.json`.
4. Responder usando solo campos definidos en `tema.schema.json`.
5. Citar `fuentes` cuando esten disponibles.
6. Derivar a urgencias o consulta profesional cuando corresponda.

## Compatibilidad con APIs Futuras

Las APIs futuras deben exponer o transformar este mismo modelo, no crear nombres alternativos.

Regla: todos los nombres de campos deben coincidir exactamente con `tema.schema.json`.

## Como Crear un Tema Nuevo

1. Copiar `knowledge/schema/modelo-tema.json`.
2. Guardarlo en la categoria correspondiente.
3. Renombrarlo con el slug.
4. Completar todos los campos definidos por `tema.schema.json`.
5. Mantener maximo 5 preguntas frecuentes.
6. Registrar fuentes en `fuentes`.
7. Actualizar `knowledge/manifest.json` cuando el tema este aprobado.

No se debe crear una pagina HTML individual para el tema.
