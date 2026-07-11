// Islam-Epochen, Band I — lädt frühislamische Persönlichkeiten (Rashidun-
// und Umayyaden-Kalifat) live von Wikidata, zeigt sie durchsuchbar an und
// holt beim Öffnen einer Person die ausführliche Biografie aus Wikipedia.

const WIKIDATA_ENDPOINT = "https://query.wikidata.org/sparql";
const USER_AGENT_NOTE = "islam-epochen (Bildungsprojekt, github.com/74faruk)";
const CACHE_KEY = "islam-epochen-personen-v1";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 Stunden

const SPARQL_QUERY = `
SELECT ?person ?personLabel ?personDescription ?dob ?dod ?image
       (GROUP_CONCAT(DISTINCT ?occLabel; separator="|") AS ?occupations)
WHERE {
  {
    ?person wdt:P27 wd:Q12490507 .
  } UNION {
    ?person wdt:P27 wd:Q8575586 .
  } UNION {
    ?person wdt:P106 wd:Q188711 .
  } UNION {
    ?person wdt:P39 wd:Q65997 .
  }
  ?person wdt:P31 wd:Q5 .
  OPTIONAL { ?person wdt:P569 ?dob . }
  OPTIONAL { ?person wdt:P570 ?dod . }
  OPTIONAL { ?person wdt:P18 ?image . }
  OPTIONAL { ?person wdt:P106 ?occ . }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "de,en". }
}
GROUP BY ?person ?personLabel ?personDescription ?dob ?dod ?image
`;

const KATEGORIE_KEYWORDS = {
  politik: [
    "caliph", "kalif", "governor", "statthalter", "wali", "emir", "vizier",
    "wazir", "sultan", "king", "könig", "koenig", "ruler", "herrscher",
    "politician", "politiker", "administrator", "prince", "prinz", "queen",
    "königin", "koenigin",
  ],
  militaer: [
    "general", "commander", "militärführer", "militaerfuehrer",
    "military leader", "conqueror", "eroberer", "warrior", "krieger",
    "army", "heer", "warlord", "feldherr", "commander-in-chief",
  ],
  theologie: [
    "scholar", "gelehrter", "jurist", "hadith", "imam", "mufti", "qadi",
    "richter", "theolog", "cleric", "geistlicher", "companion",
    "gefährte", "gefaehrte", "muezzin", "reciter", "qari", "exeget",
    "faqih", "ulama", "preacher", "prediger",
  ],
  wissenschaft: [
    "astronomer", "astronom", "mathematician", "mathematiker",
    "physician", "arzt", "wissenschaftler", "philosoph", "philosopher",
    "scientist", "poet", "dichter", "musician", "musiker", "historian",
    "historiker", "writer", "schriftsteller", "grammarian", "linguist",
    "translator", "übersetzer", "uebersetzer",
  ],
};

const KATEGORIE_LABELS = {
  politik: "Politik & Staat",
  militaer: "Militär",
  theologie: "Theologie & Recht",
  wissenschaft: "Wissenschaft & Kultur",
  sonstiges: "Sonstiges",
};

function klassifiziere(person) {
  const text = ((person.occupations || "") + " " + (person.description || "")).toLowerCase();
  for (const kat of ["politik", "militaer", "theologie", "wissenschaft"]) {
    if (KATEGORIE_KEYWORDS[kat].some((wort) => text.includes(wort))) return kat;
  }
  return "sonstiges";
}

function jahrAus(isoDatum) {
  if (!isoDatum) return null;
  const match = isoDatum.match(/^(-?\d+)-/);
  if (!match) return null;
  let jahr = parseInt(match[1], 10);
  return jahr;
}

function formatJahr(jahr) {
  if (jahr === null) return "?";
  return jahr < 0 ? Math.abs(jahr) + " v. Chr." : String(jahr);
}

// ---------- Daten laden (mit Zwischenspeicher) ----------
async function ladePersonen() {
  const cached = localStorage.getItem(CACHE_KEY);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.zeitpunkt < CACHE_TTL_MS) return parsed.daten;
    } catch (e) {
      /* Cache beschädigt — neu laden */
    }
  }

  const url = WIKIDATA_ENDPOINT + "?query=" + encodeURIComponent(SPARQL_QUERY);
  const res = await fetch(url, {
    headers: { Accept: "application/sparql-results+json" },
  });
  if (!res.ok) throw new Error("Wikidata-Abfrage fehlgeschlagen: " + res.status);
  const json = await res.json();

  const daten = json.results.bindings
    .map((b) => ({
      id: b.person.value.split("/").pop(),
      name: b.personLabel ? b.personLabel.value : "(ohne Namen)",
      description: b.personDescription ? b.personDescription.value : "",
      dob: b.dob ? b.dob.value : null,
      dod: b.dod ? b.dod.value : null,
      image: b.image ? b.image.value : null,
      occupations: b.occupations ? b.occupations.value : "",
    }))
    // Wikidata-interne Platzhalter-IDs ohne echten Namen aussortieren
    .filter((p) => !/^Q\d+$/.test(p.name));

  daten.forEach((p) => {
    p.kategorie = klassifiziere(p);
  });

  localStorage.setItem(CACHE_KEY, JSON.stringify({ zeitpunkt: Date.now(), daten }));
  return daten;
}

// ---------- Zustand ----------
let ALLE_PERSONEN = [];
let sichtbareAnzahl = 40;
const SCHRITT = 40;
let aktuellerFilter = "alle";
let aktuelleSuche = "";

// ---------- Elemente ----------
const gridEl = document.getElementById("grid");
const resultCountEl = document.getElementById("result-count");
const emptyStateEl = document.getElementById("empty-state");
const loadMoreBtn = document.getElementById("load-more-btn");
const searchInput = document.getElementById("search-input");
const searchForm = document.getElementById("search-form");
const filterRow = document.getElementById("filter-row");

searchForm.addEventListener("submit", (e) => e.preventDefault());
searchInput.addEventListener("input", () => {
  aktuelleSuche = searchInput.value.trim().toLowerCase();
  sichtbareAnzahl = SCHRITT;
  render();
});

filterRow.addEventListener("click", (e) => {
  const btn = e.target.closest(".filter-chip");
  if (!btn) return;
  aktuellerFilter = btn.dataset.cat;
  [...filterRow.children].forEach((c) => c.classList.toggle("is-active", c === btn));
  sichtbareAnzahl = SCHRITT;
  render();
});

loadMoreBtn.addEventListener("click", () => {
  sichtbareAnzahl += SCHRITT;
  render();
});

// Deutsche Wikidata-Labels weichen oft von der geläufigen englischen
// Schreibweise ab (z. B. "Aischa" statt "Aisha") — bekannte Varianten
// werden bei der Suche mit übersetzt, damit gängige Schreibweisen auch
// treffen.
const SUCH_ALIASE = {
  aisha: "aischa",
  ayesha: "aischa",
  omar: "umar",
  othman: "uthman",
  osman: "uthman",
  moawiya: "muawiya",
  hussein: "husain",
  hussain: "husain",
};

function gefilterteListe() {
  const suchbegriffe = [aktuelleSuche, SUCH_ALIASE[aktuelleSuche]].filter(Boolean);
  return ALLE_PERSONEN.filter((p) => {
    if (aktuellerFilter !== "alle" && p.kategorie !== aktuellerFilter) return false;
    if (aktuelleSuche) {
      const heuhaufen = (p.name + " " + p.description).toLowerCase();
      if (!suchbegriffe.some((s) => heuhaufen.includes(s))) return false;
    }
    return true;
  });
}

function initialen(name) {
  return name
    .split(/\s+/)
    .filter((w) => /[A-Za-zÀ-ÖØ-öø-ÿ]/.test(w[0]))
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("") || "؟";
}

function render() {
  const liste = gefilterteListe();
  const sichtbar = liste.slice(0, sichtbareAnzahl);

  resultCountEl.textContent = liste.length + " von " + ALLE_PERSONEN.length + " Personen";
  emptyStateEl.hidden = liste.length > 0;
  gridEl.innerHTML = "";

  for (const p of sichtbar) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "card";

    const portrait = document.createElement("span");
    portrait.className = "card-portrait";
    if (p.image) {
      portrait.style.backgroundImage = "url('" + p.image + "?width=112')";
      portrait.textContent = "";
    } else {
      portrait.textContent = initialen(p.name);
    }

    const body = document.createElement("span");
    body.className = "card-body";

    const nameEl = document.createElement("span");
    nameEl.className = "card-name";
    nameEl.textContent = p.name;

    const datesEl = document.createElement("span");
    datesEl.className = "card-dates";
    const geb = formatJahr(jahrAus(p.dob));
    const gest = formatJahr(jahrAus(p.dod));
    datesEl.textContent = p.dob || p.dod ? geb + " – " + gest : "Lebensdaten unbekannt";

    const descEl = document.createElement("span");
    descEl.className = "card-desc";
    descEl.textContent = p.description || "Keine Kurzbeschreibung bei Wikidata hinterlegt.";

    const tagEl = document.createElement("span");
    tagEl.className = "card-tag";
    tagEl.textContent = KATEGORIE_LABELS[p.kategorie];

    body.append(nameEl, document.createElement("br"), datesEl, document.createElement("br"), descEl, document.createElement("br"), tagEl);
    card.append(portrait, body);
    card.addEventListener("click", () => oeffneDetail(p));

    gridEl.appendChild(card);
  }

  loadMoreBtn.hidden = sichtbareAnzahl >= liste.length;
}

// ---------- Detailansicht ----------
const overlayEl = document.getElementById("detail-overlay");
const detailPortrait = document.getElementById("detail-portrait");
const detailCategory = document.getElementById("detail-category");
const detailName = document.getElementById("detail-name");
const detailDates = document.getElementById("detail-dates");
const detailDesc = document.getElementById("detail-desc");
const detailLoading = document.getElementById("detail-loading");
const detailExtract = document.getElementById("detail-extract");
const detailLinks = document.getElementById("detail-links");
const detailClose = document.getElementById("detail-close");

detailClose.addEventListener("click", schliesseDetail);
overlayEl.addEventListener("click", (e) => {
  if (e.target === overlayEl) schliesseDetail();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !overlayEl.hidden) schliesseDetail();
});

function schliesseDetail() {
  overlayEl.hidden = true;
  history.replaceState(null, "", window.location.pathname);
}

// Zählt jeden Aufruf hoch — läuft ein alter, langsamer Abruf noch nach,
// wenn längst eine andere Person geöffnet wurde, erkennt der alte Aufruf
// anhand dieser Nummer, dass er veraltet ist, und überschreibt nichts mehr.
let aktuelleAnfrageId = 0;

async function oeffneDetail(p) {
  const meineAnfrageId = ++aktuelleAnfrageId;

  overlayEl.hidden = false;
  history.replaceState(null, "", "#person=" + p.id);

  detailPortrait.style.backgroundImage = p.image ? "url('" + p.image + "?width=240')" : "none";
  detailCategory.textContent = KATEGORIE_LABELS[p.kategorie];
  detailName.textContent = p.name;
  const geb = formatJahr(jahrAus(p.dob));
  const gest = formatJahr(jahrAus(p.dod));
  detailDates.textContent = p.dob || p.dod ? geb + " – " + gest + " n. Chr." : "Lebensdaten unbekannt";
  detailDesc.textContent = p.description || "";

  detailExtract.innerHTML = "";
  detailLinks.innerHTML = "";
  detailLoading.hidden = false;

  const wikidataLink = document.createElement("a");
  wikidataLink.href = "https://www.wikidata.org/wiki/" + p.id;
  wikidataLink.target = "_blank";
  wikidataLink.rel = "noopener";
  wikidataLink.textContent = "Wikidata-Eintrag ↗";
  detailLinks.appendChild(wikidataLink);

  try {
    const artikel = await ladeWikipediaExtrakt(p.name);
    if (meineAnfrageId !== aktuelleAnfrageId) return; // inzwischen andere Person geöffnet
    detailLoading.hidden = true;
    if (artikel) {
      artikel.extract
        .split(/\n+/)
        .filter((abs) => abs.trim())
        .forEach((abs) => {
          const para = document.createElement("p");
          para.textContent = abs;
          detailExtract.appendChild(para);
        });
      const wpLink = document.createElement("a");
      wpLink.href = artikel.url;
      wpLink.target = "_blank";
      wpLink.rel = "noopener";
      wpLink.textContent = "Vollständiger Wikipedia-Artikel" + (artikel.sprache === "en" ? " (englisch)" : "") + " ↗";
      detailLinks.appendChild(wpLink);
    } else {
      const hinweis = document.createElement("p");
      hinweis.textContent = "Zu dieser Person gibt es (noch) keinen ausführlichen Wikipedia-Artikel — nur den Wikidata-Eintrag oben.";
      detailExtract.appendChild(hinweis);
    }
  } catch (err) {
    if (meineAnfrageId !== aktuelleAnfrageId) return;
    detailLoading.hidden = true;
    const fehler = document.createElement("p");
    fehler.textContent =
      err.name === "AbortError"
        ? "Wikipedia antwortet gerade nicht — bitte kurz erneut versuchen."
        : "Biografie konnte gerade nicht geladen werden.";
    detailExtract.appendChild(fehler);
  }
}

const WIKIPEDIA_TIMEOUT_MS = 8000;

async function fetchMitTimeout(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), WIKIPEDIA_TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function ladeWikipediaExtrakt(name) {
  for (const sprache of ["de", "en"]) {
    const url =
      "https://" + sprache + ".wikipedia.org/w/api.php" +
      "?action=query&prop=extracts&explaintext=1&redirects=1&format=json&origin=*" +
      "&titles=" + encodeURIComponent(name);
    const res = await fetchMitTimeout(url);
    if (!res.ok) continue;
    const json = await res.json();
    const pages = json.query && json.query.pages;
    if (!pages) continue;
    const seite = Object.values(pages)[0];
    if (seite && !seite.missing && seite.extract && seite.extract.length > 40) {
      return {
        extract: seite.extract,
        sprache,
        url: "https://" + sprache + ".wikipedia.org/wiki/" + encodeURIComponent(seite.title.replace(/ /g, "_")),
      };
    }
  }
  return null;
}

// ---------- Start ----------
(async function start() {
  try {
    ALLE_PERSONEN = await ladePersonen();
    render();

    const hash = window.location.hash.match(/person=(Q\d+)/);
    if (hash) {
      const p = ALLE_PERSONEN.find((x) => x.id === hash[1]);
      if (p) oeffneDetail(p);
    }
  } catch (err) {
    resultCountEl.textContent = "Personen konnten nicht geladen werden — bitte Seite neu laden.";
  }
})();
