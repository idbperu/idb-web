const DEFAULT_LIMIT = 8;
const MAX_CACHE_ENTRIES = 64;

export function normalizeClinicalText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[¿?¡!.,;:()[\]{}'"/\\_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function words(value) {
  return normalizeClinicalText(value).split(" ").filter(Boolean);
}

function phraseMatches(text, phrase) {
  if (!text || !phrase) return false;
  return (` ${text} `).includes(` ${phrase} `);
}

function recordSlug(record) {
  const query = String(record?.url || "").split("?")[1] || "";
  return new URLSearchParams(query).get("q") || "";
}

function uniqueBySlug(records) {
  const seen = new Set();
  return records.filter((record) => {
    const slug = recordSlug(record);
    if (!slug || seen.has(slug)) return false;
    seen.add(slug);
    return true;
  });
}

function targetSlugs(entry) {
  if (entry?.target?.slug) return [entry.target.slug];
  return (entry?.candidates || []).map((candidate) => candidate?.target?.slug || candidate?.slug).filter(Boolean);
}

function levenshtein(a, b) {
  const left = normalizeClinicalText(a);
  const right = normalizeClinicalText(b);
  if (!left) return right.length;
  if (!right) return left.length;
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    let diagonal = previous[0];
    previous[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const saved = previous[j];
      previous[j] = Math.min(previous[j] + 1, previous[j - 1] + 1, diagonal + (left[i - 1] === right[j - 1] ? 0 : 1));
      diagonal = saved;
    }
  }
  return previous[right.length];
}

function isNegated(text, phrase) {
  const index = text.indexOf(phrase);
  if (index < 0) return false;
  const prefix = text.slice(Math.max(0, index - 34), index);
  return /(?:^|\s)(?:no|sin|nunca|tampoco|niega|no tengo|no presenta|no tiene)\s+(?:\w+\s+){0,2}$/.test(prefix);
}

function containsAny(text, values) {
  return values.some((value) => phraseMatches(text, value));
}

function findPatternMatches(text, groups = {}) {
  return Object.entries(groups)
    .map(([name, patterns]) => ({ name, matches: (patterns || []).filter((pattern) => phraseMatches(text, normalizeClinicalText(pattern))) }))
    .filter((entry) => entry.matches.length);
}

function normalizeReference(reference) {
  if (!reference?.slug) return null;
  return { id: reference.id || "", slug: reference.slug, type: reference.type || "" };
}

export function createClinicalSearchEngine(dictionary, records, options = {}) {
  const start = globalThis.performance?.now?.() ?? Date.now();
  const clinicalRecords = Array.isArray(records) ? records : [];
  const bySlug = new Map();
  const preparedRecords = clinicalRecords.map((record) => {
    const slug = recordSlug(record);
    const aliases = Array.isArray(record.aliases) ? record.aliases : [];
    const keywords = Array.isArray(record.keywords) ? record.keywords : [];
    const prepared = {
      record,
      slug,
      type: normalizeClinicalText(record.tipo),
      title: normalizeClinicalText(record.titulo),
      titleWords: words(record.titulo),
      aliases: aliases.map(normalizeClinicalText).filter(Boolean),
      keywords: keywords.map(normalizeClinicalText).filter(Boolean),
      searchText: normalizeClinicalText([record.titulo, record.tipo, record.categoria, record.description, ...aliases, ...keywords].join(" "))
    };
    if (slug) bySlug.set(slug, prepared);
    return prepared;
  });

  const phraseEntries = [];
  const registerSection = (section, source, baseWeight) => {
    Object.entries(section || {}).forEach(([rawPhrase, entry]) => {
      const phrase = normalizeClinicalText(rawPhrase);
      if (!phrase || phrase.length < 3) return;
      phraseEntries.push({ phrase, source, baseWeight, entry, slugs: targetSlugs(entry) });
    });
  };
  registerSection(dictionary?.colloquial_expressions, "colloquial_expression", 165);
  registerSection(dictionary?.spelling_variants, "spelling_variant", 158);
  registerSection(dictionary?.abbreviations, "abbreviation", 155);
  registerSection(dictionary?.synonyms, "synonym", 145);
  registerSection(dictionary?.keyword_index, "keyword", 82);
  phraseEntries.sort((a, b) => b.phrase.length - a.phrase.length || b.baseWeight - a.baseWeight);

  const spellingEntries = Object.entries(dictionary?.spelling_variants || {})
    .map(([phrase, entry]) => ({ phrase: normalizeClinicalText(phrase), corrected: normalizeClinicalText(entry.corrected), entry }))
    .filter((entry) => entry.phrase && entry.corrected)
    .sort((a, b) => b.phrase.length - a.phrase.length);

  const cache = new Map();
  const metrics = {
    dictionaryVersion: dictionary?.version || "unknown",
    recordCount: clinicalRecords.length,
    phraseCount: phraseEntries.length,
    resolutionCount: 0,
    cacheHits: 0,
    totalResolutionMs: 0,
    initializationMs: 0
  };

  function applySpellingCorrections(text) {
    let corrected = text;
    const applied = [];
    spellingEntries.forEach((entry) => {
      if (!phraseMatches(corrected, entry.phrase)) return;
      corrected = (` ${corrected} `).replace(` ${entry.phrase} `, ` ${entry.corrected} `).trim();
      applied.push({ from: entry.phrase, to: entry.corrected });
    });
    return { corrected, applied };
  }

  function inferContexts(text) {
    const matched = findPatternMatches(text, dictionary?.patient_context);
    return matched.map((entry) => ({ context: entry.name, evidence: entry.matches }));
  }

  function inferTemporal(text) {
    return findPatternMatches(text, dictionary?.temporal_terms).map((entry) => ({ category: entry.name, evidence: entry.matches }));
  }

  function inferIntensity(text) {
    return findPatternMatches(text, dictionary?.intensity_terms).map((entry) => ({ category: entry.name, evidence: entry.matches }));
  }

  function inferUrgency(text) {
    const direct = findPatternMatches(text, dictionary?.urgency_terms);
    const clinicalCombination = [];
    if ((/respir|ahog/.test(text) && /pecho|opresion|presion/.test(text)) || (/dolor de pecho/.test(text) && /desde ayer|repentino|fuerte/.test(text))) {
      clinicalCombination.push("respiratory_chest_combination");
    }
    return {
      detected: direct.length > 0 || clinicalCombination.length > 0,
      matches: direct,
      combinations: clinicalCombination
    };
  }

  function inferMotive(text) {
    const matches = findPatternMatches(text, dictionary?.consultation_motives);
    const order = ["examen_solicitado", "interpretar_resultado", "conocer_preparacion", "conocer_riesgos", "buscar_orientacion", "aprender"];
    const primary = order.find((name) => matches.some((entry) => entry.name === name)) || "buscar_orientacion";
    return { primary, secondary: matches.map((entry) => entry.name).filter((name) => name !== primary), evidence: matches };
  }

  function inferIntent(text, motive, concepts) {
    const patternMatches = findPatternMatches(text, dictionary?.intent_patterns);
    const types = new Set(concepts.filter((concept) => !concept.negated).map((concept) => concept.type));
    const symptomLanguage = patternMatches.some((entry) => entry.name === "sintoma") || /\b(?:dolor|fiebre|sed|ardor|respirar|opresion|molestia|siento|tengo)\b/.test(text);
    const explicitExam = motive.primary === "examen_solicitado" || /\b(?:examen|analisis|resultado|ferritina|resonancia|radiografia|mapa|colonoscopia)\b/.test(text);
    const explicitMedication = types.has("medicamento") && containsAny(text, ["para que sirve", "como tomar", "medicamento", "pastilla", "dosis"]);
    const exactCanonicalType = preparedRecords.find((prepared) => prepared.title === text)?.type || "";
    let primary = "general";
    if (exactCanonicalType) primary = exactCanonicalType;
    else if (explicitMedication && !symptomLanguage) primary = "medicamento";
    else if (motive.primary === "examen_solicitado" || (explicitExam && !symptomLanguage)) primary = "examen";
    else if (symptomLanguage) primary = "sintoma";
    else if (types.has("sintoma")) primary = "sintoma";
    else if (types.has("enfermedad")) primary = "enfermedad";
    else if (types.has("examen")) primary = "examen";
    else if (types.has("medicamento")) primary = "medicamento";
    else if (patternMatches.some((entry) => entry.name === "prevencion")) primary = "prevencion";
    else if (patternMatches.some((entry) => entry.name === "procedimiento")) primary = "procedimiento";
    const secondary = [...new Set([
      ...patternMatches.map((entry) => entry.name),
      ...concepts.filter((concept) => !concept.negated).map((concept) => concept.type)
    ])].filter((name) => name && name !== primary);
    return { primary, secondary, evidence: patternMatches };
  }

  function addConcept(concepts, slug, evidence) {
    const prepared = bySlug.get(slug);
    if (!prepared) return;
    const current = concepts.get(slug);
    const concept = {
      slug,
      id: evidence.reference?.id || "",
      type: prepared.type,
      title: prepared.record.titulo,
      negated: Boolean(evidence.negated),
      score: evidence.score,
      evidence: [{ phrase: evidence.phrase, source: evidence.source }]
    };
    if (!current) {
      concepts.set(slug, concept);
      return;
    }
    current.score = Math.max(current.score, concept.score);
    current.negated = current.negated && concept.negated;
    current.evidence.push(...concept.evidence);
  }

  function addCompositeConcept(concepts, slug, score, phrase, source = "clinical_rule") {
    addConcept(concepts, slug, { score, phrase, source, negated: false, reference: { slug } });
  }

  function extractConcepts(text) {
    const concepts = new Map();
    phraseEntries.forEach((candidate) => {
      if (!phraseMatches(text, candidate.phrase)) return;
      const negated = isNegated(text, candidate.phrase);
      candidate.slugs.forEach((slug) => {
        addConcept(concepts, slug, {
          score: candidate.baseWeight + Math.min(35, candidate.phrase.length),
          phrase: candidate.phrase,
          source: candidate.source,
          negated,
          reference: candidate.entry?.target || candidate.entry?.candidates?.find((entry) => (entry.target?.slug || entry.slug) === slug)?.target
        });
      });
      (candidate.entry?.alternatives || []).forEach((reference) => {
        addConcept(concepts, reference.slug, { score: candidate.baseWeight - 28, phrase: candidate.phrase, source: "alternative", negated, reference });
      });
    });

    preparedRecords.forEach((prepared) => {
      const exactTerms = [prepared.title, ...prepared.aliases].filter((term) => term.length >= 3);
      exactTerms.forEach((term) => {
        if (!phraseMatches(text, term)) return;
        addConcept(concepts, prepared.slug, {
          score: 178 + Math.min(35, term.length), phrase: term, source: term === prepared.title ? "canonical_title" : "record_alias",
          negated: isNegated(text, term), reference: { slug: prepared.slug }
        });
      });
    });

    if (/garganta/.test(text) && /duele|dolor|tragar|ardor/.test(text)) addCompositeConcept(concepts, "dolor-de-garganta", 245, "garganta+doler/tragar");
    if (/mucha sed|sed excesiva|sed intensa/.test(text)) addCompositeConcept(concepts, "sed-excesiva", 220, "sed excesiva");
    if (/orino|orinar|bano a cada rato|miccion frecuente/.test(text)) addCompositeConcept(concepts, "orinar-frecuente", 205, "miccion frecuente");
    if ((/sed/.test(text) && /orino|orinar|bano/.test(text) && /peso|adelgaz/.test(text)) || /azucar alta|glucosa alta/.test(text)) addCompositeConcept(concepts, "diabetes", 275, "sed+miccion+peso");
    if (/respirar|ahogo|falta de aire/.test(text)) addCompositeConcept(concepts, "dificultad-para-respirar", 260, "dificultad respiratoria");
    if (/pecho/.test(text) && /presion|opresion|dolor/.test(text)) addCompositeConcept(concepts, "dolor-de-pecho", 265, "presion/dolor de pecho");
    if (/estomago|barriga|abdomen/.test(text) && /arde|ardor|acidez/.test(text)) {
      addCompositeConcept(concepts, "gastritis", 250, "estomago+ardor");
      addCompositeConcept(concepts, "acidez", 240, "ardor/acidez");
    }
    if (/espalda|lumbar|parte baja/.test(text) && /dolor|duele/.test(text)) addCompositeConcept(concepts, "dolor-de-espalda", 250, "dolor lumbar/espalda");
    if (/hueso|huesos/.test(text) && /dolor|duele|duelen/.test(text)) {
      addCompositeConcept(concepts, "dolor-articular", 235, "dolor en huesos");
      addCompositeConcept(concepts, "dolor-muscular", 185, "alternativa musculoesqueletica");
    }
    if (/ferritina/.test(text)) addCompositeConcept(concepts, "ferritina", 265, "ferritina explicita");
    if (/resonancia|\brm\b/.test(text) && /rodilla/.test(text)) addCompositeConcept(concepts, "resonancia-magnetica-de-rodilla", 280, "resonancia+rodilla");
    if (/\bmapa\b/.test(text)) addCompositeConcept(concepts, "monitoreo-ambulatorio-de-presion-arterial-mapa", 285, "MAPA explicito");
    if (/presion alta|hipertension/.test(text)) addCompositeConcept(concepts, "hipertension", 230, "presion alta");
    if (/colonoscopia/.test(text)) addCompositeConcept(concepts, "colonoscopia", 280, "colonoscopia explicita");
    if (/ibuprofeno/.test(text)) addCompositeConcept(concepts, "ibuprofeno", 280, "ibuprofeno explicito");
    if (/placa|placas|radiografia|\brx\b/.test(text) && /torax|pecho/.test(text)) addCompositeConcept(concepts, "radiografia-de-torax", 270, "placa/radiografia+torax");
    if (/fiebre/.test(text)) addConcept(concepts, "fiebre", { score: 205, phrase: "fiebre", source: "clinical_term", negated: isNegated(text, "fiebre"), reference: { slug: "fiebre" } });
    return [...concepts.values()].sort((a, b) => Number(a.negated) - Number(b.negated) || b.score - a.score);
  }

  function analyze(query) {
    const raw = normalizeClinicalText(query);
    const spelling = applySpellingCorrections(raw);
    const concepts = extractConcepts(spelling.corrected);
    const motive = inferMotive(spelling.corrected);
    const intent = inferIntent(spelling.corrected, motive, concepts);
    return {
      raw,
      normalized: spelling.corrected,
      corrections: spelling.applied,
      intent,
      concepts,
      negations: concepts.filter((concept) => concept.negated),
      temporal: inferTemporal(spelling.corrected),
      intensity: inferIntensity(spelling.corrected),
      context: inferContexts(spelling.corrected),
      motive,
      urgency: inferUrgency(spelling.corrected)
    };
  }

  function scorePreparedRecord(prepared, analysis) {
    let score = 0;
    const reasons = [];
    const concept = analysis.concepts.find((item) => item.slug === prepared.slug);
    if (concept) {
      score += concept.negated ? -320 : concept.score;
      reasons.push(concept.negated ? `concepto negado: ${concept.title}` : `concepto detectado: ${concept.title}`);
    }
    const queryTokens = words(analysis.normalized).filter((token) => token.length > 2);
    const matchedTokens = queryTokens.filter((token) => prepared.searchText.includes(token));
    score += Math.min(58, matchedTokens.length * 8);
    if (matchedTokens.length) reasons.push(`términos coincidentes: ${matchedTokens.slice(0, 4).join(", ")}`);

    const intentType = analysis.intent.primary;
    if (intentType === prepared.type) {
      score += 48;
      reasons.push(`tipo compatible: ${intentType}`);
    }
    if (intentType === "procedimiento" && prepared.type === "examen") score += 30;
    if (analysis.motive.primary === "examen_solicitado" && prepared.type === "examen") {
      score += 72;
      reasons.push("examen solicitado explícitamente");
    }
    if (analysis.motive.primary === "interpretar_resultado" && prepared.type === "examen") score += 55;
    const symptomDescription = intentType === "sintoma" || analysis.intent.evidence.some((entry) => entry.name === "sintoma");
    if (prepared.type === "medicamento" && symptomDescription && analysis.intent.primary !== "medicamento") {
      score -= 280;
      reasons.push("medicamento penalizado ante descripción de síntomas");
    }
    if (prepared.type === "medicamento" && analysis.intent.primary === "medicamento" && concept) score += 90;
    if (analysis.urgency.detected && prepared.type === "sintoma" && /pecho|respirar|desmayo|convulsion/.test(prepared.searchText)) {
      score += 72;
      reasons.push("señal de alarma compatible");
    }
    return { score, reasons };
  }

  function fuzzySuggestions(query, excluded = new Set()) {
    const queryText = normalizeClinicalText(query);
    if (!queryText) return [];
    return preparedRecords
      .filter((prepared) => prepared.slug && !excluded.has(prepared.slug))
      .map((prepared) => {
        const titleDistance = levenshtein(queryText, prepared.title);
        const tokenOverlap = words(queryText).filter((token) => token.length > 3 && prepared.searchText.includes(token)).length;
        return { prepared, score: tokenOverlap * 12 - titleDistance };
      })
      .filter((entry) => entry.score > -Math.max(8, Math.round(queryText.length * 0.45)))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((entry) => entry.prepared.record);
  }

  function buildExplanation(analysis, ranked) {
    const parts = [`Intención principal: ${analysis.intent.primary}.`];
    if (analysis.motive.primary) parts.push(`Motivo: ${analysis.motive.primary.replace(/_/g, " ")}.`);
    const affirmed = analysis.concepts.filter((concept) => !concept.negated).slice(0, 3).map((concept) => concept.title);
    if (affirmed.length) parts.push(`Conceptos: ${affirmed.join(", ")}.`);
    const negated = analysis.concepts.filter((concept) => concept.negated).map((concept) => concept.title);
    if (negated.length) parts.push(`Conceptos negados sin impulso de ranking: ${negated.join(", ")}.`);
    if (analysis.urgency.detected) parts.push("Se detectaron expresiones que requieren priorizar orientación de seguridad.");
    if (ranked[0]?.reasons?.length) parts.push(`Resultado principal por ${ranked[0].reasons.slice(0, 3).join("; ")}.`);
    return parts.join(" ");
  }

  function confidenceFor(analysis, ranked) {
    if (!ranked.length || ranked[0].score <= 0) return { score: 0, level: "none", basis: "Sin coincidencia clínica confiable." };
    const gap = ranked.length > 1 ? ranked[0].score - ranked[1].score : ranked[0].score;
    const evidence = analysis.concepts.filter((concept) => !concept.negated).length;
    const score = Math.max(1, Math.min(100, Math.round(38 + Math.min(32, ranked[0].score / 12) + Math.min(18, gap / 8) + Math.min(12, evidence * 3))));
    return {
      score,
      level: score >= 80 ? "high" : score >= 58 ? "medium" : "low",
      basis: `Puntuación de recuperación basada en ${evidence} concepto(s), compatibilidad de intención y separación de ranking. No representa probabilidad médica.`
    };
  }

  function resolve(query, resolveOptions = {}) {
    const limit = Number.isFinite(resolveOptions.limit) ? resolveOptions.limit : DEFAULT_LIMIT;
    const cacheKey = `${normalizeClinicalText(query)}|${limit}`;
    if (cache.has(cacheKey)) {
      metrics.cacheHits += 1;
      return cache.get(cacheKey);
    }
    const resolutionStart = globalThis.performance?.now?.() ?? Date.now();
    const analysis = analyze(query);
    const ranked = preparedRecords
      .map((prepared) => ({ prepared, ...scorePreparedRecord(prepared, analysis) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score || Number(a.prepared.record.prioridad || 4) - Number(b.prepared.record.prioridad || 4));

    const rankedRecords = uniqueBySlug(ranked.map((entry) => entry.prepared.record));
    const primaryResult = rankedRecords[0] || null;
    const fallbackResults = Array.isArray(resolveOptions.fallbackResults) ? resolveOptions.fallbackResults : [];
    const combined = uniqueBySlug([...rankedRecords, ...fallbackResults]);
    const reliable = Boolean(primaryResult && ranked[0]?.score >= 105);
    const suggestions = reliable
      ? combined.filter((record) => record !== primaryResult).slice(0, 3)
      : uniqueBySlug([...combined, ...fuzzySuggestions(query, new Set(combined.map(recordSlug)))]).slice(0, 3);
    const results = reliable ? combined.slice(0, limit) : (combined.length ? combined : suggestions).slice(0, limit);
    const relatedResults = results.filter((record) => record !== primaryResult && normalizeClinicalText(record.tipo) !== "medicamento").slice(0, 5);
    const exams = results.filter((record) => normalizeClinicalText(record.tipo) === "examen").slice(0, 5);
    const medications = analysis.intent.primary === "medicamento"
      ? results.filter((record) => normalizeClinicalText(record.tipo) === "medicamento").slice(0, 4)
      : results.filter((record) => normalizeClinicalText(record.tipo) === "medicamento" && record !== primaryResult).slice(0, 2);
    const confidence = confidenceFor(analysis, ranked);
    const result = {
      engine: "RCO 2.0",
      intent: analysis.intent,
      concepts: analysis.concepts,
      primaryResult,
      relatedResults,
      exams,
      medications,
      rco: {
        version: "2.0",
        available: Boolean(primaryResult?.rco),
        source: primaryResult?.rco ? "search-index" : "clinical-dictionary",
        data: primaryResult?.rco || null,
        urgency: analysis.urgency,
        context: analysis.context,
        temporal: analysis.temporal,
        intensity: analysis.intensity,
        motive: analysis.motive
      },
      suggestions,
      explanation: buildExplanation(analysis, ranked),
      confidence,
      results,
      reliable
    };
    const elapsed = (globalThis.performance?.now?.() ?? Date.now()) - resolutionStart;
    metrics.resolutionCount += 1;
    metrics.totalResolutionMs += elapsed;
    result.performance = { resolutionMs: Number(elapsed.toFixed(3)), cached: false };
    cache.set(cacheKey, result);
    if (cache.size > MAX_CACHE_ENTRIES) cache.delete(cache.keys().next().value);
    return result;
  }

  metrics.initializationMs = Number(((globalThis.performance?.now?.() ?? Date.now()) - start).toFixed(3));
  return {
    analyze,
    resolve,
    search(query, searchOptions = {}) {
      return resolve(query, searchOptions).results;
    },
    metrics() {
      return {
        ...metrics,
        averageResolutionMs: metrics.resolutionCount ? Number((metrics.totalResolutionMs / metrics.resolutionCount).toFixed(3)) : 0,
        cacheSize: cache.size
      };
    },
    clearCache() {
      cache.clear();
    }
  };
}
