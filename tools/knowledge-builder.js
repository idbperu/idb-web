#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const KNOWLEDGE_DIR = path.join(ROOT, "knowledge");
const SCHEMA_PATH = path.join(KNOWLEDGE_DIR, "schema", "tema.schema.json");
const MODEL_PATH = path.join(KNOWLEDGE_DIR, "schema", "modelo-tema.json");
const CATALOGS_DIR = path.join(KNOWLEDGE_DIR, "catalogos");
const MANIFEST_PATH = path.join(KNOWLEDGE_DIR, "manifest.json");
const EDITORIAL_DIR = path.join(KNOWLEDGE_DIR, "editorial");
const EDITORIAL_REQUIRED_FILES = [
  "manual-editorial-idb.md",
  "guia-redaccion.md",
  "checklist-calidad.md"
];

const TYPE_TO_FOLDER = {
  enfermedad: "enfermedades",
  sintoma: "sintomas",
  medicamento: "medicamentos",
  examen: "examenes",
  procedimiento: "procedimientos",
  vacuna: "vacunas",
  prevencion: "prevencion",
  nutricion: "nutricion",
  "actividad-fisica": "actividad-fisica",
  "salud-mental": "salud-mental",
  "adulto-mayor": "adulto-mayor",
  "salud-infantil": "salud-infantil",
  "salud-mujer": "salud-mujer",
  "salud-hombre": "salud-hombre",
  bienestar: "prevencion"
};

function readUtf8(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function readJson(filePath) {
  try {
    return JSON.parse(readUtf8(filePath));
  } catch (error) {
    throw new Error(`JSON invalido en ${path.relative(ROOT, filePath)}: ${error.message}`);
  }
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function slugify(value) {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function currentYearMonth() {
  return new Date().toISOString().slice(0, 7);
}

function currentTimestamp() {
  return new Date().toISOString();
}

function parseArgs(argv) {
  const args = { _: [] };

  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];

    if (!item.startsWith("--")) {
      args._.push(item);
      continue;
    }

    const key = item.slice(2);
    const next = argv[index + 1];

    if (!next || next.startsWith("--")) {
      args[key] = true;
      continue;
    }

    args[key] = next;
    index += 1;
  }

  return args;
}

function loadCore() {
  return {
    schema: readJson(SCHEMA_PATH),
    model: readJson(MODEL_PATH),
    manifest: fs.existsSync(MANIFEST_PATH) ? readJson(MANIFEST_PATH) : null
  };
}

function schemaFields(schema) {
  return Object.keys(schema.properties || {});
}

function requiredFields(schema) {
  return Array.isArray(schema.required) ? schema.required : [];
}

function validateSchemaShape(schema, model) {
  const errors = [];
  const fields = schemaFields(schema);
  const modelFields = Object.keys(model);

  if (schema.type !== "object") errors.push("El schema principal debe ser type=object.");
  if (schema.additionalProperties !== false) errors.push("El schema debe bloquear additionalProperties.");

  for (const field of requiredFields(schema)) {
    if (!fields.includes(field)) errors.push(`Campo requerido sin definicion en properties: ${field}`);
    if (!modelFields.includes(field)) errors.push(`modelo-tema.json no contiene el campo requerido: ${field}`);
  }

  for (const field of modelFields) {
    if (!fields.includes(field)) errors.push(`modelo-tema.json contiene un campo fuera del schema: ${field}`);
  }

  return errors;
}

function validateValue(value, definition, pointer) {
  const errors = [];
  const expectedType = definition.type;

  if (expectedType === "string") {
    if (typeof value !== "string") errors.push(`${pointer} debe ser string.`);
    if (definition.minLength && typeof value === "string" && value.length < definition.minLength) {
      errors.push(`${pointer} debe tener minimo ${definition.minLength} caracteres.`);
    }
    if (definition.pattern && typeof value === "string" && !(new RegExp(definition.pattern).test(value))) {
      errors.push(`${pointer} no cumple el patron ${definition.pattern}.`);
    }
    if (definition.enum && !definition.enum.includes(value)) {
      errors.push(`${pointer} debe ser uno de: ${definition.enum.join(", ")}.`);
    }
    return errors;
  }

  if (expectedType === "array") {
    if (!Array.isArray(value)) {
      errors.push(`${pointer} debe ser array.`);
      return errors;
    }
    if (definition.maxItems && value.length > definition.maxItems) {
      errors.push(`${pointer} permite maximo ${definition.maxItems} elementos.`);
    }
    value.forEach((item, index) => {
      errors.push(...validateValue(item, definition.items || {}, `${pointer}[${index}]`));
    });
    return errors;
  }

  if (expectedType === "object") {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      errors.push(`${pointer} debe ser object.`);
      return errors;
    }
    errors.push(...validateObject(value, definition, pointer));
    return errors;
  }

  return errors;
}

function validateObject(topic, schema, pointer = "$") {
  const errors = [];
  const properties = schema.properties || {};
  const allowedFields = Object.keys(properties);

  for (const field of requiredFields(schema)) {
    if (!(field in topic)) errors.push(`${pointer}.${field} es obligatorio.`);
  }

  if (schema.additionalProperties === false) {
    for (const field of Object.keys(topic)) {
      if (!allowedFields.includes(field)) errors.push(`${pointer}.${field} no existe en tema.schema.json.`);
    }
  }

  for (const [field, value] of Object.entries(topic)) {
    if (properties[field]) {
      errors.push(...validateValue(value, properties[field], `${pointer}.${field}`));
    }
  }

  return errors;
}

function validateTopic(topic, schema) {
  const errors = validateObject(topic, schema);

  if (topic.slug && topic.slug !== slugify(topic.slug)) {
    errors.push("$.slug debe estar normalizado en minusculas, sin acentos y con guiones.");
  }

  return errors;
}

function folderFromTopic(topic, manifest) {
  const folder = TYPE_TO_FOLDER[topic.tipo];
  if (!folder) return "";

  const validFolders = manifest?.categorias?.map((category) => category.id) || Object.values(TYPE_TO_FOLDER);
  return validFolders.includes(folder) ? folder : "";
}

function listTopicFiles() {
  const ignoredDirs = new Set(["schema", "evidence", "catalogos", "fuentes", "especialidades", "emergencias"]);
  const files = [];

  for (const entry of fs.readdirSync(KNOWLEDGE_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory() || ignoredDirs.has(entry.name)) continue;
    const folder = path.join(KNOWLEDGE_DIR, entry.name);
    for (const child of fs.readdirSync(folder, { withFileTypes: true })) {
      if (child.isFile() && child.name.endsWith(".json")) {
        files.push(path.join(folder, child.name));
      }
    }
  }

  return files;
}

function findDuplicateSlug(slug, targetPath = "") {
  const normalizedTarget = targetPath ? path.resolve(targetPath) : "";

  return listTopicFiles().find((filePath) => {
    if (normalizedTarget && path.resolve(filePath) === normalizedTarget) return false;
    if (path.basename(filePath, ".json") === slug) return true;

    try {
      return readJson(filePath).slug === slug;
    } catch (error) {
      return false;
    }
  });
}

function assertValidCategory(topic, manifest) {
  const folder = folderFromTopic(topic, manifest);
  if (!folder) {
    throw new Error(`Categoria/ruta invalida para tipo "${topic.tipo}".`);
  }
  return folder;
}

function mergeTopicInput(model, input, schema) {
  const allowed = new Set(schemaFields(schema));
  const unknown = Object.keys(input).filter((field) => !allowed.has(field));

  if (unknown.length) {
    throw new Error(`Campos inexistentes no permitidos: ${unknown.join(", ")}`);
  }

  return {
    ...model,
    ...input
  };
}

function generateTopic(input, core) {
  const { schema, model, manifest } = core;
  const force = input.force === true;
  const cleanInput = { ...input };
  delete cleanInput.force;

  const titulo = cleanInput.titulo || cleanInput.title || model.titulo;
  const tipo = cleanInput.tipo || model.tipo;
  const slug = cleanInput.slug ? slugify(cleanInput.slug) : slugify(titulo);
  delete cleanInput.title;

  const topic = mergeTopicInput(model, {
    ...cleanInput,
    id: cleanInput.id || `${tipo}-${slug}`,
    slug,
    titulo,
    tipo,
    ultima_revision: cleanInput.ultima_revision || currentYearMonth(),
    version: cleanInput.version || "1.0"
  }, schema);

  const folder = assertValidCategory(topic, manifest);
  const targetPath = path.join(KNOWLEDGE_DIR, folder, `${topic.slug}.json`);
  const duplicate = findDuplicateSlug(topic.slug, targetPath);

  if (duplicate && !force) {
    throw new Error(`Slug duplicado: ${topic.slug} ya existe en ${path.relative(ROOT, duplicate)}.`);
  }

  const errors = validateTopic(topic, schema);
  if (errors.length) {
    throw new Error(`Tema invalido:\n${errors.join("\n")}`);
  }

  return {
    topic,
    targetPath,
    createdAt: currentTimestamp()
  };
}

function validateCatalogs() {
  const errors = [];

  if (!fs.existsSync(CATALOGS_DIR)) {
    return ["No existe knowledge/catalogos/."];
  }

  for (const fileName of fs.readdirSync(CATALOGS_DIR)) {
    if (!fileName.endsWith(".json")) continue;
    const filePath = path.join(CATALOGS_DIR, fileName);
    const catalog = readJson(filePath);
    const records = catalog.registros || [];
    const ids = new Set();
    const slugs = new Set();

    if (!Array.isArray(records)) {
      errors.push(`${fileName}: registros debe ser array.`);
      continue;
    }

    if (Number.isInteger(catalog.total_registros) && catalog.total_registros !== records.length) {
      errors.push(`${fileName}: total_registros no coincide con registros.length.`);
    }

    records.forEach((record, index) => {
      if (!record.id) errors.push(`${fileName}[${index}]: falta id.`);
      if (!record.slug) errors.push(`${fileName}[${index}]: falta slug.`);
      if (record.slug && record.slug !== slugify(record.slug)) errors.push(`${fileName}[${index}]: slug invalido.`);
      if (ids.has(record.id)) errors.push(`${fileName}: id duplicado ${record.id}.`);
      if (slugs.has(record.slug)) errors.push(`${fileName}: slug duplicado ${record.slug}.`);
      ids.add(record.id);
      slugs.add(record.slug);
    });
  }

  return errors;
}

function validateEditorialManual() {
  const errors = [];

  if (!fs.existsSync(EDITORIAL_DIR)) {
    return ["No existe knowledge/editorial/."];
  }

  for (const fileName of EDITORIAL_REQUIRED_FILES) {
    const filePath = path.join(EDITORIAL_DIR, fileName);

    if (!fs.existsSync(filePath)) {
      errors.push(`Falta knowledge/editorial/${fileName}.`);
      continue;
    }

    if (!fs.statSync(filePath).isFile()) {
      errors.push(`knowledge/editorial/${fileName} no es un archivo.`);
      continue;
    }

    if (!readUtf8(filePath).trim()) {
      errors.push(`knowledge/editorial/${fileName} esta vacio.`);
    }
  }

  return errors;
}

function printUsage() {
  console.log(`
Knowledge Builder IDB

Uso:
  node tools/knowledge-builder.js validate-schema
  node tools/knowledge-builder.js validate-catalogs
  node tools/knowledge-builder.js validate-editorial
  node tools/knowledge-builder.js validate-topic --file knowledge/sintomas/dolor-de-cabeza.json
  node tools/knowledge-builder.js create --input borrador.json
  node tools/knowledge-builder.js create --titulo "Dolor de cabeza" --tipo sintoma --categoria "Neurologia"

Opciones:
  --input <archivo>     JSON parcial o completo con campos de tema.schema.json.
  --file <archivo>      Archivo a validar.
  --titulo <texto>      Titulo del tema cuando no se usa --input.
  --tipo <tipo>         Tipo definido por tema.schema.json.
  --categoria <texto>   Categoria editorial del tema.
  --force               Permite actualizar/sobrescribir el archivo destino.
  --dry-run             Valida y muestra salida sin escribir archivo.
`);
}

function commandValidateSchema() {
  const { schema, model } = loadCore();
  const errors = validateSchemaShape(schema, model);

  if (errors.length) {
    throw new Error(errors.join("\n"));
  }

  console.log("Schema y modelo compatibles.");
}

function commandValidateCatalogs() {
  const errors = validateCatalogs();

  if (errors.length) {
    throw new Error(errors.join("\n"));
  }

  console.log("Catalogos validos.");
}

function commandValidateEditorial() {
  const errors = validateEditorialManual();

  if (errors.length) {
    throw new Error(errors.join("\n"));
  }

  console.log("Manual editorial disponible y obligatorio para nuevas generaciones.");
}

function commandValidateTopic(args) {
  if (!args.file) throw new Error("Falta --file.");

  const { schema, manifest } = loadCore();
  const filePath = path.resolve(ROOT, args.file);
  const topic = readJson(filePath);
  const folder = assertValidCategory(topic, manifest);
  const duplicate = findDuplicateSlug(topic.slug, filePath);
  const errors = validateTopic(topic, schema);

  if (duplicate) {
    errors.push(`Slug duplicado en ${path.relative(ROOT, duplicate)}.`);
  }

  if (folder && !filePath.includes(`${path.sep}${folder}${path.sep}`)) {
    errors.push(`El archivo deberia estar en knowledge/${folder}/.`);
  }

  if (errors.length) {
    throw new Error(errors.join("\n"));
  }

  console.log(`${path.relative(ROOT, filePath)} es compatible con tema.schema.json.`);
}

function commandCreate(args) {
  const core = loadCore();
  const editorialErrors = validateEditorialManual();

  if (editorialErrors.length) {
    throw new Error(`No se puede crear contenido sin el Manual Editorial IDB:\n${editorialErrors.join("\n")}`);
  }

  const input = args.input ? readJson(path.resolve(ROOT, args.input)) : {
    titulo: args.titulo,
    tipo: args.tipo,
    categoria: args.categoria
  };

  if (args.force) input.force = true;
  const { topic, targetPath, createdAt } = generateTopic(input, core);
  const topicToWrite = { ...topic };
  delete topicToWrite.force;
  if (!args["dry-run"]) {
    writeJson(targetPath, topicToWrite);
  }

  console.log(JSON.stringify({
    archivo: path.relative(ROOT, targetPath),
    escrito: !args["dry-run"],
    id: topicToWrite.id,
    slug: topicToWrite.slug,
    tipo: topicToWrite.tipo,
    ultima_revision: topicToWrite.ultima_revision,
    version: topicToWrite.version,
    fecha_creacion_ejecucion: createdAt
  }, null, 2));
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];

  try {
    if (!command || command === "help" || command === "--help") {
      printUsage();
      return;
    }

    if (command === "validate-schema") return commandValidateSchema();
    if (command === "validate-catalogs") return commandValidateCatalogs();
    if (command === "validate-editorial") return commandValidateEditorial();
    if (command === "validate-topic") return commandValidateTopic(args);
    if (command === "create") return commandCreate(args);

    throw new Error(`Comando no reconocido: ${command}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

main();
