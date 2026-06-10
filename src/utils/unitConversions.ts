// src/utils/unitConversions.ts
//
// Löst das Problem: referenceRanges in bloodValues.ts ist einheitenagnostisch.
// Diese Datei liefert:
//   1. PER_UNIT_RANGES   – klinisch korrekte Bereiche pro Einheit für ~35 Werte
//   2. UNIT_TO_DEFAULT   – Konversionsfaktoren als Fallback (nicht-default → default)
//   3. getRefRangeForUnit() – Haupt-Lookup-Funktion
//   4. convertToDefaultUnit() – Wert in default-Einheit umrechnen

type Range = { min: number; max: number }
type GenderedRange = { male?: Range; female?: Range; all?: Range }

// ─────────────────────────────────────────────────────────────────────────────
// 1. KLINISCHE REFERENZBEREICHE PRO EINHEIT
//    Nur Werte aufgeführt, bei denen die Einheit die Zahl wesentlich ändert.
//    Quelle: klinische Standardlaborbereiche (DGKL, WHO, Expertenkonsens).
// ─────────────────────────────────────────────────────────────────────────────
export const PER_UNIT_RANGES: Record<string, Record<string, GenderedRange>> = {

  // ── Vitamine ───────────────────────────────────────────────────────────────
  vitamin_d: {
    'ng/mL':  { all: { min: 30, max: 80 } },      // Expertenkonsens 30–80 ng/mL
    'nmol/L': { all: { min: 75, max: 200 } },      // ÷ 2.5 = ng/mL
  },
  vitamin_d_1_25oh: {
    'pg/mL':  { all: { min: 18, max: 72 } },
    'pmol/L': { all: { min: 43, max: 173 } },      // pg/mL × 2.4 = pmol/L
  },
  vitamin_b12: {
    'pg/mL':  { all: { min: 200, max: 900 } },
    'pmol/L': { all: { min: 148, max: 664 } },     // pg/mL × 0.738 ≈ pmol/L
    'ng/mL':  { all: { min: 0.20, max: 0.90 } },   // = pg/mL / 1000
  },

  // ── Stoffwechsel ──────────────────────────────────────────────────────────
  glucose: {
    'mg/dL':  { all: { min: 70, max: 99 } },
    'mmol/L': { all: { min: 3.9, max: 5.5 } },
  },
  glucose_2h: {
    'mg/dL':  { all: { min: 0, max: 140 } },
    'mmol/L': { all: { min: 0, max: 7.8 } },
  },
  hba1c: {
    '%':        { all: { min: 4.0, max: 5.7 } },
    'mmol/mol': { all: { min: 20,  max: 39 } },    // IFCC-Einheit
  },
  insulin: {
    'µIU/mL': { all: { min: 2.6,  max: 24.9 } },
    'pmol/L': { all: { min: 18,   max: 173 } },    // µIU/mL × 6.945 = pmol/L
    'mIU/L':  { all: { min: 2.6,  max: 24.9 } },   // mIU/L = µIU/mL
  },
  insulin_fasting: {
    'µIU/mL': { all: { min: 2.0, max: 10.0 } },
    'pmol/L': { all: { min: 14,  max: 69 } },
    'mIU/L':  { all: { min: 2.0, max: 10.0 } },
  },
  c_peptide: {
    'ng/mL':  { all: { min: 0.8, max: 3.8 } },
    'nmol/L': { all: { min: 0.26, max: 1.26 } },
    'pmol/L': { all: { min: 260, max: 1260 } },
  },

  // ── Lipide & Herz ─────────────────────────────────────────────────────────
  cholesterol: {
    'mg/dL':  { all: { min: 0, max: 200 } },
    'mmol/L': { all: { min: 0, max: 5.2 } },
  },
  ldl: {
    'mg/dL':  { all: { min: 0, max: 116 } },
    'mmol/L': { all: { min: 0, max: 3.0 } },
  },
  hdl: {
    'mg/dL':  { male: { min: 40, max: 90 }, female: { min: 50, max: 90 }, all: { min: 40, max: 90 } },
    'mmol/L': { male: { min: 1.04, max: 2.33 }, female: { min: 1.29, max: 2.33 }, all: { min: 1.04, max: 2.33 } },
  },
  triglycerides: {
    'mg/dL':  { all: { min: 0, max: 150 } },
    'mmol/L': { all: { min: 0, max: 1.7 } },
  },
  lipoprotein_a: {
    'mg/dL':  { all: { min: 0, max: 30 } },
    'nmol/L': { all: { min: 0, max: 75 } },
  },

  // ── Entzündung ────────────────────────────────────────────────────────────
  crp: {
    'mg/L':  { all: { min: 0, max: 5 } },
    'mg/dL': { all: { min: 0, max: 0.5 } },   // mg/dL × 10 = mg/L
  },
  hs_crp: {
    'mg/L':  { all: { min: 0, max: 1 } },
    'mg/dL': { all: { min: 0, max: 0.1 } },
  },

  // ── Blutbild ──────────────────────────────────────────────────────────────
  hemoglobin: {
    'g/dL':   { male: { min: 13.5, max: 17.5 }, female: { min: 12.0, max: 16.0 }, all: { min: 12.0, max: 17.5 } },
    'g/L':    { male: { min: 135,  max: 175 },  female: { min: 120,  max: 160 },  all: { min: 120,  max: 175 } },
    'mmol/L': { male: { min: 8.4,  max: 10.9 }, female: { min: 7.4,  max: 9.9 },  all: { min: 7.4,  max: 10.9 } },
  },
  mchc: {
    'g/dL': { all: { min: 32, max: 36 } },
    'g/L':  { all: { min: 320, max: 360 } },
  },

  // ── Leber ─────────────────────────────────────────────────────────────────
  bilirubin_total: {
    'mg/dL':  { all: { min: 0.1, max: 1.2 } },
    'µmol/L': { all: { min: 2,   max: 21 } },   // mg/dL × 17.1 = µmol/L
  },
  bilirubin_direct: {
    'mg/dL':  { all: { min: 0, max: 0.3 } },
    'µmol/L': { all: { min: 0, max: 5 } },
  },
  albumin: {
    'g/dL': { all: { min: 3.5, max: 5.5 } },
    'g/L':  { all: { min: 35,  max: 55 } },
  },
  total_protein: {
    'g/dL': { all: { min: 6.0, max: 7.8 } },
    'g/L':  { all: { min: 60,  max: 78 } },
  },
  haptoglobin: {
    'g/L':   { all: { min: 0.3, max: 2.0 } },
    'mg/dL': { all: { min: 30,  max: 200 } },   // g/L × 100 = mg/dL
  },

  // ── Niere & Elektrolyte ───────────────────────────────────────────────────
  creatinine: {
    'mg/dL':  { male: { min: 0.7, max: 1.2 }, female: { min: 0.5, max: 1.1 }, all: { min: 0.5, max: 1.2 } },
    'µmol/L': { male: { min: 62,  max: 106 }, female: { min: 44,  max: 97 },  all: { min: 44,  max: 106 } },
  },
  urea: {
    'mg/dL':  { all: { min: 15, max: 40 } },
    'mmol/L': { all: { min: 2.5, max: 6.7 } },
  },
  uric_acid: {
    'mg/dL':  { male: { min: 3.5, max: 7.0 }, female: { min: 2.5, max: 5.7 }, all: { min: 2.5, max: 7.0 } },
    'µmol/L': { male: { min: 208, max: 416 }, female: { min: 149, max: 339 }, all: { min: 149, max: 416 } },
    'mmol/L': { male: { min: 0.21, max: 0.42 }, female: { min: 0.15, max: 0.34 }, all: { min: 0.15, max: 0.42 } },
  },
  calcium: {
    'mmol/L': { all: { min: 2.10, max: 2.55 } },
    'mg/dL':  { all: { min: 8.4,  max: 10.2 } },
    'mEq/L':  { all: { min: 4.2,  max: 5.1 } },
  },
  magnesium: {
    'mmol/L': { all: { min: 0.75, max: 0.95 } },
    'mg/dL':  { all: { min: 1.8,  max: 2.3 } },
    'mEq/L':  { all: { min: 1.5,  max: 1.9 } },
  },
  phosphate: {
    'mmol/L': { all: { min: 0.97, max: 1.45 } },
    'mg/dL':  { all: { min: 3.0,  max: 4.5 } },
  },

  // ── Eisenstoffwechsel ─────────────────────────────────────────────────────
  iron: {
    'µg/dL':  { male: { min: 65,   max: 175 },  female: { min: 50,   max: 170 },  all: { min: 50,   max: 175 } },
    'µmol/L': { male: { min: 11.6, max: 31.3 }, female: { min: 9.0,  max: 30.4 }, all: { min: 9.0,  max: 31.3 } },
  },

  // ── Hormone (allgemein) ───────────────────────────────────────────────────
  cortisol: {
    'µg/dL':  { all: { min: 6.2,  max: 19.4 } },
    'nmol/L': { all: { min: 171,  max: 536 } },
    'ng/mL':  { all: { min: 62,   max: 194 } },   // = µg/dL × 10
  },
  cortisol_midnight: {
    'µg/dL':  { all: { min: 0, max: 1.8 } },
    'nmol/L': { all: { min: 0, max: 50 } },
  },
  dhea_s: {
    'µg/dL':  { male: { min: 120, max: 520 }, female: { min: 45, max: 340 },  all: { min: 45, max: 520 } },
    'µmol/L': { male: { min: 3.2, max: 14.1}, female: { min: 1.2, max: 9.2 }, all: { min: 1.2, max: 14.1 } },
    'ng/mL':  { male: { min: 1200, max: 5200 }, female: { min: 450, max: 3400 }, all: { min: 450, max: 5200 } },
  },

  // ── Hormone (männlich) ────────────────────────────────────────────────────
  total_testosterone_male: {
    'ng/dL':  { male: { min: 300, max: 1000 }, all: { min: 300, max: 1000 } },
    'nmol/L': { male: { min: 10.4, max: 34.7 }, all: { min: 10.4, max: 34.7 } },
    'ng/mL':  { male: { min: 3.0, max: 10.0 }, all: { min: 3.0, max: 10.0 } },
  },
  free_testosterone_male: {
    'pg/mL':  { male: { min: 50,  max: 210 },  all: { min: 50,  max: 210 } },
    'pmol/L': { male: { min: 174, max: 729 },  all: { min: 174, max: 729 } },
    'ng/dL':  { male: { min: 5.0, max: 21.0 }, all: { min: 5.0, max: 21.0 } },
  },

  // ── Hormone (weiblich) ────────────────────────────────────────────────────
  total_testosterone_female: {
    'ng/dL':  { female: { min: 15, max: 70 },    all: { min: 15, max: 70 } },
    'nmol/L': { female: { min: 0.52, max: 2.43 }, all: { min: 0.52, max: 2.43 } },
    'pg/mL':  { female: { min: 150, max: 700 },  all: { min: 150, max: 700 } },
  },
  estradiol: {
    'pg/mL':  { female: { min: 30,  max: 400 },   all: { min: 20,  max: 400 } },
    'pmol/L': { female: { min: 110, max: 1470 },  all: { min: 73,  max: 1470 } },
    'ng/L':   { female: { min: 30,  max: 400 },   all: { min: 20,  max: 400 } }, // ng/L = pg/mL
  },
  progesterone: {
    'ng/mL':  { female: { min: 0.1, max: 25 },   all: { min: 0.1, max: 25 } },
    'nmol/L': { female: { min: 0.3, max: 79.5 }, all: { min: 0.3, max: 79.5 } },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. KONVERSIONSFAKTOREN (Fallback wenn kein per-Unit-Bereich vorhanden)
//    Format: bloodValueId → { 'nicht-default-Einheit': Faktor oder Funktion }
//    Ergebnis: eingegebener Wert × Faktor = Wert in defaultUnit
// ─────────────────────────────────────────────────────────────────────────────
export const UNIT_TO_DEFAULT: Record<string, Record<string, number | ((v: number) => number)>> = {
  // Vitamine
  vitamin_d:          { 'nmol/L': 0.4006 },                  // nmol/L → ng/mL
  vitamin_d_1_25oh:   { 'pmol/L': 0.4168 },                  // pmol/L → pg/mL
  vitamin_b12:        { 'pmol/L': 1.355, 'ng/mL': 1000 },    // pmol/L → pg/mL; ng/mL → pg/mL
  // Stoffwechsel
  glucose:            { 'mmol/L': 18.02 },
  glucose_2h:         { 'mmol/L': 18.02 },
  hba1c:              { 'mmol/mol': (v: number) => v * 0.0915 + 2.15 },  // IFCC → NGSP %
  insulin:            { 'pmol/L': 0.1440, 'mIU/L': 1 },
  insulin_fasting:    { 'pmol/L': 0.1440, 'mIU/L': 1 },
  c_peptide:          { 'nmol/L': 3.020, 'pmol/L': 0.003020 },
  // Lipide
  cholesterol:        { 'mmol/L': 38.67 },
  ldl:                { 'mmol/L': 38.67 },
  hdl:                { 'mmol/L': 38.67 },
  triglycerides:      { 'mmol/L': 88.57 },
  lipoprotein_a:      { 'nmol/L': 0.4 },
  // Leber
  got:                { 'µkat/L': 60 },
  gpt:                { 'µkat/L': 60 },
  ggt:                { 'µkat/L': 60 },
  gldh:               { 'µkat/L': 60 },
  ap:                 { 'µkat/L': 60 },
  bilirubin_total:    { 'µmol/L': 0.05848 },
  bilirubin_direct:   { 'µmol/L': 0.05848 },
  albumin:            { 'g/L': 0.1 },
  total_protein:      { 'g/L': 0.1 },
  haptoglobin:        { 'mg/dL': 0.01 },                     // mg/dL → g/L
  // Niere & Elektrolyte
  creatinine:         { 'µmol/L': 0.01131 },
  urea:               { 'mmol/L': 6.006 },
  uric_acid:          { 'µmol/L': 0.01681, 'mmol/L': 16.81 },
  calcium:            { 'mg/dL': 0.2495, 'mEq/L': 0.5 },
  magnesium:          { 'mg/dL': 0.4114, 'mEq/L': 0.5 },
  phosphate:          { 'mg/dL': 0.3229 },
  sodium:             { 'mEq/L': 1 },                        // identisch für monovalente Ionen
  potassium:          { 'mEq/L': 1 },
  chloride:           { 'mEq/L': 1 },
  // Entzündung
  crp:                { 'mg/dL': 10 },                       // mg/dL → mg/L
  hs_crp:             { 'mg/dL': 10 },
  // Blutbild
  hemoglobin:         { 'g/L': 0.1, 'mmol/L': 1.6113 },
  mchc:               { 'g/L': 0.1 },
  // Eisenstoffwechsel
  iron:               { 'µmol/L': 5.585 },                   // µmol/L → µg/dL  (Fe MW 55.85)
  // Hormone
  cortisol:           { 'nmol/L': 0.03625, 'ng/mL': 0.1 },
  cortisol_midnight:  { 'nmol/L': 0.03625 },
  dhea_s:             { 'µmol/L': 36.84, 'ng/mL': 0.1 },    // µmol/L → µg/dL
  total_testosterone_male:   { 'nmol/L': 28.84, 'ng/mL': 100 },
  total_testosterone_female: { 'nmol/L': 28.84 },
  free_testosterone_male:    { 'pmol/L': 0.2884, 'ng/dL': 10 },
  estradiol:          { 'pmol/L': 0.2724, 'ng/L': 1 },
  progesterone:       { 'nmol/L': 0.3145 },
  vitamin_k:          { 'nmol/L': 0.4504 },                  // nmol/L → µg/L (approx)
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. HAUPT-LOOKUP: Referenzbereich für eine eingegebene Einheit
// ─────────────────────────────────────────────────────────────────────────────
export function getRefRangeForUnit(
  bloodValueId: string,
  enteredUnit: string,
  gender: string,
  fallbackRange?: { male?: Range; female?: Range; all?: Range }
): Range | undefined {
  // ── Schritt 1: Exakter per-Unit-Treffer ──────────────────────────────────
  const perUnit = PER_UNIT_RANGES[bloodValueId]?.[enteredUnit]
  if (perUnit) {
    return perUnit[gender as 'male' | 'female'] ?? perUnit.all
  }

  // ── Schritt 2: Einheit normalisieren (Großschreibung / Leerzeichen) ───────
  const unitNorm = enteredUnit.trim().toLowerCase()
  for (const [storedUnit, ranges] of Object.entries(PER_UNIT_RANGES[bloodValueId] ?? {})) {
    if (storedUnit.toLowerCase() === unitNorm) {
      return (ranges as GenderedRange)[gender as 'male' | 'female'] ?? (ranges as GenderedRange).all
    }
  }

  // ── Schritt 3: Fallback – gespeicherter Bereich (für defaultUnit) ─────────
  return fallbackRange?.[gender as 'male' | 'female'] ?? fallbackRange?.all
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. EINHEITEN-KONVERSION → defaultUnit (Fallback für Scoring)
// ─────────────────────────────────────────────────────────────────────────────
export function convertToDefaultUnit(
  value: number,
  fromUnit: string,
  bloodValueId: string,
  defaultUnit: string
): number {
  if (fromUnit === defaultUnit) return value

  const conversions = UNIT_TO_DEFAULT[bloodValueId]
  if (!conversions) return value

  // Exakter Treffer
  const factor = conversions[fromUnit]
  if (factor !== undefined) {
    return typeof factor === 'function' ? factor(value) : value * factor
  }

  // Normalisierter Treffer (Groß-/Kleinschreibung)
  const fromNorm = fromUnit.trim().toLowerCase()
  for (const [unit, f] of Object.entries(conversions)) {
    if (unit.toLowerCase() === fromNorm) {
      return typeof f === 'function' ? f(value) : value * f
    }
  }

  return value // Kein Konverter gefunden → unverändert
}
