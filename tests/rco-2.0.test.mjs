import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import { createClinicalSearchEngine } from "../clinical-search-engine.mjs";

const root = new URL("../", import.meta.url);
const [dictionary, records] = await Promise.all([
  readFile(new URL("knowledge/catalogos/clinical-search-dictionary.json", root), "utf8").then(JSON.parse),
  readFile(new URL("search-index.json", root), "utf8").then(JSON.parse)
]);

const engine = createClinicalSearchEngine(dictionary, records);
const cases = [
  ["Me duele mucho la garganta al tragar y tengo fiebre", ["dolor-de-garganta"]],
  ["Tengo mucha sed, voy al baño a cada rato y he bajado de peso", ["diabetes"]],
  ["Desde ayer me cuesta respirar y siento presión en el pecho", ["dolor-de-pecho", "dificultad-para-respirar"], { urgency: true }],
  ["Me duele el estómago después de comer y siento ardor", ["gastritis", "acidez"]],
  ["Hace varios días tengo dolor fuerte en la parte baja de la espalda", ["dolor-de-espalda"]],
  ["¿Para qué sirve la ferritina que me pidió el médico?", ["ferritina"]],
  ["Me van a hacer una resonancia de rodilla, ¿en qué consiste?", ["resonancia-magnetica-de-rodilla"]],
  ["Tengo dolor en los huesos desde hace semanas", ["dolor-articular"], { noMedication: true }],
  ["Mi mamá tiene la presión alta y le pidieron un MAPA", ["monitoreo-ambulatorio-de-presion-arterial-mapa"]],
  ["Quiero saber cómo es una colonoscopia y si requiere preparación", ["colonoscopia"]],
  ["No tengo fiebre, pero me duele la garganta", ["dolor-de-garganta"], { negated: "fiebre" }],
  ["¿Para qué sirve el ibuprofeno?", ["ibuprofeno"]]
];

const actual = [];
for (const [query, expected, extra = {}] of cases) {
  const result = engine.resolve(query);
  const slug = new URLSearchParams(String(result.primaryResult?.url || "").split("?")[1] || "").get("q");
  assert.ok(expected.includes(slug), `${query}: se esperaba ${expected.join(" o ")}, se obtuvo ${slug}`);
  for (const property of ["intent", "concepts", "primaryResult", "relatedResults", "exams", "medications", "rco", "suggestions", "explanation", "confidence"]) {
    assert.ok(Object.hasOwn(result, property), `${query}: falta ${property}`);
  }
  if (extra.urgency) assert.equal(result.rco.urgency.detected, true, `${query}: no detectó señal de alarma`);
  if (extra.noMedication) assert.notEqual(result.primaryResult?.tipo, "medicamento", `${query}: devolvió medicamento primero`);
  if (extra.negated) assert.ok(result.concepts.some((concept) => concept.slug === extra.negated && concept.negated), `${query}: no conservó la negación`);
  actual.push({ query, expected, actual: slug, intent: result.intent.primary, confidence: result.confidence.score });
}

const canonicalSamples = records.filter((record) => ["sintoma", "enfermedad", "medicamento", "examen"].includes(record.tipo));
let canonicalMatches = 0;
for (const record of canonicalSamples) {
  const result = engine.resolve(record.titulo, { limit: 8 });
  const expectedSlug = new URLSearchParams(String(record.url).split("?")[1] || "").get("q");
  const actualSlug = new URLSearchParams(String(result.primaryResult?.url || "").split("?")[1] || "").get("q");
  if (actualSlug === expectedSlug) canonicalMatches += 1;
}
assert.ok(canonicalMatches / canonicalSamples.length >= 0.95, `Regresión canónica: ${canonicalMatches}/${canonicalSamples.length}`);

engine.clearCache();
const benchmarkStart = performance.now();
for (let iteration = 0; iteration < 25; iteration += 1) {
  for (const [query] of cases) {
    engine.resolve(`${query} ${iteration === 0 ? "" : `(${iteration})`}`);
  }
}
const benchmarkMs = performance.now() - benchmarkStart;

console.log(JSON.stringify({
  mandatoryCases: actual,
  canonicalRegression: `${canonicalMatches}/${canonicalSamples.length}`,
  initializationMs: engine.metrics().initializationMs,
  averageResolutionMs: Number((benchmarkMs / (cases.length * 25)).toFixed(3)),
  dictionaryVersion: engine.metrics().dictionaryVersion,
  indexedRecords: engine.metrics().recordCount,
  indexedPhrases: engine.metrics().phraseCount
}, null, 2));
