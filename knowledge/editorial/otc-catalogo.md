# Catalogo Maestro OTC IDB MEDIC

Este documento define el uso de `knowledge/catalogos/otc-catalogo.json` como indice maestro de la futura Base OTC Certificada. El catalogo organiza medicamentos, rutas y metadatos operativos, pero no contiene contenido clinico.

## Funcion del Catalogo

El catalogo maestro sera la fuente unica para saber que medicamentos OTC forman parte del universo certificado de IDB MEDIC, cual es su estado editorial y donde vivira cada ficha JSON futura.

Debe servir para:

- Planificar la primera cohorte aproximada de 30 medicamentos OTC.
- Controlar slugs, nombres, categorias, subcategorias y prioridades.
- Evitar duplicados antes de crear fichas individuales.
- Separar metadatos de organizacion del contenido clinico.
- Preparar integraciones futuras sin modificar `search-index.json`, `consulta.html` ni `search.js` en esta etapa.

## Relacion con otc-medicamento.schema.json

`knowledge/schema/otc-medicamento.schema.json` define la estructura clinica y editorial obligatoria de cada ficha OTC certificada futura.

`knowledge/catalogos/otc-catalogo.json` no reemplaza ese schema. Solo apunta hacia futuras fichas mediante `archivo_json` y conserva metadatos minimos para ordenar el trabajo.

Regla central:

- El catalogo dice que ficha existe o existira.
- El schema valida el contenido completo de la ficha.
- La ficha futura contiene la informacion orientativa, fuentes oficiales y reglas de seguridad.

## Relacion con Futuras Fichas OTC

Cada registro real del catalogo debera corresponder a una ficha futura validable con `otc-medicamento.schema.json`.

El campo `archivo_json` debe apuntar a una ruta estatica y normalizada. La ruta recomendada para la siguiente fase es:

`knowledge/otc/{slug}.json`

Esta ruta mantiene separada la capa OTC certificada de `knowledge/medicamentos/`, que no debe modificarse por el solo hecho de crear el catalogo.

## Integracion Futura con search-index.json

En una fase posterior, solo los registros con estado publicable deberan generar entradas en `search-index.json`.

Reglas sugeridas:

- No indexar ejemplos tecnicos.
- No indexar borradores.
- No indexar registros que requieran revision clinica pendiente.
- Usar `nombre`, `principio_activo_principal`, `keywords` y `aliases` como insumos de busqueda.
- Mantener `tipo: "medicamento"` para compatibilidad con la busqueda actual.
- Derivar la URL de `slug` o de una ruta futura acordada.

El catalogo no debe contener descripciones clinicas para search. Esa descripcion debe salir de la ficha OTC validada.

## Integracion Futura con consulta.html

`consulta.html` podra usar el catalogo como mapa de resolucion, no como fuente clinica.

Flujo futuro recomendado:

- Buscar coincidencia por `slug`, `keywords` o `aliases`.
- Resolver `archivo_json` del registro OTC.
- Cargar la ficha OTC solo si esta validada.
- Mantener la ficha existente de `knowledge/medicamentos/` como capa independiente.
- Mostrar informacion OTC certificada como complemento, no como sustituto automatico.

Esta tarea no modifica `consulta.html`.

## Integracion Futura con VITA

VITA podra usar el catalogo para reconocer que existe una ficha OTC certificada y decidir si puede consultar su JSON validado.

El catalogo puede ayudar a VITA a:

- Reconocer alias y variantes de busqueda.
- Priorizar medicamentos segun `prioridad_idb`.
- Evitar responder sobre registros no validados.
- Derivar la conversacion hacia consulta profesional cuando `requiere_revision_clinica` sea `true`.

VITA no debe usar el catalogo para entregar indicaciones, dosis, advertencias o contraindicaciones, porque esos datos no pertenecen al catalogo.

## Reglas Para Agregar Nuevos Medicamentos

Antes de agregar un registro real al catalogo:

- Confirmar que no existe otro registro con el mismo `slug`.
- Usar nombres de archivo en minusculas, sin espacios ni tildes.
- Completar solo metadatos permitidos.
- No incluir dosis, indicaciones, advertencias, contraindicaciones, fuentes ni contenido clinico.
- Marcar `requiere_revision_clinica: true` hasta que la ficha OTC haya pasado revision.
- Usar `estado` para reflejar el flujo editorial.
- Definir `archivo_json` aunque la ficha todavia no exista.
- Mantener `version_schema` alineada con el schema OTC vigente.

Estados recomendados:

- `planificado`
- `en-redaccion`
- `revision-clinica`
- `validado`
- `publicable`
- `retirado`
- `ejemplo-tecnico`

## Control de Versiones

El catalogo tiene dos niveles de version:

- `version`: version del catalogo maestro.
- `version_schema`: version del contrato esperado para futuras fichas OTC.

Cambios menores, como ordenar prioridades o agregar aliases, pueden incrementar version menor del catalogo.

Cambios estructurales en campos obligatorios, rutas o reglas de publicacion deben documentarse en este archivo y coordinarse con el schema OTC.

Ningun cambio de version del catalogo debe modificar automaticamente:

- `search-index.json`
- `consulta.html`
- `search.js`
- `knowledge/manifest.json`
- fichas existentes de `knowledge/medicamentos/`

## Compatibilidad

El catalogo es un archivo JSON estatico compatible con GitHub Pages. No requiere backend, build step ni dependencias adicionales.
