# Islam-Epochen — Band I: Frühislamische Persönlichkeiten

Personen aus dem Rashidun- und Umayyaden-Kalifat (632–750 n. Chr.) —
Kalifen, Gefährten des Propheten, Feldherren, Gouverneure, Gelehrte.
Live: **https://74faruk.github.io/islam-epochen/**

Statische Seite (HTML/CSS/JS, kein Framework, kein Backend). Alle Daten
kommen zur Laufzeit direkt aus der **Wikidata**-Datenbank (per SPARQL-
Abfrage, kein API-Key nötig) und aus **Wikipedia** (ausführliche
Biografietexte, deutsch mit englischem Fallback). Es gibt keine
redaktionelle Auswahl — die Liste ist so vollständig, wie Wikidata es
für diese Epoche hergibt (aktuell rund 660 Personen).

## Wie die Auswahl zustande kommt

Die SPARQL-Abfrage in `script.js` holt alle Personen, die mindestens
eines davon sind:
- Staatsangehörige des Rashidun- oder Umayyaden-Kalifats (Wikidata P27)
- als „Gefährte des Propheten" (Sahabah) eingetragen (P106)
- Inhaber des Amtes „Kalif" (P39)

Die Einordnung in Themengebiete (Politik & Staat, Militär, Theologie &
Recht, Wissenschaft & Kultur) passiert clientseitig über eine
Stichwortsuche in Beruf und Kurzbeschreibung — Wikidata selbst liefert
keine fertige Kategorie dafür.

## Struktur

```
index.html   – Hero, Suche, Filter, Ergebnisgrid, Detail-Overlay
styles.css   – Gestaltung (gelehrt-archivarischer Stil)
script.js    – Wikidata-Abfrage, Filter/Suche, Wikipedia-Biografien
fonts/       – Self-hosted Webfonts (Amiri, Lora)
```

## Weitere Epochen (Ausblick)

Der Projektname ist bewusst „Band I" — als Nächstes könnte das
Abbasiden-Kalifat folgen (die Blütezeit der Wissenschaft: Al-Khwarizmi,
Ibn Sina, Al-Kindi und viele mehr), danach z. B. Osmanisches Reich oder
Al-Andalus. Jede weitere Epoche wäre im Kern nur eine neue SPARQL-
Abfrage mit anderen Wikidata-IDs.

## Deployment

Gehostet auf **GitHub Pages**. Jeder Push auf `main` aktualisiert die
Live-Seite automatisch (1–2 Minuten Wartezeit).

```
git add -A
git commit -m "Beschreibung der Änderung"
git push
```

---

Gebaut im Dialog mit Claude Code.
