# -*- coding: utf-8 -*-
"""
Islam-Epochen — Schritt 2 (Testlauf): Personen mit Claude Sonnet 5
strukturieren.

Holt pro Person den Wikipedia-Text (Deutsch, sonst Englisch) und lässt
Claude daraus einen einheitlich aufgebauten deutschen Eintrag erzeugen:
feste Felder, Rollen-Tags aus der vorgegebenen Taxonomie, Transparenz-
Hinweis zur Quellenlage. Läuft nur auf den 25 Testpersonen — die große
Charge (alle ~721) folgt erst nach Qualitätsfreigabe, dann über die
guenstigere Batch API.
"""

import json
import os
import time
import urllib.request
import urllib.parse

import anthropic

MODEL = "claude-sonnet-5"
USER_AGENT = "islam-epochen (Bildungsprojekt, github.com/74faruk)"

ROLLEN = [
    "Muslim", "Kafir", "Munafiq",
    "Sahabi", "Tabii", "Tabi_at_Tabiin",
    "Stammesoberhaupt", "Kalif", "Wali", "Wesir", "Emir",
    "Feldherr", "Mujahid", "Shahid",
    "Gelehrter", "Faqih", "Muhaddith", "Mufassir", "Qari", "Qadi",
    "Ahlul_Bayt", "Umm_al_Muminin", "Muhajir", "Ansari",
    "Dichter", "Kaufmann", "Arzt", "Historiker",
]

JSON_SCHEMA = {
    "type": "object",
    "properties": {
        "rollen": {
            "type": "array",
            "items": {"type": "string", "enum": ROLLEN},
            "description": "Alle zutreffenden Rollen aus der festen Liste, mindestens eine.",
        },
        "geboren_jahr": {"type": ["integer", "null"]},
        "geboren_ungefaehr": {"type": "boolean"},
        "geboren_ort": {"type": ["string", "null"]},
        "gestorben_jahr": {"type": ["integer", "null"]},
        "gestorben_ungefaehr": {"type": "boolean"},
        "gestorben_ort": {"type": ["string", "null"]},
        "todesumstand": {"type": ["string", "null"], "description": "Nur falls bekannt/relevant, z. B. 'gefallen in der Schlacht von...'"},
        "abstammung": {"type": "string", "description": "Ein Satz: Vater/Sippe/Stamm, falls bekannt, sonst leerer String."},
        "herkunft": {"type": "string", "description": "1-2 Sätze: Herkunft und früher Lebensweg."},
        "wirken": {"type": "string", "description": "2-4 Sätze: was diese Person getan/erlebt hat."},
        "bedeutung": {"type": "string", "description": "1-2 Sätze: historische Bedeutung/Vermächtnis."},
        "ereignisse": {
            "type": "array",
            "items": {"type": "string"},
            "description": "Stichpunktartige wichtige Ereignisse, z. B. 'Teilnahme an der Schlacht von Badr'. Leer, wenn nichts Konkretes bekannt.",
        },
        "unsicherheit_hinweis": {
            "type": ["string", "null"],
            "description": "Nur ausfüllen, wenn die Quellenlage für eine Klassifikation (z. B. Sahaba-Status) tatsächlich umstritten/unklar ist.",
        },
    },
    "required": [
        "rollen", "geboren_jahr", "geboren_ungefaehr", "geboren_ort",
        "gestorben_jahr", "gestorben_ungefaehr", "gestorben_ort", "todesumstand",
        "abstammung", "herkunft", "wirken", "bedeutung", "ereignisse", "unsicherheit_hinweis",
    ],
    "additionalProperties": False,
}

SYSTEM_PROMPT = f"""Du strukturierst Kurzbiografien für "Islam-Epochen", eine \
historische Personendatenbank zur Frühzeit des Islam (Rashidun- und \
Umayyaden-Kalifat, ca. 500-750 n. Chr.), im Stil klassischer islamischer \
Geschichtswerke wie Ibn Kathirs "Al-Bidaya wa an-Nihaya".

Du bekommst pro Person: Name, Wikidata-Fakten (Daten, Beruf/Rolle laut \
Wikidata) und einen Wikipedia-Auszug. Erzeuge daraus einen einheitlichen, \
sachlichen deutschen Eintrag nach dem vorgegebenen Schema.

Regeln:
- Nur Fakten aus den gegebenen Quellen verwenden, nichts erfinden. Wenn \
etwas nicht in den Quellen steht, leer lassen bzw. null setzen.
- Rollen-Zuordnung: wähle alle zutreffenden Rollen aus der festen Liste. \
Sahabi = traf den Propheten Muhammad als Muslim und starb als Muslim. \
Kafir = war zu Lebzeiten (oder bei Tod) kein Muslim. Diese beiden \
schließen sich für dieselbe Lebensphase aus, aber jemand kann z. B. \
zunächst Kafir gewesen und dann Muslim/Sahabi geworden sein — dann beide \
Rollen vergeben, falls aus dem Text ersichtlich. Stammesoberhaupt = \
vorislamischer Clan-/Stammesführer (z. B. Träger der Ämter rifada/siqaya \
in Mekka vor dem Islam), unabhängig vom späteren Kalifen-/Emir-Amt der \
islamischen Zeit.
- WICHTIG — Quellenperspektive: Stelle strittige Punkte der frühislamischen \
Geschichte AUSSCHLIESSLICH aus sunnitischer Perspektive dar. Wenn eine \
Quelle eine schiitische Sichtweise als Gegenposition nennt (z. B. Status \
von Abu Talib als Muslim, besondere Verehrung bestimmter Personen, \
Bewertung der Ereignisse um Ali/Muawiya/Uthman, schiitische Werke wie \
"Kitab Sulaim ibn Qais" als Quelle), übernimm NICHT diese schiitische \
Deutung und zitiere sie nicht als gleichwertige Position — gib stattdessen \
die sunnitische Mehrheitsmeinung wieder. Begriffe wie "Ahlul Bayt" oder \
"Sahaba" sind gemeinsames sunnitisch-schiitisches Vokabular und bleiben \
erlaubt, aber die inhaltliche Bewertung/Einordnung folgt durchgehend der \
sunnitischen Tradition (z. B. Hadith- und Sahaba-Wertschätzung nach \
sunnitischem Konsens, keine schiitische Kritik an Sahaba).
- Bei umstrittener oder unklarer Quellenlage INNERHALB der sunnitischen \
Überlieferung selbst (z. B. widersprüchliche Datumsangaben, unsichere \
Quellenlage) das in "unsicherheit_hinweis" transparent machen.
- Ton: sachlich, respektvoll, wie ein seriöses Nachschlagewerk. Keine \
wertenden Urteile, keine religiöse Verkündigung, keine Übertreibung.
- Sprache: einheitlich Deutsch, auch wenn die Quelle Englisch war."""


def lade_wikipedia_extrakt(name):
    for sprache in ("de", "en"):
        url = (
            f"https://{sprache}.wikipedia.org/w/api.php"
            "?action=query&prop=extracts&explaintext=1&redirects=1&format=json&origin=*"
            "&titles=" + urllib.parse.quote(name)
        )
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                daten = json.load(resp)
        except Exception:
            continue
        seiten = daten.get("query", {}).get("pages", {})
        for seite in seiten.values():
            extrakt = seite.get("extract", "")
            if not seite.get("missing") and len(extrakt) > 40:
                # Auf ~4000 Zeichen kappen, reicht für eine Kurzbiografie
                # und haelt die Eingabekosten im Rahmen.
                return extrakt[:4000], sprache
    return None, None


def strukturiere_person(client, person, wiki_text, wiki_sprache):
    rohdaten = f"""Name: {person['name']}
Wikidata-Kurzbeschreibung: {person['description']}
Wikidata-Geburtsdatum: {person['dob']}
Wikidata-Sterbedatum: {person['dod']}
Wikidata-Beruf/Rolle (roh): {person['occupations']}

Wikipedia-Auszug ({wiki_sprache or 'nicht gefunden'}):
{wiki_text or '(kein Wikipedia-Artikel gefunden — nur Wikidata-Fakten nutzen)'}"""

    # Bei sehr ausführlichen Personen (z. B. gut dokumentierte Kalifen)
    # reicht das erste Limit manchmal nicht — dann mit mehr Platz erneut
    # versuchen, statt die Person zu verlieren.
    for max_tokens in (4000, 7000):
        antwort = client.messages.create(
            model=MODEL,
            max_tokens=max_tokens,
            system=[{"type": "text", "text": SYSTEM_PROMPT, "cache_control": {"type": "ephemeral"}}],
            output_config={"format": {"type": "json_schema", "schema": JSON_SCHEMA}},
            messages=[{"role": "user", "content": rohdaten}],
        )
        for block in antwort.content:
            if block.type == "text":
                try:
                    return json.loads(block.text), antwort.usage
                except json.JSONDecodeError:
                    break  # abgeschnitten -> naechster Versuch mit mehr Tokens
    raise RuntimeError("Antwort auch mit erhoehtem Limit unvollstaendig")


def main():
    api_key = os.environ["ANTHROPIC_API_KEY"]
    client = anthropic.Anthropic(api_key=api_key)

    with open("islam-epochen/pipeline/testauswahl.json", "r", encoding="utf-8") as f:
        personen = json.load(f)

    ergebnisse = []
    gesamt_input = 0
    gesamt_output = 0
    gesamt_cache_lesen = 0

    for i, person in enumerate(personen, 1):
        print(f"[{i}/{len(personen)}] {person['name']} ...")
        wiki_text, wiki_sprache = lade_wikipedia_extrakt(person["name"])
        try:
            struktur, usage = strukturiere_person(client, person, wiki_text, wiki_sprache)
        except Exception as e:
            print(f"  FEHLER: {e}")
            continue

        gesamt_input += usage.input_tokens
        gesamt_output += usage.output_tokens
        gesamt_cache_lesen += getattr(usage, "cache_read_input_tokens", 0) or 0

        eintrag = {**person, "struktur": struktur, "wiki_sprache": wiki_sprache}
        ergebnisse.append(eintrag)
        time.sleep(0.3)

    with open("islam-epochen/pipeline/testauswahl_strukturiert.json", "w", encoding="utf-8") as f:
        json.dump(ergebnisse, f, ensure_ascii=False, indent=2)

    print(f"\nFertig: {len(ergebnisse)} Personen strukturiert.")
    print(f"Tokens: {gesamt_input} Input, {gesamt_output} Output, {gesamt_cache_lesen} aus Cache gelesen")
    kosten = (gesamt_input / 1_000_000 * 3.0) + (gesamt_output / 1_000_000 * 15.0)
    print(f"Geschaetzte Kosten (Listenpreis, ohne Batch-Rabatt): ${kosten:.3f}")


if __name__ == "__main__":
    main()
