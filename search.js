(function () {
  const DEFAULT_INDEX_URL = "search-index.json";
  const DEFAULT_VITA_URL = "https://wa.me/?text=Hola%20VITA%2C%20necesito%20orientaci%C3%B3n%20sobre%20bienestar.";
  const DEFAULT_SELECTORS = {
    input: "[data-medical-search-input]",
    results: "[data-medical-search-results]"
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

  function normalizeText(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function normalizeRecord(record) {
    const searchableParts = [
      record.titulo,
      record.tipo,
      record.categoria,
      ...(Array.isArray(record.keywords) ? record.keywords : [])
    ];

    return {
      ...record,
      prioridad: Number.isFinite(Number(record.prioridad)) ? Number(record.prioridad) : 4,
      _searchText: normalizeText(searchableParts.join(" "))
    };
  }

  async function loadSearchIndex(indexUrl = DEFAULT_INDEX_URL) {
    if (!readyPromise) {
      readyPromise = fetch(indexUrl)
        .then((response) => {
          if (!response.ok) {
            throw new Error("No se pudo cargar search-index.json");
          }
          return response.json();
        })
        .then((records) => {
          searchIndex = Array.isArray(records) ? records.map(normalizeRecord) : [];
          return searchIndex;
        });
    }

    return readyPromise;
  }

  function scoreRecord(record, query) {
    const title = normalizeText(record.titulo);
    const category = normalizeText(record.categoria);
    const type = normalizeText(record.tipo);
    const keywords = Array.isArray(record.keywords) ? record.keywords.map(normalizeText) : [];

    if (title === query) return 100;
    if (title.startsWith(query)) return 80;
    if (keywords.some((keyword) => keyword === query)) return 70;
    if (keywords.some((keyword) => keyword.startsWith(query))) return 60;
    if (title.includes(query)) return 50;
    if (keywords.some((keyword) => keyword.includes(query))) return 40;
    if (category.includes(query)) return 25;
    if (type.includes(query)) return 20;
    if (record._searchText.includes(query)) return 10;
    return 0;
  }

  function searchMedicalIndex(query, options = {}) {
    const normalizedQuery = normalizeText(query);
    const limit = Number.isFinite(options.limit) ? options.limit : 8;

    if (!normalizedQuery) {
      return [];
    }

    return searchIndex
      .map((record) => ({ record, score: scoreRecord(record, normalizedQuery) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => {
        return b.score - a.score
          || a.record.prioridad - b.record.prioridad
          || a.record.titulo.localeCompare(b.record.titulo, "es");
      })
      .slice(0, limit)
      .map((entry) => entry.record);
  }

  function getTypeIcon(type) {
    return TYPE_ICONS[normalizeText(type)] || "🔎";
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

  function createResultItem(record) {
    const item = document.createElement("a");
    item.className = "medical-search-result";
    item.href = record.url || "#";
    item.addEventListener("click", () => saveSearchTerm(record.titulo, record));

    const meta = document.createElement("span");
    meta.className = "medical-search-result__meta";
    meta.textContent = `${getTypeIcon(record.tipo)} ${record.tipo || "recurso"}`;

    const title = document.createElement("strong");
    title.className = "medical-search-result__title";
    title.textContent = record.titulo || "Resultado";

    item.append(meta, title);
    return item;
  }

  function renderEmptyState(resultsElement, vitaUrl = DEFAULT_VITA_URL) {
    resultsElement.innerHTML = "";

    const empty = document.createElement("div");
    empty.className = "medical-search-empty";

    const message = document.createElement("p");
    message.textContent = "No encontramos resultados.";

    const action = document.createElement("a");
    action.className = "medical-search-empty__button";
    action.href = vitaUrl;
    action.textContent = "Consultar con VITA";

    empty.append(message, action);
    resultsElement.append(empty);
  }

  function renderResults(resultsElement, results, vitaUrl = DEFAULT_VITA_URL) {
    resultsElement.innerHTML = "";

    if (!results.length) {
      renderEmptyState(resultsElement, vitaUrl);
      return;
    }

    const list = document.createElement("div");
    list.className = "medical-search-results-list";
    results.forEach((record) => list.append(createResultItem(record)));
    resultsElement.append(list);
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

        renderResults(resultsElement, results, vitaUrl);
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
  });

  window.IDBMedicalSearch = {
    attach: attachMedicalSearch,
    getHistory: readSearchHistory,
    iconForType: getTypeIcon,
    load: loadSearchIndex,
    normalize: normalizeText,
    saveSearch: saveSearchTerm,
    search: searchMedicalIndex
  };
})();
