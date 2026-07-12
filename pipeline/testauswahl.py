# -*- coding: utf-8 -*-
"""Waehlt die ~25 fruehesten Personen fuer den Qualitaets-Testlauf aus."""

import json

with open("islam-epochen/pipeline/personen_roh.json", "r", encoding="utf-8") as f:
    personen = json.load(f)


def jahr(iso):
    if not iso:
        return None
    try:
        return int(iso[:5].replace("-", "") if iso.startswith("-") else iso[:4])
    except ValueError:
        return None


# Ankerperson Hashim selbst zuerst, dann sortiert nach frühestem bekannten
# Datum (Geburt bevorzugt, sonst Tod), Personen ganz ohne Datum ans Ende.
def sortierschluessel(p):
    if p["id"] == "Q553241":
        return (-1, 0)
    j = jahr(p["dob"]) or jahr(p["dod"])
    return (0, j) if j is not None else (1, 9999)


personen_sortiert = sorted(personen, key=sortierschluessel)
testauswahl = personen_sortiert[:25]

with open("islam-epochen/pipeline/testauswahl.json", "w", encoding="utf-8") as f:
    json.dump(testauswahl, f, ensure_ascii=False, indent=2)

print(f"{len(testauswahl)} Personen fuer den Testlauf gewaehlt:")
for p in testauswahl:
    print(f"- {p['name']} ({p['dob']} - {p['dod']}) — {p['description']}")
