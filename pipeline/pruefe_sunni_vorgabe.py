# -*- coding: utf-8 -*-
"""Schnelltest: prueft die Sunni-Quellen-Vorgabe an drei heiklen Personen,
bevor die grosse (kostenpflichtige) Charge gestartet wird."""

import json
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from strukturiere_testlauf import lade_wikipedia_extrakt, strukturiere_person
import anthropic

NAMEN = ["Abū Tālib ibn ʿAbd al-Muttalib", "Ammar ibn Yasir", "Fatimah bint Asad"]

with open(os.path.join(os.path.dirname(__file__), "testauswahl.json"), "r", encoding="utf-8") as f:
    alle = json.load(f)

client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

for person in alle:
    if person["name"] not in NAMEN:
        continue
    wiki_text, wiki_sprache = lade_wikipedia_extrakt(person["name"])
    struktur, usage = strukturiere_person(client, person, wiki_text, wiki_sprache)
    print("=" * 70)
    print(person["name"])
    print("Rollen:", struktur["rollen"])
    print("Wirken:", struktur["wirken"])
    print("Bedeutung:", struktur["bedeutung"])
    print("Unsicherheit:", struktur["unsicherheit_hinweis"])
    print()
