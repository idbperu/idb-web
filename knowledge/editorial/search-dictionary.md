# Nucleo Semantico de Busqueda IDB MEDIC

## Proposito

El archivo `knowledge/catalogos/search-dictionary.json` define un diccionario semantico reutilizable para mejorar la interpretacion de consultas medicas en lenguaje natural dentro de IDB MEDIC.

Su objetivo es ayudar al buscador, al RCO y a VITA a reconocer expresiones populares, sintomas, enfermedades, medicamentos, contexto vulnerable, negaciones, urgencias, errores ortograficos, intenciones y sinonimos regionales sin modificar todavia la logica activa de `search.js`.

Este diccionario no diagnostica, no prescribe y no reemplaza el indice principal. Es una capa de normalizacion y enriquecimiento semantico.

## Como se usara en search.js

En una fase posterior, `search.js` podra cargar `knowledge/catalogos/search-dictionary.json` de forma asincrona y usarlo antes del ranking final para:

- Normalizar terminos populares a conceptos medicos.
- Detectar negaciones y evitar que sintomas negados dominen el resultado.
- Preservar contexto de paciente vulnerable, como pediatria, embarazo, lactancia o adulto mayor.
- Corregir errores ortograficos frecuentes.
- Identificar intenciones, como dosis, interacciones, uso orientativo o urgencia.
- Sugerir un `slug_sugerido` cuando la evidencia semantica sea suficiente.
- Enriquecer el scoring sin reemplazar `search-index.json`.

El flujo recomendado es:

1. Recibir consulta original.
2. Normalizar texto basico.
3. Buscar coincidencias en el diccionario.
4. Separar señales afirmadas, negadas, contexto e intencion.
5. Ajustar ranking y prioridad.
6. Resolver contra `search-index.json`.
7. Mantener fallback actual si no hay coincidencia confiable.

## Equivalencia, intencion y destino

Una equivalencia transforma una frase del usuario en un concepto normalizado. Ejemplo: `agruras` -> `acidez`.

Una intencion describe lo que la persona quiere hacer con la informacion. Ejemplo: `puedo tomar x` indica una consulta de seguridad sobre medicamento, no una orden para recomendarlo.

Un destino sugerido orienta el tipo de contenido a buscar. Puede ser `sintoma`, `enfermedad`, `medicamento`, `urgencia`, `contexto`, `examen` o `general`.

El `slug_sugerido` no debe tratarse como verdad absoluta. Es una pista de ranking que debe competir con el indice, aliases, keywords, sinonimos y fallback existentes.

## Reglas para no convertirlo en if/else

El diccionario debe consumirse como datos, no como una lista de condicionales manuales.

Reglas:

- No agregar un `if` nuevo por cada entrada.
- No escribir logica especifica por medicamento o sintoma salvo que sea una regla clinica transversal.
- Usar pesos como `prioridad`, `tipo`, `contexto` y `destino_sugerido`.
- Tratar las coincidencias como señales acumulables.
- Permitir que varias entradas influyan en una misma consulta.
- Separar motor semantico, ranking y renderizado.
- Mantener `search-index.json` como fuente de destinos publicos.

Ejemplo conceptual:

`no tengo fiebre pero tengo tos` debe producir:

- Sintoma negado: fiebre.
- Sintoma afirmado: tos.
- Destino sugerido: `tos`.
- Penalizacion del resultado `fiebre`.
- Preservacion de la frase original para contexto.

## Escalabilidad

El diccionario esta organizado por categorias para evitar una lista plana dificil de mantener:

- `lenguaje_popular`
- `sintomas`
- `enfermedades`
- `medicamentos`
- `contexto_paciente`
- `negaciones`
- `urgencias`
- `errores_ortograficos`
- `intenciones`
- `sinonimos_regionales`

Cada entrada mantiene la misma estructura:

- `termino`
- `normalizado`
- `tipo`
- `destino_sugerido`
- `slug_sugerido`
- `prioridad`
- `contexto`
- `notas`

Para escalar, se recomienda:

- Agregar nuevas entradas dentro de la categoria correcta.
- Mantener `termino` unico dentro de cada categoria.
- Usar `normalizado` como concepto estable.
- Evitar duplicar entradas si una equivalencia ya existe.
- Mantener `prioridad` entre 0 y 100.
- Usar `notas` para aclarar ambiguedades clinicas.
- Revisar que `slug_sugerido` exista cuando apunte a una ficha publica.

## Validacion de futuras entradas

Antes de aceptar cambios al diccionario, se debe validar:

- JSON valido con `jq`.
- Ausencia de terminos duplicados dentro de la misma categoria.
- Campos obligatorios presentes.
- `prioridad` numerica.
- `contexto` como arreglo.
- `destino_sugerido` coherente con el tipo de contenido.
- No incluir recomendaciones clinicas personalizadas.
- No incluir frases que indiquen dosis, tratamiento o prescripcion como respuesta final.
- No crear destinos que no existan sin documentarlos.

Tambien se recomienda probar consultas reales contra el buscador antes de activar el diccionario:

- `me arde la barriga`
- `no tengo fiebre pero tengo tos`
- `adulto mayor con tos`
- `bebe con fiebre`
- `puedo tomar ibuprofeno`
- `mezclar paracetamol con ibuprofeno`
- `parasetamol`
- `precion alta`

## Conexion futura con VITA

VITA debe consumir este diccionario como parte del Motor Clinico Unificado, no como un motor paralelo.

Uso esperado:

- Detectar intencion conversacional antes de responder.
- Preservar contexto vulnerable.
- Reconocer negaciones para no responder sobre sintomas descartados por el usuario.
- Elevar señales de alarma cuando existan.
- En consultas sobre medicamentos, combinar intencion, ficha OTC y protocolo VITA.
- Mantener el mismo destino que `consulta.html` mediante el RCO.

VITA no debe mostrar el diccionario al usuario ni citarlo como fuente. Debe usarlo internamente para entender mejor la consulta y luego responder con lenguaje claro, prudente y no prescriptivo.

## Estado

Este documento y el JSON asociado preparan la capa semantica. No activan cambios en `search.js`, `consulta.html`, `search-index.json`, VITA ni el diseno publico.
