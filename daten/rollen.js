// Rollen-Taxonomie fürs Frontend — muss inhaltlich zur Liste in
// islam-epochen/pipeline/strukturiere_testlauf.py passen.

const ROLLEN_GRUPPEN = [
  {
    titel: "Glaubensstatus",
    rollen: [
      { id: "Muslim", label: "Muslim" },
      { id: "Kafir", label: "Kafir" },
      { id: "Munafiq", label: "Munafiq (Heuchler)" },
    ],
  },
  {
    titel: "Generation (Hadithwissenschaft)",
    rollen: [
      { id: "Sahabi", label: "Sahabi (Prophetengefährte)" },
      { id: "Tabii", label: "Tabi'i (Nachfolger)" },
      { id: "Tabi_at_Tabiin", label: "Tabi' at-Tabi'in" },
    ],
  },
  {
    titel: "Politisch & Staatlich",
    rollen: [
      { id: "Stammesoberhaupt", label: "Stammesoberhaupt" },
      { id: "Kalif", label: "Kalif" },
      { id: "Wali", label: "Wali (Gouverneur)" },
      { id: "Wesir", label: "Wesir" },
      { id: "Emir", label: "Emir" },
    ],
  },
  {
    titel: "Militärisch",
    rollen: [
      { id: "Feldherr", label: "Feldherr" },
      { id: "Mujahid", label: "Mujahid" },
      { id: "Shahid", label: "Shahid (Märtyrer)" },
    ],
  },
  {
    titel: "Gelehrsamkeit",
    rollen: [
      { id: "Gelehrter", label: "Gelehrter" },
      { id: "Faqih", label: "Faqih (Rechtsgelehrter)" },
      { id: "Muhaddith", label: "Muhaddith (Hadith-Gelehrter)" },
      { id: "Mufassir", label: "Mufassir (Korandeuter)" },
      { id: "Qari", label: "Qari (Rezitator)" },
      { id: "Qadi", label: "Qadi (Richter)" },
    ],
  },
  {
    titel: "Familiär & Status",
    rollen: [
      { id: "Ahlul_Bayt", label: "Ahlul Bayt" },
      { id: "Umm_al_Muminin", label: "Umm al-Mu'minin" },
      { id: "Muhajir", label: "Muhajir (Auswanderer)" },
      { id: "Ansari", label: "Ansari (Helfer)" },
    ],
  },
  {
    titel: "Kultur",
    rollen: [
      { id: "Dichter", label: "Dichter" },
      { id: "Kaufmann", label: "Kaufmann" },
      { id: "Arzt", label: "Arzt" },
      { id: "Historiker", label: "Historiker" },
    ],
  },
];

const ROLLEN_LABEL = {};
for (const gruppe of ROLLEN_GRUPPEN) {
  for (const r of gruppe.rollen) ROLLEN_LABEL[r.id] = r.label;
}
