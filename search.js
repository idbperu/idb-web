(function () {
  const DEFAULT_INDEX_URL = "search-index.json";
  const DEFAULT_VITA_URL = "https://wa.me/?text=Hola%20VITA%2C%20necesito%20orientaci%C3%B3n%20sobre%20bienestar.";
  const DEFAULT_SELECTORS = {
    input: "[data-medical-search-input]",
    results: "[data-medical-search-results]"
  };
  const KNOWLEDGE_BASE_ROOT = "knowledge/";
  const ACTIVE_SEARCH_SOURCES = ["legacy-index"];
  const KNOWLEDGE_CATEGORIES = {
    enfermedades: "knowledge/enfermedades/",
    sintomas: "knowledge/sintomas/",
    medicamentos: "knowledge/medicamentos/",
    prevencion: "knowledge/prevencion/",
    nutricion: "knowledge/nutricion/",
    saludMental: "knowledge/salud-mental/",
    adultoMayor: "knowledge/adulto-mayor/"
  };
  const SEARCH_HISTORY_KEY = "idbMedicalSearchHistory";
  const TYPE_ICONS = {
    sintoma: "🔎",
    enfermedad: "🩺",
    medicamento: "💊",
    examen: "🧪",
    bienestar: "🌿"
  };
  let searchIndex = [];
  let readyPromise = null;

  const searchSources = new Map();

  function normalizeText(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function normalizeQueryText(value) {
    return normalizeText(value)
      .replace(/[¿?¡!.,;:()[\]{}]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function uniqueValues(values) {
    return [...new Set(values.map(normalizeQueryText).filter(Boolean))];
  }

  function slugify(value) {
    return normalizeQueryText(value)
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function detectQueryIntent(query) {
    const normalized = normalizeQueryText(query);
    const wantsMedication = /\b(que puedo tomar|que tomar|medicamento|pastilla|jarabe|antiinflamatorio|analgesico)\b/.test(normalized);
    const symptomLanguage = /\b(tengo|me duele|dolor|fiebre|tos|mareo|nausea|vomito|diarrea|ardor|malestar|cansancio|fatiga)\b/.test(normalized);
    const meaningLanguage = /\b(que significa|significa|alto|alta|bajo|baja|resultado|examen|analisis)\b/.test(normalized);

    if (wantsMedication && !symptomLanguage) return "medicamento";
    if (meaningLanguage && /\b(glucosa|hemograma|colesterol|trigliceridos|examen|analisis)\b/.test(normalized)) return "examen";
    if (symptomLanguage) return "sintoma";
    return "";
  }

  function createQueryVariants(query) {
    const normalized = normalizeQueryText(query);
    const interpreted = interpretMedicalQuery(normalized);
    const variants = [normalized, interpreted.corrected, interpreted.medicalText, ...interpreted.medicalCandidates];

    const phraseAliases = [
      ["para que sirve ", ""],
      ["para que es ", ""],
      ["para que se usa ", ""],
      ["que es ", ""],
      ["que significa ", ""],
      ["como bajar la fiebre", "fiebre"],
      ["como quitar la fiebre", "fiebre"],
      ["como controlar la fiebre", "fiebre"],
      ["que puedo tomar para la fiebre", "fiebre"],
      ["que tomar para la fiebre", "fiebre"],
      ["tengo fiebre", "fiebre"],
      ["me duele la cabeza", "dolor de cabeza"],
      ["dolor en la cabeza", "dolor de cabeza"],
      ["me duele el estomago", "dolor de estomago"],
      ["dolor de barriga", "dolor abdominal"],
      ["azucar alta", "glucosa"],
      ["glucosa alta", "glucosa"],
      ["tengo tos", "tos"],
      ["tengo ansiedad", "ansiedad"],
      ["no puedo dormir", "insomnio"]
    ];

    phraseAliases.forEach(([from, to]) => {
      if (normalized === from.trim()) variants.push(to);
      if (normalized.startsWith(from)) variants.push(normalized.replace(from, ""));
      if (normalized.includes(from.trim())) {
        variants.push(normalized.replace(from.trim(), to));
        if (to) variants.push(to);
      }
    });

    const painMatch = normalized.match(/\bme duele (la|el|los|las)?\s*(.+)$/);
    if (painMatch?.[2]) {
      variants.push(`dolor de ${painMatch[2]}`);
    }

    const symptomQuestionMatch = normalized.match(/\b(?:que puedo tomar para|que tomar para|como bajar|como quitar|como controlar)\s+(?:la|el|los|las)?\s*(.+)$/);
    if (symptomQuestionMatch?.[1]) {
      variants.push(symptomQuestionMatch[1]);
    }

    const stripped = normalized
      .replace(/\b(hola|por favor|quisiera|quiero|necesito|saber|informacion|sobre|acerca de|que|significa|tengo|siento|presento|del|de la|de el|un|una|el|la|los|las|mi|mis)\b/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    variants.push(stripped);
    variants.push(stripped.replace(/\b(alto|alta|bajo|baja|elevado|elevada|normal|anormal|positivo|negativo)\b/g, " ").replace(/\s+/g, " ").trim());

    return uniqueValues(variants);
  }

  const QUERY_CORRECTIONS = [
    [/\bdolro\b/g, "dolor"],
    [/\bcabesa\b/g, "cabeza"],
    [/\bprecion\b/g, "presion"],
    [/\bhipertencion\b/g, "hipertension"],
    [/\bhipertenciona\b/g, "hipertension"],
    [/\bdiavetes\b/g, "diabetes"],
    [/\bdiabetesa\b/g, "diabetes"],
    [/\bgripee\b/g, "gripe"],
    [/\bgrippe\b/g, "gripe"],
    [/\bfievre\b/g, "fiebre"],
    [/\btoss\b/g, "tos"],
    [/\btso\b/g, "tos"],
    [/\btoz\b/g, "tos"],
    [/\bansieda\b/g, "ansiedad"],
    [/\bdeprecion\b/g, "depresion"],
    [/\bmigranaa\b/g, "migrana"],
    [/\bninio\b/g, "nino"],
    [/\bninia\b/g, "nina"],
    [/\bniñio\b/g, "nino"],
    [/\bniñia\b/g, "nina"],
    [/\bbebes\b/g, "bebe"],
    [/\bansiano\b/g, "anciano"],
    [/\bansiana\b/g, "anciana"],
    [/\bancaino\b/g, "anciano"],
    [/\btersera edad\b/g, "tercera edad"],
    [/\badulto mallor\b/g, "adulto mayor"],
    [/\bmujer bieja\b/g, "mujer mayor"],
    [/\bhombre biejo\b/g, "hombre mayor"],
    [/\bcorason\b/g, "corazon"],
    [/\balerjia\b/g, "alergia"],
    [/\basitromisina\b/g, "azitromicina"],
    [/\basitromicina\b/g, "azitromicina"],
    [/\bazitromisina\b/g, "azitromicina"],
    [/\bazytromicina\b/g, "azitromicina"],
    [/\bgaraganta\b/g, "garganta"],
    [/\bgargata\b/g, "garganta"],
    [/\bestomgo\b/g, "estomago"],
    [/\bestomagoo\b/g, "estomago"],
    [/\bestomacal\b/g, "estomago"],
    [/\bestomacales\b/g, "estomago"],
    [/\bbarrigaa\b/g, "barriga"],
    [/\bnuk\b/g, "nuca"],
    [/\bnuca\b/g, "nuca"],
    [/\bpanial\b/g, "panal"],
    [/\bpañial\b/g, "panal"],
    [/\bunia\b/g, "una"],
    [/\bestrenimiento\b/g, "estrenimiento"],
    [/\brespirasion\b/g, "respiracion"],
    [/\baogo\b/g, "ahogo"]
  ];

  const CONTEXT_DEFINITIONS = {
    pediatric: [
      "nino", "nina", "bebe", "lactante", "recien nacido", "neonato", "infantil",
      "pediatrico", "escolar", "adolescente", "menor", "hijo", "hija", "pequeno", "pequena"
    ],
    olderAdult: [
      "adulto mayor", "persona mayor", "tercera edad", "anciano", "anciana", "ancianito",
      "ancianita", "abuelo", "abuela", "abuelito", "abuelita", "edad avanzada", "mayor", "nana"
    ],
    male: ["hombre", "varon", "caballero", "padre", "papa", "esposo"],
    female: ["mujer", "senora", "dama", "madre", "mama", "esposa"]
  };

  const MEDICAL_SYNONYMS = [
    [["me falta el aire", "falta de aire", "no puedo respirar bien", "siento que me ahogo", "me ahogo", "ahogo", "disnea", "respirar mal"], "dificultad para respirar"],
    [["tos con flema", "tos con moco", "tos con mocos", "flema", "moco en el pecho", "expectoracion"], "tos"],
    [["me duele la garganta", "garganta inflamada", "garganta irritada", "ardor de garganta"], "dolor de garganta"],
    [["me duele el estomago", "dolor en el estomago", "dolor de estomago", "dolor estomago", "dolor estomacal", "me duele la barriga", "dolor de barriga", "dolor en la barriga"], "dolor abdominal"],
    [["me arde el estomago", "ardor de estomago", "ardor en el estomago", "acidez", "agruras", "vinagrera"], "gastritis"],
    [["me duele el pecho", "dolor en el pecho", "presion en el pecho", "opresion en el pecho"], "dolor de pecho"],
    [["dolor en la nuca", "me duele la nuca", "dolor de nuca"], "dolor de cabeza"],
    [["estrenimiento", "estreñimiento", "no puedo evacuar"], "estrenimiento"],
    [["presion alta", "tension alta"], "hipertension"],
    [["azucar alta", "glucosa alta"], "glucosa"],
    [["dolor cabeza", "dolor en la cabeza", "cabesa", "cefalea"], "dolor de cabeza"],
    [["dolor de barriga", "dolor barriga", "dolor abdominal", "dolor de panza"], "dolor de estomago"],
    [["vomitar", "vomito", "vomitos"], "vomitos"],
    [["resfrio", "resfriado", "gripe"], "resfrio comun"],
    [["agotamiento"], "fatiga"],
    [["tristeza"], "depresion"],
    [["estres"], "ansiedad"],
    [["bienestar emocional"], "ansiedad"],
    [["salud emocional"], "ansiedad"],
    [["no puedo dormir", "no logra dormir", "no duerme"], "insomnio"],
    [["bronquios", "bronquio"], "asma"],
    [["corazon", "dolor de corazon", "dolor en el corazon", "pecho", "dolor pecho", "dolor toracico"], "dolor de pecho"],
    [["huesos", "duelen los huesos", "dolor de huesos", "articulaciones", "dolor articulaciones"], "dolor articular"],
    [["alergia", "alergico", "alergica"], "erupcion en la piel"],
    [["reflujo"], "reflujo gastroesofagico"]
  ];

  function applyQueryCorrections(query) {
    let text = normalizeQueryText(query).replace(/[-_]+/g, " ");
    QUERY_CORRECTIONS.forEach(([pattern, replacement]) => {
      text = text.replace(pattern, replacement);
    });
    return text.replace(/\s+/g, " ").trim();
  }

  function containsTerm(text, term) {
    return new RegExp(`(^|\\s)${term.replace(/\s+/g, "\\s+")}(\\s|$)`).test(text);
  }

  function detectQueryContext(query) {
    const corrected = applyQueryCorrections(query);
    const spaced = ` ${corrected} `;
    const pediatric = CONTEXT_DEFINITIONS.pediatric.some((term) => containsTerm(spaced, term));
    const olderAdult = CONTEXT_DEFINITIONS.olderAdult.some((term) => containsTerm(spaced, term));
    const male = CONTEXT_DEFINITIONS.male.some((term) => containsTerm(spaced, term));
    const female = CONTEXT_DEFINITIONS.female.some((term) => containsTerm(spaced, term));
    const maleSpecific = male && /\b(prostata|prostatico|salud masculina|salud del hombre)\b/.test(corrected);
    const femaleSpecific = female && /\b(embarazo|gestante|menopausia|ginecologico|salud femenina|salud de la mujer)\b/.test(corrected);
    return {
      pediatric,
      olderAdult,
      male,
      female,
      age: pediatric ? "pediatric" : olderAdult ? "older-adult" : "",
      sex: female ? "female" : male ? "male" : "",
      canonical: pediatric ? "pediatrico" : olderAdult ? "adulto-mayor" : femaleSpecific ? "mujer" : maleSpecific ? "hombre" : "general"
    };
  }

  function synonymCandidates(text) {
    const candidates = [];
    MEDICAL_SYNONYMS.forEach(([aliases, target]) => {
      aliases.forEach((alias) => {
        if (containsTerm(` ${text} `, alias)) candidates.push(target, text.replace(new RegExp(`\\b${alias.replace(/\s+/g, "\\s+")}\\b`, "g"), target));
      });
    });
    return candidates;
  }

  function clinicalIntentCandidates(text) {
    const candidates = [];
    const hasBreathingIntent = /\b(me falta el aire|falta de aire|no puedo respirar bien|siento que me ahogo|me ahogo|ahogo|disnea|respirar mal|no respiro bien)\b/.test(text);
    const hasProductiveCough = /\btos\b.*\b(flema|moco|mocos|expectoracion)\b|\b(flema|moco|mocos|expectoracion)\b.*\btos\b/.test(text);
    const hasThroatIntent = /\b(me duele la garganta|dolor de garganta|garganta inflamada|garganta irritada|ardor de garganta)\b/.test(text);
    const hasBurningStomach = /\b(arde|ardor|acidez|agruras|vinagrera)\b.*\bestomago\b|\bestomago\b.*\b(arde|ardor|acidez|agruras|vinagrera)\b/.test(text);
    const hasStomachPain = /\b(dolor de estomago|dolor estomago|dolor estomacal|me duele el estomago|dolor en el estomago|me duele la barriga|dolor en la barriga|dolor de barriga|dolor de panza|dolor abdominal)\b/.test(text);
    const hasChestPain = /\b(me duele el pecho|dolor en el pecho|dolor de pecho|opresion en el pecho|presion en el pecho)\b/.test(text);
    const hasNeckHeadPain = /\b(dolor en la nuca|dolor de nuca|me duele la nuca)\b/.test(text);

    if (hasBreathingIntent) candidates.push("dificultad para respirar", "falta de aire");
    if (hasProductiveCough) candidates.push("tos");
    if (hasThroatIntent) candidates.push("dolor de garganta");
    if (hasBurningStomach) candidates.push("gastritis", "reflujo gastroesofagico");
    if (hasStomachPain) candidates.push("dolor abdominal", "gastritis");
    if (hasChestPain) candidates.push("dolor de pecho");
    if (hasNeckHeadPain) candidates.push("dolor de cabeza");
    return candidates;
  }

  function stripContextLanguage(query) {
    const removable = [
      ...CONTEXT_DEFINITIONS.pediatric,
      ...CONTEXT_DEFINITIONS.olderAdult,
      ...CONTEXT_DEFINITIONS.male,
      ...CONTEXT_DEFINITIONS.female,
      "a", "le", "les", "mi", "mis", "el", "la", "los", "las", "un", "una", "con",
      "tiene", "tienen", "tengo", "tendra", "presenta", "presento", "dio", "tiene", "me",
      "su", "sus", "por", "para", "porque", "por que", "hace", "dias", "dia", "cuatro",
      "medicamento", "medicina", "pastilla"
    ];
    let text = ` ${query} `;
    removable
      .sort((a, b) => b.length - a.length)
      .forEach((term) => {
        text = text.replace(new RegExp(`\\b${term.replace(/\s+/g, "\\s+")}\\b`, "g"), " ");
      });
    return text.replace(/\s+/g, " ").trim();
  }

  function interpretMedicalQuery(query) {
    const raw = normalizeQueryText(query).replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
    const corrected = applyQueryCorrections(raw);
    const context = detectQueryContext(corrected);
    const stripped = stripContextLanguage(corrected);
    const clinicalCandidates = [...clinicalIntentCandidates(corrected), ...clinicalIntentCandidates(stripped)];
    const candidates = [...clinicalCandidates, raw, corrected, stripped, ...synonymCandidates(corrected), ...synonymCandidates(stripped)];

    const painMatch = corrected.match(/\b(?:me|le|les)?\s*(?:duele|duelen)\s+(?:el|la|los|las)?\s*(.+)$/);
    if (painMatch?.[1]) {
      candidates.push(`dolor de ${painMatch[1]}`);
      candidates.push(...synonymCandidates(`dolor de ${painMatch[1]}`));
    }

    if (/\bdolor cabeza\b/.test(corrected)) candidates.push(corrected.replace(/\bdolor cabeza\b/g, "dolor de cabeza"));
    if (/\bpresion alta\b/.test(corrected)) candidates.push("hipertension");
    if (/\bhipertension\b/.test(corrected)) candidates.push("hipertension");
    if (/\bmedicamento\s+/.test(corrected)) candidates.push(corrected.replace(/\bmedicamento\s+/g, ""));

    return {
      raw,
      corrected,
      context,
      medicalText: stripped || corrected,
      medicalCandidates: uniqueValues(candidates)
    };
  }

  function medicalQueryCandidates(query) {
    return interpretMedicalQuery(query).medicalCandidates;
  }

  function normalizeRecord(record) {
    const searchableParts = [
      record.titulo,
      record.tipo,
      record.categoria,
      record.description,
      record.fuente,
      record.nivel,
      ...(Array.isArray(record.keywords) ? record.keywords : [])
    ];

    return {
      ...record,
      prioridad: Number.isFinite(Number(record.prioridad)) ? Number(record.prioridad) : 4,
      _title: normalizeText(record.titulo),
      _slug: slugify(record.titulo),
      _keywords: Array.isArray(record.keywords) ? record.keywords.map(normalizeText) : [],
      _keywordSlugs: Array.isArray(record.keywords) ? record.keywords.map(slugify) : [],
      _searchText: normalizeText(searchableParts.join(" "))
    };
  }

  function normalizeKnowledgeRecord(record, options = {}) {
    return normalizeRecord({
      titulo: record.titulo || record.title || "",
      tipo: options.tipo || record.tipo || "bienestar",
      categoria: options.categoria || record.categoria || "",
      prioridad: record.prioridad || options.prioridad || 4,
      description: record.descripcion || record.description || "",
      fuente: Array.isArray(record.fuentes) ? record.fuentes[0] : record.fuente,
      nivel: record.nivel || "",
      url: record.url || `${options.urlBase || "temas.html"}#${record.id || ""}`,
      keywords: Array.isArray(record.keywords) ? record.keywords : []
    });
  }

  function registerSearchSource(source) {
    if (!source?.id || typeof source.load !== "function") {
      return null;
    }

    searchSources.set(source.id, source);
    return source;
  }

  function getActiveSearchSources() {
    return ACTIVE_SEARCH_SOURCES
      .map((sourceId) => searchSources.get(sourceId))
      .filter(Boolean);
  }

  function createLegacyIndexSource() {
    return {
      id: "legacy-index",
      enabled: true,
      async load(options = {}) {
        const indexUrl = options.indexUrl || DEFAULT_INDEX_URL;
        const response = await fetch(indexUrl);

        if (!response.ok) {
          throw new Error("No se pudo cargar search-index.json");
        }

        const records = await response.json();
        return Array.isArray(records) ? records.map(normalizeRecord) : [];
      }
    };
  }

  function createKnowledgeCategorySource(id, path, defaults) {
    return {
      id: `knowledge-${id}`,
      enabled: false,
      path,
      async load() {
        // Futuro: conectar aqui el manifiesto, API estatica o endpoint que liste los JSON dentro de /knowledge/.
        // VITA podra reutilizar esta misma capa para recuperar temas validados sin depender del DOM.
        return [];
      },
      normalize(record) {
        return normalizeKnowledgeRecord(record, defaults);
      }
    };
  }

  function registerDefaultSearchSources() {
    registerSearchSource(createLegacyIndexSource());
    registerSearchSource(createKnowledgeCategorySource("enfermedades", KNOWLEDGE_CATEGORIES.enfermedades, {
      tipo: "enfermedad",
      categoria: "Enfermedades",
      prioridad: 1,
      urlBase: "temas.html"
    }));
    registerSearchSource(createKnowledgeCategorySource("sintomas", KNOWLEDGE_CATEGORIES.sintomas, {
      tipo: "sintoma",
      categoria: "Síntomas",
      prioridad: 2,
      urlBase: "temas.html"
    }));
    registerSearchSource(createKnowledgeCategorySource("medicamentos", KNOWLEDGE_CATEGORIES.medicamentos, {
      tipo: "medicamento",
      categoria: "Medicamentos",
      prioridad: 3,
      urlBase: "recursos.html"
    }));
    registerSearchSource(createKnowledgeCategorySource("prevencion", KNOWLEDGE_CATEGORIES.prevencion, {
      tipo: "bienestar",
      categoria: "Prevención",
      prioridad: 4,
      urlBase: "prevencion.html"
    }));
    registerSearchSource(createKnowledgeCategorySource("nutricion", KNOWLEDGE_CATEGORIES.nutricion, {
      tipo: "bienestar",
      categoria: "Nutrición",
      prioridad: 4,
      urlBase: "nutricion.html"
    }));
    registerSearchSource(createKnowledgeCategorySource("salud-mental", KNOWLEDGE_CATEGORIES.saludMental, {
      tipo: "bienestar",
      categoria: "Salud mental",
      prioridad: 4,
      urlBase: "bienestar-emocional.html"
    }));
    registerSearchSource(createKnowledgeCategorySource("adulto-mayor", KNOWLEDGE_CATEGORIES.adultoMayor, {
      tipo: "bienestar",
      categoria: "Adulto mayor",
      prioridad: 4,
      urlBase: "envejecimiento-saludable.html"
    }));
  }

  async function loadSearchSources(options = {}) {
    const sources = getActiveSearchSources();
    const recordsBySource = await Promise.all(sources.map((source) => source.load(options)));
    return recordsBySource.flat();
  }

  async function loadSearchIndex(indexUrl = DEFAULT_INDEX_URL) {
    if (!readyPromise) {
      readyPromise = loadSearchSources({ indexUrl }).then((records) => {
        searchIndex = records;
        return searchIndex;
      });
    }

    return readyPromise;
  }

  function getKnowledgeSources() {
    return {
      root: KNOWLEDGE_BASE_ROOT,
      categories: { ...KNOWLEDGE_CATEGORIES },
      active: [...ACTIVE_SEARCH_SOURCES],
      registered: [...searchSources.keys()]
    };
  }

  function scoreRecordVariant(record, query, intent = "") {
    const title = record._title || normalizeText(record.titulo);
    const titleSlug = record._slug || slugify(record.titulo);
    const category = normalizeText(record.categoria);
    const type = normalizeText(record.tipo);
    const keywords = record._keywords || (Array.isArray(record.keywords) ? record.keywords.map(normalizeText) : []);
    const keywordSlugs = record._keywordSlugs || (Array.isArray(record.keywords) ? record.keywords.map(slugify) : []);
    const querySlug = slugify(query);
    const intentBoost = intent && type === intent ? 18 : 0;
    const symptomSafetyBoost = intent === "sintoma" && type === "sintoma" ? 12 : 0;

    if (title === query || titleSlug === querySlug) return 120 + intentBoost;
    if (keywords.some((keyword) => keyword === query) || keywordSlugs.some((keyword) => keyword === querySlug)) return 105 + intentBoost + symptomSafetyBoost;
    if (title.length > 3 && query.includes(title)) return 100 + intentBoost;
    if (keywords.some((keyword) => keyword.length > 4 && query.includes(keyword))) return 88 + intentBoost + symptomSafetyBoost;
    if (title.startsWith(query) || titleSlug.startsWith(querySlug)) return 92 + intentBoost;
    if (keywords.some((keyword) => keyword.startsWith(query)) || keywordSlugs.some((keyword) => keyword.startsWith(querySlug))) return 78 + intentBoost;
    if (title.includes(query) || titleSlug.includes(querySlug)) return 64 + intentBoost;
    if (keywords.some((keyword) => keyword.includes(query)) || keywordSlugs.some((keyword) => keyword.includes(querySlug))) return 54 + intentBoost + symptomSafetyBoost;
    if (record._searchText.includes(query)) return 32 + intentBoost;
    if (category.includes(query)) return 25 + intentBoost;
    if (type.includes(query)) return 20 + intentBoost;
    return 0;
  }

  function scoreRecord(record, query, intent = "") {
    return createQueryVariants(query)
      .reduce((bestScore, variant) => Math.max(bestScore, scoreRecordVariant(record, variant, intent)), 0);
  }

  function isMedicationExplicitQuery(query) {
    const normalized = normalizeQueryText(query);
    if (/\b(medicamento|medicina|pastilla|jarabe|tableta|capsula|dosis|tomar)\b/.test(normalized)) {
      return true;
    }
    return searchIndex.some((record) => {
      const normalizedRecord = record._title ? record : normalizeRecord(record);
      return normalizeText(normalizedRecord.tipo) === "medicamento"
        && (normalizedRecord._title === normalized || normalizedRecord._slug === slugify(normalized));
    });
  }

  function typePriority(record, query, intent = "") {
    const type = normalizeText(record?.tipo || "");
    const medicationExplicit = intent === "medicamento" || isMedicationExplicitQuery(query);
    if (medicationExplicit) return type === "medicamento" ? 0 : type === "sintoma" ? 1 : 2;
    if (type === "sintoma") return 0;
    if (type === "enfermedad") return 1;
    if (type === "medicamento") return 2;
    return 3;
  }

  function medicationMatchIsSpecific(record, query) {
    const normalizedRecord = record._title ? record : normalizeRecord(record);
    const querySlug = slugify(query);
    return normalizedRecord._title === query
      || normalizedRecord._slug === querySlug
      || normalizedRecord._keywords.some((keyword) => keyword === query)
      || normalizedRecord._keywordSlugs.some((keyword) => keyword === querySlug);
  }

  function findRecord(records, query) {
    const queryCandidates = medicalQueryCandidates(query).map((candidate) => ({
      text: normalizeText(candidate),
      slug: slugify(candidate)
    }));
    const prepared = records.map((record) => {
      const normalizedRecord = record._title ? record : normalizeRecord(record);
      return {
        record,
        title: normalizedRecord._title,
        titleSlug: normalizedRecord._slug,
        keywords: normalizedRecord._keywords,
        keywordSlugs: normalizedRecord._keywordSlugs
      };
    });

    const exactTitle = queryCandidates.map((candidate) => prepared.find((item) => item.title === candidate.text)).find(Boolean);
    if (exactTitle) return exactTitle.record;

    const exactSlug = queryCandidates.map((candidate) => prepared.find((item) => item.titleSlug === candidate.slug)).find(Boolean);
    if (exactSlug) return exactSlug.record;

    const exactKeyword = queryCandidates.map((candidate) => prepared.find((item) => item.keywords.some((keyword) => keyword === candidate.text))).find(Boolean);
    if (exactKeyword) return exactKeyword.record;

    const exactKeywordSlug = queryCandidates.map((candidate) => prepared.find((item) => item.keywordSlugs.some((keyword) => keyword === candidate.slug))).find(Boolean);
    if (exactKeywordSlug) return exactKeywordSlug.record;

    const partial = queryCandidates
      .map((candidate) => prepared.find((item) => item.title.includes(candidate.text)
        || candidate.text.includes(item.title)
        || item.titleSlug.includes(candidate.slug)
        || candidate.slug.includes(item.titleSlug)
        || item.keywords.some((keyword) => keyword.includes(candidate.text) || candidate.text.includes(keyword))
        || item.keywordSlugs.some((keyword) => keyword.includes(candidate.slug) || candidate.slug.includes(keyword))))
      .find(Boolean);
    return partial ? partial.record : null;
  }

  function searchMedicalIndex(query, options = {}) {
    const normalizedQuery = normalizeQueryText(query);
    const limit = Number.isFinite(options.limit) ? options.limit : 8;
    const intent = detectQueryIntent(normalizedQuery);

    if (!normalizedQuery) {
      return [];
    }

    const entries = searchIndex
      .map((record) => {
        const score = scoreRecord(record, normalizedQuery, intent);
        const type = normalizeText(record?.tipo || "");
        const medicationExplicit = intent === "medicamento" || isMedicationExplicitQuery(normalizedQuery);
        const medicationPenalty = type === "medicamento" && !medicationExplicit
          ? (medicationMatchIsSpecific(record, normalizedQuery) ? 28 : 58)
          : 0;
        return {
          record,
          score: Math.max(0, score - medicationPenalty),
          priority: typePriority(record, normalizedQuery, intent)
        };
      })
      .filter((entry) => entry.score > 0)
      .sort((a, b) => {
        return b.score - a.score
          || a.priority - b.priority
          || a.record.prioridad - b.record.prioridad
          || a.record.titulo.localeCompare(b.record.titulo, "es");
      });

    const medicationExplicit = intent === "medicamento" || isMedicationExplicitQuery(normalizedQuery);
    const clinicallyOrientedEntries = intent === "sintoma" && !medicationExplicit
      ? entries.filter((entry) => normalizeText(entry.record?.tipo || "") !== "medicamento")
      : entries;

    return (clinicallyOrientedEntries.length ? clinicallyOrientedEntries : entries)
      .slice(0, limit)
      .map((entry) => entry.record);
  }

  function canonicalContextParam(context) {
    return context?.canonical && context.canonical !== "general" ? context.canonical : "";
  }

  function canonicalRecordSlug(record) {
    const url = String(record?.url || "");
    const query = url.split("?")[1] || "";
    const params = new URLSearchParams(query);
    return params.get("q") || slugify(record?.titulo || "");
  }

  function resolveSearchQuery(query, options = {}) {
    const limit = Number.isFinite(options.limit) ? options.limit : 8;
    const context = detectQueryContext(query);
    const record = findRecord(searchIndex, query) || searchMedicalIndex(query, { limit })[0] || null;
    const slug = canonicalRecordSlug(record) || slugify(stripContextLanguage(applyQueryCorrections(query)));
    const contextParam = canonicalContextParam(context);
    return {
      query,
      record,
      slug,
      tipo: normalizeText(record?.tipo || ""),
      visualCategory: "",
      prioridad: record?.prioridad || 4,
      context: contextParam || "general",
      url: slug ? `consulta.html?q=${encodeURIComponent(slug)}${contextParam ? `&context=${encodeURIComponent(contextParam)}` : ""}` : ""
    };
  }

  function getTypeIcon(type) {
    return TYPE_ICONS[normalizeText(type)] || "🔎";
  }

  function applyResultDetailStyles(element, styles) {
    Object.entries(styles).forEach(([property, value]) => {
      element.style[property] = value;
    });
  }

  function applyResultsPanelStyles(resultsElement) {
    if (!resultsElement) {
      return;
    }

    applyResultDetailStyles(resultsElement, {
      maxHeight: "min(430px, 58vh)",
      overflowY: "auto",
      overscrollBehavior: "contain"
    });
  }

  function readSearchHistory() {
    try {
      const history = JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) || "[]");
      return Array.isArray(history) ? history.slice(0, 5) : [];
    } catch (error) {
      return [];
    }
  }

  function findCanonicalHistoryTerm(query, selectedRecord) {
    if (selectedRecord?.titulo) {
      return selectedRecord.titulo;
    }

    const normalizedQuery = normalizeText(query);
    if (!normalizedQuery || normalizedQuery.length < 3) {
      return "";
    }

    const matchedRecord = searchMedicalIndex(normalizedQuery, { limit: 1 })[0];
    return matchedRecord?.titulo || "";
  }

  function saveSearchTerm(query, selectedRecord) {
    const term = findCanonicalHistoryTerm(query, selectedRecord);
    if (!term) {
      return readSearchHistory();
    }

    const normalizedTerm = normalizeText(term);
    const history = readSearchHistory().filter((item) => normalizeText(item) !== normalizedTerm);
    const nextHistory = [term, ...history].slice(0, 5);

    try {
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(nextHistory));
      // Integracion futura: enviar aqui un evento anonimo si luego se habilita analitica externa.
    } catch (error) {
      return history;
    }

    return nextHistory;
  }

  function hasNavigableUrl(record) {
    return typeof record?.url === "string" && record.url.trim() && record.url.trim() !== "#";
  }

  function selectSearchResult(record, context = {}) {
    const title = record?.titulo || "";
    saveSearchTerm(title, record);

    if (context.preserveQuery && context.input?.value?.trim()) {
      const resolved = resolveSearchQuery(context.input.value.trim(), { limit: context.limit || 8 });
      window.location.href = resolved.url || `consulta.html?q=${encodeURIComponent(context.input.value.trim())}`;
      return;
    }

    if (hasNavigableUrl(record)) {
      window.location.href = record.url.trim();
      return;
    }

    const { input, resultsElement, limit = 8, vitaUrl = DEFAULT_VITA_URL } = context;
    if (!input || !resultsElement || !title) {
      return;
    }

    input.value = title;
    const results = searchMedicalIndex(title, { limit });
    renderResults(resultsElement, results, vitaUrl, context);
    activateResultsPanel(input, resultsElement);
    input.focus();
  }

  function createResultItem(record, context = {}) {
    const item = document.createElement("a");
    item.className = "medical-search-result";
    item.href = record.url || "#";
    item.setAttribute("role", "option");
    item.tabIndex = 0;
    item.addEventListener("click", (event) => {
      event.preventDefault();
      selectSearchResult(record, context);
    });
    item.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        selectSearchResult(record, context);
      }
    });
    applyResultDetailStyles(item, {
      cursor: "pointer",
      gap: "5px",
      minHeight: "82px"
    });

    const title = document.createElement("strong");
    title.className = "medical-search-result__title";
    title.textContent = record.titulo || "Resultado";

    item.append(title);

    if (record.description) {
      const description = document.createElement("span");
      description.className = "medical-search-result__description";
      description.textContent = record.description;
      applyResultDetailStyles(description, {
        color: "#5f6f68",
        display: "-webkit-box",
        fontSize: ".78rem",
        lineHeight: "1.35",
        overflow: "hidden",
        WebkitBoxOrient: "vertical",
        WebkitLineClamp: "2"
      });
      item.append(description);
    }

    if (record.fuente) {
      const source = document.createElement("span");
      source.className = "medical-search-result__source";
      source.textContent = `Fuente: ${record.fuente}`;
      applyResultDetailStyles(source, {
        color: "#7a8781",
        fontSize: ".68rem",
        fontWeight: "700",
        lineHeight: "1.25",
        marginTop: "1px"
      });
      item.append(source);
    }

    return item;
  }

  function renderEmptyState(resultsElement, vitaUrl = DEFAULT_VITA_URL) {
    resultsElement.innerHTML = "";

    const empty = document.createElement("div");
    empty.className = "medical-search-empty";

    const message = document.createElement("p");
    message.textContent = "No encontramos un resultado exacto. Puedes intentar con otro término o hablar con VITA.";

    const action = document.createElement("a");
    action.className = "medical-search-empty__button";
    action.href = vitaUrl;
    action.textContent = "Consultar con VITA";

    empty.append(message, action);
    resultsElement.append(empty);
  }

  function renderResults(resultsElement, results, vitaUrl = DEFAULT_VITA_URL, context = {}) {
    resultsElement.innerHTML = "";
    applyResultsPanelStyles(resultsElement);

    if (!results.length) {
      renderEmptyState(resultsElement, vitaUrl);
      return;
    }

    const list = document.createElement("div");
    list.className = "medical-search-results-list";
    results.forEach((record) => list.append(createResultItem(record, {
      ...context,
      resultsElement,
      vitaUrl
    })));
    resultsElement.append(list);
  }

  function activateResultsPanel(input, resultsElement) {
    resultsElement.classList.add("active");
    input.setAttribute("aria-expanded", "true");
  }

  function closeResultsPanel(input, resultsElement) {
    resultsElement.classList.remove("active");
    resultsElement.innerHTML = "";
    input.setAttribute("aria-expanded", "false");
  }

  function enhanceClearButton(input, resultsElement) {
    if (!input || !resultsElement || input.dataset.medicalClearEnhanced === "true") {
      return;
    }

    const parent = input.parentElement;
    if (!parent) return;

    input.dataset.medicalClearEnhanced = "true";
    if (getComputedStyle(parent).position === "static") {
      parent.style.position = "relative";
    }

    const button = document.createElement("button");
    button.type = "button";
    button.className = "medical-search-clear";
    button.setAttribute("aria-label", "Limpiar búsqueda");
    button.textContent = "×";
    applyResultDetailStyles(button, {
      alignItems: "center",
      background: "rgba(255, 255, 255, .94)",
      border: "1px solid rgba(42, 64, 55, .16)",
      borderRadius: "999px",
      color: "#53645c",
      cursor: "pointer",
      display: "none",
      fontSize: "1.1rem",
      fontWeight: "800",
      height: "28px",
      justifyContent: "center",
      lineHeight: "1",
      position: "absolute",
      right: "96px",
      top: "50%",
      transform: "translateY(-50%)",
      width: "28px",
      zIndex: "4"
    });

    const syncVisibility = () => {
      button.style.display = normalizeText(input.value) ? "flex" : "none";
    };

    button.addEventListener("click", () => {
      input.value = "";
      closeResultsPanel(input, resultsElement);
      syncVisibility();
      input.focus();
    });
    input.addEventListener("input", syncVisibility);
    input.addEventListener("search", syncVisibility);
    parent.append(button);
    syncVisibility();
  }

  function renderInteractiveSearch(input, resultsElement, options = {}) {
    const query = input.value.trim();

    if (!normalizeText(query)) {
      closeResultsPanel(input, resultsElement);
      return;
    }

    const limit = Number.isFinite(options.limit) ? options.limit : 8;
    const vitaUrl = options.vitaUrl || DEFAULT_VITA_URL;
    renderResults(resultsElement, searchMedicalIndex(query, { limit }), vitaUrl, {
      input,
      resultsElement,
      limit,
      vitaUrl
    });
    activateResultsPanel(input, resultsElement);
  }

  function enhanceHomeMedicalSearch() {
    const input = document.querySelector("#medical-search-input");
    const resultsElement = document.querySelector("#medical-search-results");
    const form = input?.closest("form");

    if (!input || !resultsElement || input.dataset.medicalSearchEnhanced === "true") {
      return;
    }

    input.dataset.medicalSearchEnhanced = "true";
    enhanceClearButton(input, resultsElement);

    const scheduleRender = () => {
      window.setTimeout(() => {
        renderInteractiveSearch(input, resultsElement);
      }, 0);
    };

    loadSearchIndex().then(() => {
      const submitFirstResult = () => {
        const query = input.value.trim();
        const results = searchMedicalIndex(query, { limit: 8 });

        if (!normalizeText(query)) {
          closeResultsPanel(input, resultsElement);
          return;
        }

        if (results.length) {
          selectSearchResult(results[0], {
            input,
            preserveQuery: true,
            resultsElement,
            limit: 8,
            vitaUrl: DEFAULT_VITA_URL
          });
          return;
        }

        renderResults(resultsElement, [], DEFAULT_VITA_URL, {
          input,
          resultsElement,
          limit: 8,
          vitaUrl: DEFAULT_VITA_URL
        });
        activateResultsPanel(input, resultsElement);
      };

      ["input", "search", "keyup", "change"].forEach((eventName) => {
        input.addEventListener(eventName, scheduleRender);
      });

      form?.addEventListener("submit", (event) => {
        event.preventDefault();
        submitFirstResult();
      });

      input.addEventListener("keydown", (event) => {
        if (event.key !== "Enter") {
          return;
        }

        event.preventDefault();
        submitFirstResult();
      });
    });
  }

  function attachMedicalSearch(options = {}) {
    const inputSelector = options.inputSelector || DEFAULT_SELECTORS.input;
    const resultsSelector = options.resultsSelector || DEFAULT_SELECTORS.results;
    const input = options.input || document.querySelector(inputSelector);
    const resultsElement = options.resultsElement || document.querySelector(resultsSelector);

    if (!input || !resultsElement) {
      return null;
    }

    const limit = Number.isFinite(options.limit) ? options.limit : 8;
    const vitaUrl = options.vitaUrl || DEFAULT_VITA_URL;

    loadSearchIndex(options.indexUrl || DEFAULT_INDEX_URL).then(() => {
      const updateResults = () => {
        const query = input.value;
        const results = searchMedicalIndex(query, { limit });

        if (!normalizeText(query)) {
          resultsElement.innerHTML = "";
          return;
        }

        renderResults(resultsElement, results, vitaUrl, {
          input,
          resultsElement,
          limit,
          vitaUrl
        });
      };

      input.addEventListener("input", updateResults);
      updateResults();
    });

    return {
      input,
      resultsElement,
      search(query) {
        return searchMedicalIndex(query, { limit });
      }
    };
  }

  document.addEventListener("DOMContentLoaded", () => {
    attachMedicalSearch();
    enhanceHomeMedicalSearch();
  });

  registerDefaultSearchSources();

  window.IDBMedicalSearch = {
    attach: attachMedicalSearch,
    detectQueryContext,
    findRecord,
    getKnowledgeSources,
    getHistory: readSearchHistory,
    iconForType: getTypeIcon,
    interpretQuery: interpretMedicalQuery,
    load: loadSearchIndex,
    medicalQueryCandidates,
    normalizeQueryIntent: applyQueryCorrections,
    normalize: normalizeText,
    resolve: resolveSearchQuery,
    saveSearch: saveSearchTerm,
    search: searchMedicalIndex
  };
})();
