// Islam-Epochen, Band I — lädt die fertig strukturierten Personendaten
// (kein Live-Abruf mehr nötig, alles liegt schon vor), zeigt sie
// chronologisch nach Epochen sortiert, durchsuchbar und nach Rollen
// filterbar an.

const EPOCHEN = [
  { id: "vor570", titel: "Vor der Jugendzeit des Propheten", bis: 569 },
  { id: "570-609", titel: "Kindheit & Jugend des Propheten", bis: 609 },
  { id: "610-621", titel: "Frühe Offenbarung in Mekka", bis: 621 },
  { id: "622-632", titel: "Medina-Zeit des Propheten", bis: 632 },
  { id: "633-661", titel: "Rashidun-Kalifat", bis: 661 },
  { id: "662-750", titel: "Umayyaden-Kalifat", bis: 750 },
  { id: "unbekannt", titel: "Zeitlich nicht sicher einzuordnen", bis: null },
];

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

let ALLE_PERSONEN = [];
let aktiveRollen = new Set();
let aktuelleSuche = "";

const resultCountEl = document.getElementById("result-count");
const zeitstrahlEl = document.getElementById("zeitstrahl");
const emptyStateEl = document.getElementById("empty-state");
const searchInput = document.getElementById("search-input");
const searchForm = document.getElementById("search-form");
const filterGruppenEl = document.getElementById("filter-gruppen");
const filterResetBtn = document.getElementById("filter-reset");

function jahrAus(iso) {
  if (!iso) return null;
  const m = iso.match(/^(-?\d+)-/);
  return m ? parseInt(m[1], 10) : null;
}

function formatJahr(jahr, ungefaehr) {
  if (jahr === null || jahr === undefined) return "?";
  return (ungefaehr ? "ca. " : "") + jahr;
}

function epochenIdFuer(person) {
  const s = person.struktur;
  const jahr = (s.geboren_jahr !== null ? s.geboren_jahr : s.gestorben_jahr) ?? jahrAus(person.dob) ?? jahrAus(person.dod);
  if (jahr === null || jahr === undefined) return "unbekannt";
  for (const ep of EPOCHEN) {
    if (ep.bis !== null && jahr <= ep.bis) return ep.id;
  }
  return "662-750";
}

function initialen(name) {
  const buchstaben = name
    .split(/\s+/)
    .filter((w) => /[A-Za-zÀ-ÖØ-öø-ÿ]/.test(w[0]))
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
  return buchstaben || "؟";
}

// ---------- Filter-Seitenleiste aufbauen ----------
function baueFilterPanel() {
  filterGruppenEl.innerHTML = "";
  for (const gruppe of ROLLEN_GRUPPEN) {
    const wrap = document.createElement("div");
    wrap.className = "filter-gruppe";

    const titel = document.createElement("p");
    titel.className = "filter-gruppe-titel";
    titel.textContent = gruppe.titel;
    wrap.appendChild(titel);

    const liste = document.createElement("div");
    liste.className = "filter-chip-liste";
    for (const rolle of gruppe.rollen) {
      const anzahl = ALLE_PERSONEN.filter((p) => p.struktur.rollen.includes(rolle.id)).length;
      if (anzahl === 0) continue;
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "filter-chip";
      chip.dataset.rolle = rolle.id;
      chip.innerHTML = rolle.label + ' <span class="anzahl">' + anzahl + "</span>";
      chip.addEventListener("click", () => {
        if (aktiveRollen.has(rolle.id)) aktiveRollen.delete(rolle.id);
        else aktiveRollen.add(rolle.id);
        chip.classList.toggle("aktiv");
        render();
      });
      liste.appendChild(chip);
    }
    wrap.appendChild(liste);
    filterGruppenEl.appendChild(wrap);
  }
}

filterResetBtn.addEventListener("click", () => {
  aktiveRollen.clear();
  document.querySelectorAll(".filter-chip.aktiv").forEach((c) => c.classList.remove("aktiv"));
  render();
});

searchForm.addEventListener("submit", (e) => e.preventDefault());
searchInput.addEventListener("input", () => {
  aktuelleSuche = searchInput.value.trim().toLowerCase();
  render();
});

// ---------- Filtern + Rendern ----------
function gefilterteListe() {
  const suchbegriffe = [aktuelleSuche, SUCH_ALIASE[aktuelleSuche]].filter(Boolean);
  return ALLE_PERSONEN.filter((p) => {
    if (aktiveRollen.size > 0 && !p.struktur.rollen.some((r) => aktiveRollen.has(r))) return false;
    if (aktuelleSuche && !suchbegriffe.some((s) => p.name.toLowerCase().includes(s))) return false;
    return true;
  });
}

function personenKarte(p) {
  const card = document.createElement("button");
  card.type = "button";
  card.className = "card";

  const portrait = document.createElement("span");
  portrait.className = "card-portrait";
  if (p.image) {
    portrait.style.backgroundImage = "url('" + p.image + "?width=112')";
  } else {
    portrait.textContent = initialen(p.name);
  }

  const body = document.createElement("span");
  body.className = "card-body";

  const nameEl = document.createElement("span");
  nameEl.className = "card-name";
  nameEl.textContent = p.name;

  const s = p.struktur;
  const datesEl = document.createElement("span");
  datesEl.className = "card-dates";
  const geb = formatJahr(s.geboren_jahr, s.geboren_ungefaehr);
  const gest = formatJahr(s.gestorben_jahr, s.gestorben_ungefaehr);
  datesEl.textContent = s.geboren_jahr || s.gestorben_jahr ? geb + " – " + gest : "Lebensdaten unbekannt";

  const tagsEl = document.createElement("span");
  tagsEl.className = "card-tags";
  for (const rolle of s.rollen.slice(0, 3)) {
    const tag = document.createElement("span");
    tag.className = "card-tag";
    tag.textContent = ROLLEN_LABEL[rolle] || rolle;
    tagsEl.appendChild(tag);
  }

  body.append(nameEl, datesEl, tagsEl);
  card.append(portrait, body);
  card.addEventListener("click", () => oeffneDetail(p));
  return card;
}

function render() {
  const liste = gefilterteListe();
  resultCountEl.textContent = liste.length + " von " + ALLE_PERSONEN.length + " Personen";
  emptyStateEl.hidden = liste.length > 0;
  zeitstrahlEl.innerHTML = "";

  for (const ep of EPOCHEN) {
    const personenInEpoche = liste.filter((p) => epochenIdFuer(p) === ep.id);
    if (personenInEpoche.length === 0) continue;

    personenInEpoche.sort((a, b) => {
      const ja = a.struktur.geboren_jahr ?? a.struktur.gestorben_jahr ?? 9999;
      const jb = b.struktur.geboren_jahr ?? b.struktur.gestorben_jahr ?? 9999;
      return ja - jb;
    });

    const epocheEl = document.createElement("section");
    epocheEl.className = "epoche";

    const kopf = document.createElement("div");
    kopf.className = "epoche-kopf";
    const jahre = document.createElement("span");
    jahre.className = "epoche-jahre";
    jahre.textContent = ep.id === "unbekannt" ? "?" : ep.bis !== null ? "bis " + ep.bis : "";
    const titel = document.createElement("h3");
    titel.className = "epoche-titel";
    titel.textContent = ep.titel;
    const anzahl = document.createElement("span");
    anzahl.className = "epoche-anzahl";
    anzahl.textContent = personenInEpoche.length + " Personen";
    kopf.append(jahre, titel, anzahl);

    const grid = document.createElement("div");
    grid.className = "karten-grid";
    for (const p of personenInEpoche) grid.appendChild(personenKarte(p));

    epocheEl.append(kopf, grid);
    zeitstrahlEl.appendChild(epocheEl);
  }
}

// ---------- Detailansicht ----------
const overlayEl = document.getElementById("detail-overlay");
const detailPortrait = document.getElementById("detail-portrait");
const detailRollen = document.getElementById("detail-rollen");
const detailName = document.getElementById("detail-name");
const detailDates = document.getElementById("detail-dates");
const detailAbstammung = document.getElementById("detail-abstammung");
const detailBody = document.getElementById("detail-body");
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

function absatz(titel, text) {
  if (!text) return "";
  const p = document.createElement("p");
  p.textContent = text;
  const h4 = document.createElement("h4");
  h4.textContent = titel;
  const frag = document.createDocumentFragment();
  frag.append(h4, p);
  return frag;
}

function oeffneDetail(p) {
  overlayEl.hidden = false;
  history.replaceState(null, "", "#person=" + p.id);

  const s = p.struktur;
  detailPortrait.style.backgroundImage = p.image ? "url('" + p.image + "?width=240')" : "none";

  detailRollen.innerHTML = "";
  for (const rolle of s.rollen) {
    const tag = document.createElement("span");
    tag.className = "card-tag";
    tag.textContent = ROLLEN_LABEL[rolle] || rolle;
    detailRollen.appendChild(tag);
  }

  detailName.textContent = p.name;
  const geb = formatJahr(s.geboren_jahr, s.geboren_ungefaehr) + (s.geboren_ort ? " in " + s.geboren_ort : "");
  const gest = formatJahr(s.gestorben_jahr, s.gestorben_ungefaehr) + (s.gestorben_ort ? " in " + s.gestorben_ort : "");
  detailDates.textContent = s.geboren_jahr || s.gestorben_jahr ? "Geboren " + geb + " · Gestorben " + gest : "Lebensdaten unbekannt";
  detailAbstammung.textContent = s.abstammung || "";

  detailBody.innerHTML = "";
  const teile = [
    absatz("Herkunft", s.herkunft),
    absatz("Wirken", s.wirken),
    absatz("Bedeutung", s.bedeutung),
  ];
  for (const t of teile) if (t) detailBody.appendChild(t);

  if (s.todesumstand) {
    const h4 = document.createElement("h4");
    h4.textContent = "Todesumstand";
    const p2 = document.createElement("p");
    p2.textContent = s.todesumstand;
    detailBody.append(h4, p2);
  }

  if (s.ereignisse && s.ereignisse.length > 0) {
    const h4 = document.createElement("h4");
    h4.textContent = "Wichtige Ereignisse";
    const ul = document.createElement("ul");
    ul.className = "detail-ereignisse";
    for (const ereignis of s.ereignisse) {
      const li = document.createElement("li");
      li.textContent = ereignis;
      ul.appendChild(li);
    }
    detailBody.append(h4, ul);
  }

  if (s.unsicherheit_hinweis) {
    const box = document.createElement("div");
    box.className = "detail-unsicherheit";
    const label = document.createElement("span");
    label.className = "label";
    label.textContent = "Quellenlage";
    const text = document.createElement("p");
    text.textContent = s.unsicherheit_hinweis;
    box.append(label, text);
    detailBody.appendChild(box);
  }

  const links = document.createElement("p");
  links.className = "detail-links";
  const wikidataLink = document.createElement("a");
  wikidataLink.href = "https://www.wikidata.org/wiki/" + p.id;
  wikidataLink.target = "_blank";
  wikidataLink.rel = "noopener";
  wikidataLink.textContent = "Wikidata-Eintrag ↗";
  links.appendChild(wikidataLink);
  detailBody.appendChild(links);
}

// ---------- Start ----------
(async function start() {
  try {
    const res = await fetch("daten/personen.json");
    if (!res.ok) throw new Error("HTTP " + res.status);
    ALLE_PERSONEN = await res.json();

    baueFilterPanel();
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
