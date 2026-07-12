# -*- coding: utf-8 -*-
"""
Islam-Epochen — Schritt 1: Personenliste aus Wikidata holen.

Vereint zwei Quellen zu einer Personenliste (Duplikate werden über die
Wikidata-ID automatisch zusammengeführt):
  A) Rashidun-/Umayyaden-Kalifat (Staatsangehörigkeit, Sahaba-Status oder
     Kalifen-Amt) — wie im ersten Band der Live-Seite.
  B) Nachkommen von Hashim ibn Abd Manaf (Q553241, Urgroßvater des
     Propheten) bis zu 5 Generationen tief — deckt die vorislamische
     Verwandtschaft und den erweiterten Hashim-Clan ab. Fünf Generationen
     wurden bewusst gewählt: das bringt die spätesten Personen auf ca.
     750 n. Chr. (Ende des Umayyaden-Kalifats), tiefer würde bis in die
     Neuzeit reichen (z. B. heutige jordanische Königsfamilie).

Ergebnis wird als JSON-Datei gespeichert — Grundlage für die
Claude-Strukturierung in Schritt 2.
"""

import json
import time
import urllib.request
import urllib.parse

ENDPOINT = "https://query.wikidata.org/sparql"
USER_AGENT = "islam-epochen (Bildungsprojekt, github.com/74faruk)"

QUERY = """
SELECT ?person ?personLabel ?personDescription
       (SAMPLE(?dobRaw) AS ?dob) (SAMPLE(?dodRaw) AS ?dod) (SAMPLE(?imageRaw) AS ?image)
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
  } UNION {
    ?person wdt:P22 wd:Q553241 .
  } UNION {
    ?person wdt:P22/wdt:P22 wd:Q553241 .
  } UNION {
    ?person wdt:P22/wdt:P22/wdt:P22 wd:Q553241 .
  } UNION {
    ?person wdt:P22/wdt:P22/wdt:P22/wdt:P22 wd:Q553241 .
  } UNION {
    ?person wdt:P22/wdt:P22/wdt:P22/wdt:P22/wdt:P22 wd:Q553241 .
  } UNION {
    VALUES ?person { wd:Q553241 }
  }
  ?person wdt:P31 wd:Q5 .
  OPTIONAL { ?person wdt:P569 ?dobRaw . }
  OPTIONAL { ?person wdt:P570 ?dodRaw . }
  OPTIONAL { ?person wdt:P18 ?imageRaw . }
  OPTIONAL { ?person wdt:P106 ?occ . }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "de,en". }
}
GROUP BY ?person ?personLabel ?personDescription
"""


def hole_personen():
    url = ENDPOINT + "?query=" + urllib.parse.quote(QUERY)
    req = urllib.request.Request(
        url,
        headers={"Accept": "application/sparql-results+json", "User-Agent": USER_AGENT},
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        daten = json.load(resp)

    personen = []
    for b in daten["results"]["bindings"]:
        name = b.get("personLabel", {}).get("value", "")
        # Wikidata-interne Platzhalter-IDs ohne echten Namen aussortieren
        if name.startswith("Q") and name[1:].isdigit():
            continue
        personen.append(
            {
                "id": b["person"]["value"].split("/")[-1],
                "name": name,
                "description": b.get("personDescription", {}).get("value", ""),
                "dob": b.get("dob", {}).get("value"),
                "dod": b.get("dod", {}).get("value"),
                "image": b.get("image", {}).get("value"),
                "occupations": b.get("occupations", {}).get("value", ""),
            }
        )
    return personen


if __name__ == "__main__":
    print("Frage Wikidata ab ...")
    personen = hole_personen()
    print(f"{len(personen)} Personen gefunden.")

    out_path = "islam-epochen/pipeline/personen_roh.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(personen, f, ensure_ascii=False, indent=2)
    print(f"Gespeichert: {out_path}")
