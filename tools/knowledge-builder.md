# Knowledge Builder IDB

`tools/knowledge-builder.js` es el primer generador oficial de archivos JSON para la Base de Conocimiento del Instituto Digital de Bienestar.

No genera contenido medico con IA. Su funcion es crear, validar y actualizar archivos compatibles con:

- `knowledge/schema/tema.schema.json`
- `consulta.html`
- `search.js`
- VITA
- futuras APIs

## Entradas

El builder lee:

- `knowledge/schema/tema.schema.json`
- `knowledge/schema/modelo-tema.json`
- `knowledge/catalogos/`
- `knowledge/manifest.json` para validar rutas/categorias disponibles
- `knowledge/editorial/` como referencia editorial obligatoria antes de crear nuevos JSON

## Salida

Cada tema se guarda como:

`knowledge/{categoria}/{slug}.json`

Ejemplo:

`knowledge/sintomas/dolor-de-cabeza.json`

## Comandos

### Validar schema y modelo

```bash
node tools/knowledge-builder.js validate-schema
```

Confirma que `modelo-tema.json` no tenga campos fuera de `tema.schema.json` y que contenga todos los campos obligatorios.

### Validar catalogos

```bash
node tools/knowledge-builder.js validate-catalogs
```

Revisa que los catalogos JSON tengan registros, slugs validos, IDs unicos y conteo coherente.

### Validar manual editorial

```bash
node tools/knowledge-builder.js validate-editorial
```

Confirma que existan y no esten vacios:

- `knowledge/editorial/manual-editorial-idb.md`
- `knowledge/editorial/guia-redaccion.md`
- `knowledge/editorial/checklist-calidad.md`

El comando `create` exige este manual antes de generar cualquier JSON. Si falta alguno de estos archivos, el builder bloquea la creacion para evitar contenido fuera del estandar editorial IDB.

### Validar un tema existente

```bash
node tools/knowledge-builder.js validate-topic --file knowledge/sintomas/dolor-de-cabeza.json
```

Valida:

- JSON correcto.
- Campos obligatorios.
- Campos inexistentes.
- Categoria/ruta.
- Slug duplicado.
- Compatibilidad con `tema.schema.json`.

### Crear un tema desde parametros

```bash
node tools/knowledge-builder.js create --titulo "Dolor de cabeza" --tipo sintoma --categoria "Neurologia"
```

El builder genera automaticamente:

- `id`
- `slug`
- `ultima_revision`
- `version`

Tambien reporta `fecha_creacion_ejecucion` en consola. Esa fecha no se guarda dentro del JSON porque `tema.schema.json` no define un campo `fecha_creacion` y el schema no permite propiedades adicionales.

Para probar sin escribir archivos:

```bash
node tools/knowledge-builder.js create --titulo "Dolor de cabeza" --tipo sintoma --categoria "Neurologia" --dry-run
```

### Crear un tema desde un borrador JSON

```bash
node tools/knowledge-builder.js create --input borrador.json
```

El archivo de entrada puede contener cualquier campo definido por `tema.schema.json`. Si incluye un campo no definido, el builder lo rechaza.

### Actualizar o sobrescribir un tema

```bash
node tools/knowledge-builder.js create --input borrador.json --force
```

Usar `--force` solo cuando el objetivo sea actualizar un tema existente con el mismo slug.

## Como Crear un Nuevo Tema

1. Definir `titulo`, `tipo` y `categoria`.
2. Revisar `knowledge/editorial/manual-editorial-idb.md`.
3. Aplicar `knowledge/editorial/guia-redaccion.md`.
4. Revisar si ya existe un registro similar en `knowledge/catalogos/`.
5. Crear un borrador con los campos de `tema.schema.json`.
6. Ejecutar `create`.
7. Ejecutar `validate-topic`.
8. Aplicar `knowledge/editorial/checklist-calidad.md` antes de publicar.

## Como Evitar Duplicados

El builder bloquea slugs repetidos en carpetas de temas.

Antes de crear un tema:

- Revisar catalogos.
- Revisar sinonimos.
- Confirmar que el nuevo tema no sea solo una variante de otro.
- Usar `validate-catalogs` para detectar slugs repetidos en catalogos.

## Validaciones Incluidas

- Schema legible y consistente.
- JSON UTF-8 correcto.
- Manual editorial obligatorio para crear nuevos JSON.
- Campos obligatorios.
- Campos inexistentes.
- Tipos de dato basicos.
- Enum de `tipo`.
- Patrones de `slug` y `ultima_revision`.
- Maximo de preguntas frecuentes.
- Categorias/rutas validas.
- Slugs repetidos.

## Categorias Derivadas por Tipo

El builder guarda automaticamente segun `tipo`:

- `sintoma` -> `knowledge/sintomas/`
- `enfermedad` -> `knowledge/enfermedades/`
- `medicamento` -> `knowledge/medicamentos/`
- `examen` -> `knowledge/examenes/`
- `procedimiento` -> `knowledge/procedimientos/`
- `vacuna` -> `knowledge/vacunas/`

Los tipos de bienestar se guardan en sus carpetas correspondientes cuando existen en `manifest.json`.

## Reglas

- No crear paginas HTML.
- No modificar `search-index.json`.
- No modificar `consulta.html`.
- No permitir campos fuera del schema.
- No permitir categorias/rutas invalidas.
- No permitir slugs repetidos salvo con `--force`.
- No guardar datos personales.
- No generar contenido medico automaticamente.
- No crear nuevos JSON si falta el Manual Editorial IDB.
