const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const knowledge = path.join(root, "knowledge");
const titles = new Map();

for (const directory of fs.readdirSync(knowledge)) {
  const fullDirectory = path.join(knowledge, directory);
  if (!fs.statSync(fullDirectory).isDirectory()) continue;
  for (const file of fs.readdirSync(fullDirectory).filter((name) => name.endsWith(".json"))) {
    const record = JSON.parse(fs.readFileSync(path.join(fullDirectory, file), "utf8"));
    if (record.slug && record.titulo) titles.set(record.slug, record.titulo);
  }
}

const exams = path.join(knowledge, "examenes");
for (const file of fs.readdirSync(exams).filter((name) => name.endsWith(".json"))) {
  const fullPath = path.join(exams, file);
  const record = JSON.parse(fs.readFileSync(fullPath, "utf8"));
  record.temas_relacionados = record.temas_relacionados.map((related) => ({
    ...related,
    titulo: titles.get(related.slug) || related.titulo
  }));
  fs.writeFileSync(fullPath, `${JSON.stringify(record, null, 2)}\n`);
}
