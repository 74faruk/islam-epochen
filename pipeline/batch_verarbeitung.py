# -*- coding: utf-8 -*-
"""
Islam-Epochen — grosser Lauf: alle Personen ueber die Anthropic Batch API
strukturieren (50% guenstiger als normale Anfragen, dafuer laeuft es im
Hintergrund bis zu einer Stunde, im Ausnahmefall bis 24h).

Ablauf:
  1. Wikipedia-Auszuege fuer alle Personen holen (mit Zwischenspeicher,
     damit ein Abbruch nicht von vorn beginnen muss).
  2. Batch-Anfragen bauen (ein Request pro Person) und einreichen.
  3. Auf Fertigstellung warten, Ergebnisse einsammeln.
  4. Finales JSON fuer die Webseite schreiben.
"""

import json
import os
import sys
import time

sys.path.insert(0, os.path.dirname(__file__))
from strukturiere_testlauf import lade_wikipedia_extrakt, SYSTEM_PROMPT, JSON_SCHEMA, MODEL

import anthropic
from anthropic.types.message_create_params import MessageCreateParamsNonStreaming
from anthropic.types.messages.batch_create_params import Request

HIER = os.path.dirname(__file__)
ROH_PATH = os.path.join(HIER, "personen_roh.json")
EXTRAKTE_PATH = os.path.join(HIER, "wikipedia_extrakte.json")
FINAL_PATH = os.path.join(HIER, "personen_final.json")


def hole_alle_extrakte(personen):
    if os.path.exists(EXTRAKTE_PATH):
        with open(EXTRAKTE_PATH, "r", encoding="utf-8") as f:
            cache = json.load(f)
    else:
        cache = {}

    for i, p in enumerate(personen, 1):
        if p["id"] in cache:
            continue
        text, sprache = lade_wikipedia_extrakt(p["name"])
        cache[p["id"]] = {"text": text, "sprache": sprache}
        if i % 25 == 0:
            print(f"  Wikipedia: {i}/{len(personen)} ...")
            with open(EXTRAKTE_PATH, "w", encoding="utf-8") as f:
                json.dump(cache, f, ensure_ascii=False, indent=2)

    with open(EXTRAKTE_PATH, "w", encoding="utf-8") as f:
        json.dump(cache, f, ensure_ascii=False, indent=2)
    return cache


def baue_request(person, extrakt):
    text = extrakt["text"]
    sprache = extrakt["sprache"]
    rohdaten = f"""Name: {person['name']}
Wikidata-Kurzbeschreibung: {person['description']}
Wikidata-Geburtsdatum: {person['dob']}
Wikidata-Sterbedatum: {person['dod']}
Wikidata-Beruf/Rolle (roh): {person['occupations']}

Wikipedia-Auszug ({sprache or 'nicht gefunden'}):
{text or '(kein Wikipedia-Artikel gefunden — nur Wikidata-Fakten nutzen)'}"""

    return Request(
        custom_id=person["id"],
        params=MessageCreateParamsNonStreaming(
            model=MODEL,
            max_tokens=7000,
            system=[{"type": "text", "text": SYSTEM_PROMPT}],
            output_config={"format": {"type": "json_schema", "schema": JSON_SCHEMA}},
            messages=[{"role": "user", "content": rohdaten}],
        ),
    )


def main():
    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

    with open(ROH_PATH, "r", encoding="utf-8") as f:
        personen = json.load(f)
    print(f"{len(personen)} Personen insgesamt.")

    print("Hole Wikipedia-Auszuege (mit Zwischenspeicher) ...")
    extrakte = hole_alle_extrakte(personen)

    print("Baue Batch-Anfragen ...")
    requests = [baue_request(p, extrakte[p["id"]]) for p in personen]

    print(f"Reiche Batch mit {len(requests)} Anfragen ein ...")
    batch = client.messages.batches.create(requests=requests)
    print(f"Batch-ID: {batch.id}")

    while True:
        batch = client.messages.batches.retrieve(batch.id)
        zaehler = batch.request_counts
        print(
            f"  Status: {batch.processing_status} | "
            f"fertig={zaehler.succeeded} fehler={zaehler.errored} "
            f"laeuft={zaehler.processing}"
        )
        if batch.processing_status == "ended":
            break
        time.sleep(30)

    print("Sammle Ergebnisse ein ...")
    personen_nach_id = {p["id"]: p for p in personen}
    ergebnisse = []
    fehler = []

    for result in client.messages.batches.results(batch.id):
        person = personen_nach_id.get(result.custom_id)
        if person is None:
            continue
        if result.result.type == "succeeded":
            msg = result.result.message
            text_block = next((b for b in msg.content if b.type == "text"), None)
            if text_block:
                try:
                    struktur = json.loads(text_block.text)
                    ergebnisse.append({**person, "struktur": struktur})
                    continue
                except json.JSONDecodeError:
                    pass
        fehler.append(result.custom_id)

    with open(FINAL_PATH, "w", encoding="utf-8") as f:
        json.dump(ergebnisse, f, ensure_ascii=False, indent=2)

    print(f"\nFertig: {len(ergebnisse)} erfolgreich, {len(fehler)} fehlgeschlagen.")
    if fehler:
        print("Fehlgeschlagene IDs:", fehler)
    print(f"Gespeichert: {FINAL_PATH}")


if __name__ == "__main__":
    main()
