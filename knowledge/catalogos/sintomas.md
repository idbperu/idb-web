# Catalogo Maestro Oficial de Sintomas IDB

Este catalogo define los sintomas base que usara el Instituto Digital de Bienestar para busqueda, consulta dinamica, VITA, SEO, futuras APIs y generacion posterior de archivos individuales en `knowledge/sintomas/`.

No reemplaza los JSON completos de cada sintoma. Su funcion es servir como indice maestro, control de duplicados y fuente de sinonimos en lenguaje de pacientes.

## Archivo Principal

`knowledge/catalogos/sintomas.json`

## Objetivo

Reunir los 200 sintomas mas consultados por pacientes en Peru y Latinoamerica usando lenguaje cotidiano.

Ejemplos de lenguaje esperado:

- `dolor de cabeza`
- `dolor de estomago`
- `me duele la barriga`
- `falta de aire`
- `corazon acelerado`
- `me arde al orinar`

Se deben evitar terminos excesivamente tecnicos como titulo principal. Los terminos tecnicos pueden ir en `sinonimos` si ayudan a la busqueda.

## Estructura de Cada Registro

Cada registro contiene:

- `id`: identificador unico del catalogo.
- `slug`: version estable para URL y generacion futura de JSON.
- `titulo`: nombre visible, escrito para pacientes.
- `sinonimos`: formas reales en que una persona podria buscar el sintoma.
- `categoria`: grupo editorial del sintoma.
- `prioridad`: nivel de relevancia para busqueda y generacion.
- `relacionado_con`: enfermedades, condiciones, sistemas o temas vinculados.
- `tipo`: siempre `sintoma`.
- `estado`: estado editorial del registro.

## Prioridad

Usar una escala de 1 a 4:

- `1`: sintoma frecuente, critico o con potencial urgencia.
- `2`: sintoma frecuente que requiere buena orientacion.
- `3`: sintoma comun, usualmente menos urgente.
- `4`: sintoma especifico o menos frecuente.

La prioridad ayuda a ordenar resultados del buscador y decidir que JSON individuales se generaran primero.

## Como Agregar Sintomas

1. Confirmar que el sintoma no exista como `titulo`, `slug` o `sinonimo`.
2. Usar un `titulo` en lenguaje de paciente.
3. Crear un `slug` unico, sin acentos, en minusculas y con guiones.
4. Agregar sinonimos reales y variantes frecuentes.
5. Asignar categoria y prioridad.
6. Agregar temas relacionados sin diagnosticar.
7. Mantener `tipo` como `sintoma`.
8. Usar `estado: catalogado` cuando el registro ya este listo para el indice.

## Como Evitar Duplicados

Antes de agregar un sintoma, revisar:

- `slug`
- `titulo`
- `sinonimos`

Ejemplo:

`Dolor de estomago` y `Dolor abdominal` no deben ser dos registros principales si representan la misma busqueda del paciente. Uno debe ser titulo principal y el otro sinonimo, salvo que exista una razon editorial para diferenciarlos.

## Sinonimos

Los sinonimos deben capturar lenguaje real:

- palabras populares
- errores comunes de expresion
- frases completas
- terminos medicos frecuentes solo si el paciente los usa

Ejemplo:

Titulo: `Dolor de estomago`

Sinonimos:

- `dolor abdominal`
- `me duele el estomago`
- `malestar estomacal`

## Relacion con Enfermedades y Medicamentos

El campo `relacionado_con` no diagnostica. Solo permite crear enlaces futuros hacia:

- enfermedades
- medicamentos
- examenes
- especialidades
- temas preventivos

Ejemplo:

`dolor de estomago` puede relacionarse con:

- `gastritis`
- `gases`
- `diarrea`

Esto no significa que el paciente tenga esas condiciones. Solo ayuda a busqueda, navegacion y VITA.

## Generacion Futura de JSON Individuales

Cada registro del catalogo podra convertirse despues en:

`knowledge/sintomas/{slug}.json`

Ese archivo individual debera seguir:

`knowledge/schema/tema.schema.json`

El catalogo no debe duplicar contenido medico completo. Solo conserva identificacion, sinonimos, categoria, prioridad y relaciones.

## Uso por el Buscador

El buscador podra usar:

- `titulo`
- `sinonimos`
- `categoria`
- `prioridad`
- `relacionado_con`

Esto permite encontrar sintomas aunque el paciente escriba de forma distinta.

## Uso por consulta.html

`consulta.html` no debe leer este catalogo como contenido medico final. El flujo esperado es:

1. Resolver el sintoma con el catalogo o `search-index.json`.
2. Buscar el JSON individual en `knowledge/sintomas/{slug}.json`.
3. Si no existe, usar respaldo temporal.

## Uso por VITA

VITA podra usar este catalogo para:

- identificar intencion del paciente
- normalizar sinonimos
- sugerir temas relacionados
- decidir cuando buscar el JSON individual del sintoma
- mantener respuestas consistentes con la KB

VITA no debe diagnosticar usando solo el catalogo.

## Estados Editoriales

Estados recomendados:

- `catalogado`: registro listo para busqueda y generacion futura.
- `pendiente_revision`: requiere revision editorial.
- `fusionar`: posible duplicado que debe unificarse.
- `archivado`: no debe usarse en resultados activos.

## Reglas

- No crear HTML por sintoma.
- No incluir dosis ni tratamientos.
- No convertir relaciones en diagnosticos.
- No duplicar sintomas por sinonimos.
- Mantener lenguaje claro para pacientes.
- Mantener compatibilidad con `tema.schema.json`.
