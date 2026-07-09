# Estandar de la Base OTC Certificada IDB MEDIC

Este documento define la base tecnica y editorial para una futura capa de medicamentos OTC certificados dentro de IDB MEDIC. No reemplaza las fichas existentes de `knowledge/medicamentos/` y no habilita todavia la publicacion automatica de nuevos medicamentos.

## Objetivo de la Base OTC

La Base OTC Certificada tiene como objetivo registrar medicamentos de venta libre con estructura uniforme, trazabilidad a fuentes oficiales y reglas clinicas de seguridad. Su funcion es apoyar orientacion educativa dentro de IDB MEDIC, `consulta.html`, VITA, buscadores internos y futuras APIs, manteniendo separada la informacion certificada OTC de las fichas generales actuales.

La capa OTC debe permitir:

- Validar registros con `knowledge/schema/otc-medicamento.schema.json`.
- Identificar principio activo, categoria OTC, presentaciones y restricciones de seguridad.
- Mostrar orientacion general sin convertirla en prescripcion.
- Relacionar un registro OTC con una ficha existente mediante `slug` cuando corresponda.
- Preparar integracion futura con busqueda, RCO, VITA y experiencias moviles.

## Informacion Orientativa vs Prescripcion Medica

La informacion orientativa explica usos generales, precauciones, senales de alarma y situaciones donde conviene consultar. Ayuda a que una persona entienda mejor un producto y sus riesgos generales.

La prescripcion medica decide si una persona concreta debe usar un medicamento, en que dosis, por cuanto tiempo, con que seguimiento y considerando su historia clinica.

La Base OTC no debe:

- Diagnosticar al usuario.
- Indicar que un medicamento es adecuado para una persona especifica.
- Sustituir consulta medica, farmaceutica o indicacion profesional.
- Recomendar iniciar, suspender, cambiar o combinar tratamientos.
- Personalizar dosis por edad, peso, enfermedad, embarazo, lactancia o medicamentos concomitantes.
- Promover marcas comerciales por encima de principios activos o seguridad.

## Reglas de Seguridad Clinica

Todo registro OTC certificado debe cumplir estas reglas antes de pasar a `estado_validacion: "validado"`:

- Usar lenguaje claro, sereno y apto para pacientes.
- Incluir situaciones de `no_usar_si` cuando la fuente oficial las describa.
- Incluir `precauciones`, `interacciones_relevantes` y `senales_alarma`.
- Marcar embarazo/lactancia, pediatria y adulto mayor como grupos que requieren consulta previa.
- Evitar dosis individualizadas, calculos o duraciones personalizadas.
- Evitar frases que sugieran automedicacion segura para todos.
- Indicar consulta profesional ante sintomas persistentes, empeoramiento, uso repetido o duda de seguridad.
- Revisar duplicidad de principio activo en productos combinados.
- No usar contenido copiado literalmente de fuentes externas.
- Mantener fecha de revision en formato `YYYY-MM-DD`.

## Criterios Para Incluir Medicamentos

Un medicamento puede entrar a la Base OTC solo si cumple todos estos criterios:

- Tiene condicion OTC o venta libre respaldada por fuente oficial aplicable al mercado objetivo.
- Tiene principio activo identificable.
- Tiene presentaciones descritas por fuente regulatoria, rotulado oficial o referencia institucional confiable.
- Tiene contraindicaciones, precauciones o advertencias verificables.
- Puede explicarse sin prescribir ni personalizar tratamiento.
- No requiere crear una recomendacion clinica nueva para completar el registro.
- No depende de informacion promocional de fabricantes como unica fuente.

No deben incluirse en esta capa:

- Medicamentos de prescripcion obligatoria.
- Productos sin fuente oficial verificable.
- Productos retirados, restringidos o con estado regulatorio ambiguo, salvo como `estado_validacion: "retirado"` para control interno.
- Mezclas o marcas donde no sea posible confirmar principios activos y concentraciones desde fuente oficial.

## Formato Obligatorio de Fuentes Oficiales

Cada registro debe incluir al menos una entrada en `fuente_oficial` con:

- `organizacion`: institucion responsable, por ejemplo autoridad regulatoria, entidad publica de salud o referencia institucional reconocida.
- `titulo`: nombre del documento, ficha, monografia, rotulado o pagina consultada.
- `url`: enlace directo y estable.
- `tipo`: una de las categorias permitidas por el schema.
- `pais_o_region`: cuando aplique.
- `fecha_publicacion`: si la fuente la muestra.
- `fecha_consulta`: fecha exacta en formato `YYYY-MM-DD`.

Fuentes preferidas:

- Autoridades regulatorias nacionales.
- Rotulado oficial o registro sanitario.
- Monografias oficiales.
- OMS, OPS, FDA, NIH, MedlinePlus u organismos equivalentes.
- Guias institucionales de salud publica cuando sean pertinentes.

La fuente respalda la validacion, pero la redaccion publicada por IDB debe ser original, resumida para pacientes y compatible con el Manual Editorial Oficial IDB.

## Integracion Futura

### consulta.html

En una fase posterior, `consulta.html` podra leer registros OTC certificados como capa complementaria. La integracion recomendada es no reemplazar la ficha de `knowledge/medicamentos/{slug}.json`, sino enriquecerla cuando exista un registro OTC validado relacionado.

Flujo propuesto:

- Resolver primero la ficha actual de `knowledge/medicamentos/`.
- Buscar un registro OTC validado por `slug` o `compatibilidad.knowledge_slug_relacionado`.
- Mostrar bloques OTC solo si `estado_validacion` es `validado`.
- Mantener mensajes visibles de orientacion, no prescripcion.
- Usar `senales_alarma`, `no_usar_si` e `interacciones_relevantes` para reforzar seguridad.

### VITA

VITA podra usar la Base OTC como fuente de orientacion estructurada, con limites estrictos:

- Puede explicar uso orientativo y precauciones generales.
- Debe recomendar consulta profesional ante embarazo/lactancia, pediatria, adulto mayor, enfermedades previas, uso de otros medicamentos o dudas.
- No debe convertir `dosis_general_orientativa` en instrucciones personalizadas.
- Debe priorizar senales de alarma y ruta de atencion si el usuario describe riesgo.

### search-index.json

La integracion con `search-index.json` debe hacerse en una fase posterior mediante entradas derivadas de registros OTC validados. No se deben indexar borradores ni registros en revision clinica.

Campos sugeridos para indexacion futura:

- `titulo`: nombre comercial o principio activo principal.
- `tipo`: `medicamento`.
- `categoria`: categoria OTC legible.
- `description`: resumen orientativo breve.
- `fuente`: organizacion principal.
- `nivel`: `Oficial` o `Certificado IDB`.
- `ultima_revision`: derivada de `fecha_revision`.
- `url`: `consulta.html?q={slug}` o ruta futura dedicada.
- `keywords`: `slug`, principio activo, nombres alternativos y categoria OTC.

## Compatibilidad Tecnica

El schema `knowledge/schema/otc-medicamento.schema.json` es una capa paralela al contrato general `knowledge/schema/tema.schema.json`. Su incorporacion no cambia:

- Fichas existentes de `knowledge/medicamentos/`.
- `knowledge/manifest.json`.
- `search-index.json`.
- `consulta.html`.
- `search.js`.
- Diseno visual actual.

La compatibilidad con GitHub Pages se mantiene porque el estandar usa archivos estaticos JSON y Markdown, sin dependencias de backend ni procesos de build obligatorios.
