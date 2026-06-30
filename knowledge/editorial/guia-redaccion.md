# Guia de Redaccion IDB

Esta guia convierte el Manual Editorial IDB en reglas practicas para crear o revisar contenidos medicos en la Knowledge Base.

## Flujo Antes de Escribir

1. Identificar el tipo de contenido: medicamento, sintoma, enfermedad, examen, procedimiento, prevencion o bienestar.
2. Preguntar: que espera saber realmente un paciente?
3. Definir que necesita entender en los primeros 15 segundos.
4. Revisar si ya existe un tema similar para evitar duplicados.
5. Redactar dentro de los campos de `tema.schema.json`.
6. Aplicar el checklist de calidad antes de guardar.

## Campos del Modelo

### titulo

Debe usar el nombre mas comprensible para pacientes. Evitar tecnicismos cuando exista una forma comun y segura.

### descripcion

Resumen claro del tema. Debe ayudar al usuario a decidir si el resultado responde a su busqueda.

### respuesta_rapida

Debe entregar orientacion en 2 a 4 lineas. No debe diagnosticar ni cerrar la consulta.

Para sintomas, comenzar indicando que puede tener varias causas.

Para medicamentos, explicar su uso general sin dosis.

Para enfermedades, explicar que ocurre y por que requiere seguimiento.

### para_que_sirve

Usar este campo para explicar utilidad o significado segun el tipo:

- Medicamento: para que se usa de forma general.
- Sintoma: que puede representar o que orienta observar.
- Enfermedad: que implica para la salud.
- Examen: que ayuda a evaluar.

### causas

Usar solo cuando aplique. En sintomas y enfermedades debe incluir causas frecuentes sin afirmar diagnosticos.

### sintomas

En enfermedades, listar sintomas frecuentes. En sintomas, usar solo si ayuda a describir manifestaciones asociadas.

### factores_riesgo

Explicar condiciones que pueden aumentar la probabilidad, sin presentar destino inevitable.

### prevencion

Incluir medidas generales, educativas y seguras. No prometer prevencion absoluta.

### cuando_consultar

Debe ser especifico para el tema. Evitar frases genericas copiadas. Orientar a consulta cuando el cuadro sea intenso, persistente, recurrente, empeore o genere dudas.

### senales_alarma

Debe ser breve, clara y prioritaria. Indicar buscar atencion inmediata ante signos graves.

### precauciones

Para medicamentos, incluir alergias, embarazo, interacciones, enfermedades relevantes, ninos, adultos mayores y condiciones especiales cuando corresponda.

Para sintomas y enfermedades, incluir acciones seguras y limites de la orientacion.

### preguntas_frecuentes

Maximo 5. Deben responder dudas reales de pacientes, no repetir el cuerpo principal.

### temas_relacionados

Relacionar sintomas, enfermedades, medicamentos, prevencion o examenes sin convertir esas relaciones en diagnosticos.

### fuentes

Incluir fuentes cientificas u oficiales reconocidas. No copiar texto literal.

## Medicamentos

Estructura recomendada:

1. Que es.
2. Para que sirve.
3. Como actua explicado con sencillez.
4. Cuando suele utilizarse.
5. Precauciones importantes.
6. Quienes deben consultar antes.
7. Senales de alarma.
8. Preguntas frecuentes.

Evitar:

- Dosis.
- Marcas comerciales.
- "Tomar cada..."
- "Sirve para curar..."
- "Es seguro para todos..."

Mejor:

> Este medicamento se utiliza para aliviar ciertos sintomas o tratar condiciones especificas bajo orientacion profesional. Su uso debe considerar antecedentes, otros medicamentos y situaciones como embarazo o alergias.

## Sintomas

Estructura recomendada:

1. Explicar que puede tener multiples causas.
2. Mencionar causas frecuentes y leves cuando aplique.
3. Indicar que observar.
4. Indicar cuando consultar.
5. Mencionar senales de alarma.
6. Relacionar posibles temas sin diagnosticar.

Evitar:

> Puede ser gastritis.

Mejor:

> El dolor de estomago puede aparecer por digestion pesada, irritacion gastrica, infecciones, medicamentos u otras causas. Si es intenso, frecuente o se acompana de signos de alarma, conviene consultar.

## Enfermedades

Estructura recomendada:

1. Explicar que ocurre en el organismo.
2. Explicar causas o mecanismos habituales.
3. Incluir factores de riesgo.
4. Describir sintomas frecuentes.
5. Explicar diagnostico y seguimiento de forma general.
6. Incluir prevencion y senales de alarma.

Evitar:

- Afirmar que todos los pacientes evolucionan igual.
- Prometer curacion.
- Sustituir control profesional.

## Tono y Vocabulario

Preferir:

- "Puede estar relacionado con..."
- "Conviene consultar si..."
- "Un profesional puede evaluar..."
- "La interpretacion depende del contexto clinico..."

Evitar:

- "Seguro es..."
- "No es grave..."
- "Debes tomar..."
- "Se cura con..."
- "No necesitas consultar..."

## Lectura Mobile First

Cada bloque debe poder leerse en celular sin fatiga:

- Parrafos de 2 a 4 lineas.
- Ideas concretas.
- Sin listas extensas innecesarias.
- Sin lenguaje tecnico acumulado.
- La informacion critica debe aparecer temprano.

## Revision Final

Antes de guardar un JSON, aplicar `knowledge/editorial/checklist-calidad.md` y validar con `tools/knowledge-builder.js`.
