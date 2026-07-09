# Roadmap VITA y Nucleo Semantico de Busqueda

## Objetivo

Este documento describe como el Nucleo Semantico de Busqueda podra evolucionar progresivamente hacia una mejor experiencia conversacional de VITA sin crear un segundo motor clinico y sin duplicar logica de `search.js`.

El principio rector es: VITA debe seguir siendo una capa conversacional del RCO. La interpretacion semantica, la resolucion de slugs, el ranking, los aliases, las negaciones y el fallback deben provenir del mismo motor reutilizable.

## Autocompletado inteligente

El diccionario `knowledge/catalogos/search-dictionary.json` podra enriquecer el autocompletado con:

- Correcciones ortograficas frecuentes.
- Lenguaje popular y regional.
- Sinonimos clinicos.
- Contexto vulnerable preservado.
- Sugerencias por intencion, no solo por coincidencia literal.

Ejemplos esperados:

- `me arde la barriga` -> sugerir acidez, gastritis o reflujo segun ranking.
- `parasetamol` -> sugerir paracetamol.
- `adulto mayor con tos` -> sugerir tos manteniendo contexto de adulto mayor.

## Respuestas conversacionales de VITA

VITA podra usar la salida semantica del RCO para adaptar el tono y el foco de la respuesta:

- Si hay una urgencia, priorizar seguridad.
- Si hay negacion, no responder sobre sintomas negados.
- Si hay contexto pediatrico, embarazo, lactancia o adulto mayor, reforzar consulta profesional.
- Si hay intencion medicamentosa, usar protocolo OTC y plantillas seguras.
- Si hay consulta general, derivar al contenido de `consulta.html` o a una respuesta educativa breve.

VITA no debe mostrar el diccionario ni usarlo como fuente visible. Debe usarlo como capa interna de comprension.

## Deteccion de intencion

Las intenciones futuras pueden agruparse en:

- Uso orientativo: `para que sirve X`.
- Seguridad: `puedo tomar X`.
- Dosis: `dosis de X`.
- Interacciones: `mezclar X con Y`.
- Sintoma: `tengo X`, `me duele X`, `me arde X`.
- Urgencia: `no puedo respirar`, `dolor de pecho`, `desmayo`.
- Resultado o examen: `salio alto`, `positivo`, `que significa`.

La intencion debe ajustar el ranking, no reemplazar el indice.

## Deteccion de gravedad

El diccionario permite detectar terminos de alarma, pero la respuesta final debe seguir reglas clinicas prudentes:

- Urgencia vital: responder primero con ruta de atencion.
- Alarma moderada: recomendar consulta pronta.
- Sin alarma: orientar de forma educativa.

La gravedad debe considerar combinaciones:

- Sintoma + contexto vulnerable.
- Medicamento + sobredosis.
- Dolor + localizacion critica.
- Negacion + sintoma positivo.

## Analytics de consultas

Una fase futura puede registrar eventos anonimos para mejorar el diccionario:

- Consulta original.
- Terminos normalizados.
- Intencion detectada.
- Resultado seleccionado.
- Sin resultado.
- Correccion aplicada.
- Contexto vulnerable detectado.
- Senal de urgencia detectada.

Estos eventos deben excluir datos personales identificables y usarse solo para calidad, seguridad y mejora editorial.

## SEO medico basado en lenguaje popular

El diccionario tambien puede orientar contenidos SEO:

- Identificar frases populares con alta demanda.
- Conectar lenguaje cotidiano con slugs clinicos existentes.
- Crear nuevas fichas si hay consultas frecuentes sin cobertura.
- Mejorar titulos, keywords y aliases sin duplicar contenido.

Ejemplos:

- `agruras` puede fortalecer contenido de acidez/reflujo.
- `precion alta` puede derivar a hipertension y sintomas de presion alta.
- `curso` puede orientar contenido regional sobre diarrea.

## Reglas de arquitectura

- No crear motor conversacional separado.
- No duplicar `search-index.json`.
- No hardcodear entradas del diccionario en `search.js`.
- No convertir el diccionario en una cadena de `if/else`.
- Mantener fallback si el diccionario falla.
- Mantener compatibilidad con GitHub Pages.
- Versionar cambios del diccionario y validar duplicados antes de publicar.

## Proxima fase sugerida

La siguiente fase recomendada es crear pruebas automatizadas para:

- Ranking semantico.
- Negaciones.
- Contexto vulnerable.
- Correcciones ortograficas.
- Consultas de medicamentos OTC.
- Resolucion VITA/RCO equivalente.
- Fallback cuando el diccionario no esta disponible.
