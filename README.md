# Islam-Epochen — Band I: Frühislamische Persönlichkeiten

Ein chronologisches Nachschlagewerk zur Frühzeit des Islam (ca. 500–750
n. Chr.) — von der Generation Hāschims ibn ʿAbd Manāf (Urgroßvater des
Propheten) bis zum Ende des Umayyaden-Kalifats. 721 Personen, jede mit
fester Struktur (Rollen, Daten, Herkunft, Wirken, Bedeutung), konsequent
aus sunnitischer Quellenperspektive. Live:
**https://74faruk.github.io/islam-epochen/**

## Wie die Daten entstehen

Zweistufige Pipeline (liegt in `pipeline/`, läuft nicht live im Browser):

1. **`wikidata_query.py`** — holt die Personenliste per SPARQL aus
   Wikidata: Staatsangehörige des Rashidun-/Umayyaden-Kalifats, als
   Sahaba eingetragene Personen, Kalifen, sowie Nachkommen Hāschims
   ibn ʿAbd Manāf bis 5 Generationen tief (deckt die vorislamische
   Verwandtschaft ab, ohne bis in die Neuzeit zu reichen).
2. **`batch_verarbeitung.py`** — holt pro Person den Wikipedia-Auszug,
   lässt Claude Sonnet 5 (über die günstigere Batch API) daraus einen
   einheitlichen deutschen Eintrag mit fester Rollen-Klassifikation
   erzeugen. System-Prompt schreibt explizit sunnitische
   Quellenperspektive vor (`strukturiere_testlauf.py` enthält Prompt +
   Rollen-Taxonomie + JSON-Schema).

Ergebnis liegt als `daten/personen.json` — die Webseite lädt nur noch
diese fertige Datei, kein Live-API-Aufruf mehr nötig (schnell, kostenlos
im Betrieb).

## Struktur

```
index.html         – Hero, Suche, Filter-Seitenleiste, Zeitstrahl, Detail-Overlay
styles.css          – Gestaltung (gelehrt-archivarisch: Pergament + Grün + Burgunderrot)
script.js           – Zeitstrahl-Aufbau, Filter/Suche, Detailansicht
daten/personen.json – fertig strukturierte Personendaten (721 Einträge)
daten/rollen.js     – Rollen-Taxonomie fürs Frontend
fonts/              – Self-hosted Webfonts (Amiri, Lora)
pipeline/           – Python-Skripte zur Datenerzeugung (einmalig/bei Erweiterung ausgeführt)
```

## Pipeline erneut ausführen (z. B. für einen neuen Band)

```
cd pipeline
python wikidata_query.py
python batch_verarbeitung.py   # braucht ANTHROPIC_API_KEY als Umgebungsvariable
cp personen_final.json ../daten/personen.json
```

## Deployment

Gehostet auf **GitHub Pages**. Jeder Push auf `main` aktualisiert die
Live-Seite automatisch (1–2 Minuten Wartezeit).

---

Gebaut im Dialog mit Claude Code.
