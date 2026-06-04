// src/services/geminiAnalysis.ts
import { getFunctions, httpsCallable } from 'firebase/functions'
import { app } from '../config/firebase'
import { BLOOD_VALUES } from '../constants/bloodValues'

const functions = getFunctions(app, 'europe-west1')

// ─── Lookup-Map für schnellen Zugriff auf Referenzbereiche ────────────────────
const BLOOD_VALUE_MAP = new Map(BLOOD_VALUES.map((bv) => [bv.id, bv]))

export interface AnalysisInput {
  bloodTests: any[]
  nutrition: any[]
  supplements: any[]
  training: any[]
  profile: {
    // Kein Name – Pseudonymisierung gemäß DSGVO
    gender: string | null
    birthYear: number | null
    cyclePhase: string
  }
}

export interface AnalysisResult {
  summary: string
  abnormalValues: { name: string; value: string; assessment: string; recommendation: string }[]
  borderlineValues: { name: string; value: string; assessment: string; recommendation: string }[]
  nutritionInsights: string
  supplementRecommendations: string
  trainingInsights: string
  overallScore: number
  advice: string[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Positionsbasierte Voranalyse (Client-seitig, vor dem KI-Aufruf)
// ─────────────────────────────────────────────────────────────────────────────

type ValueStatus =
  | 'optimal'           // Mitte des Normbereichs (25–75 %)
  | 'borderline_low'    // Unteres Viertel des Normbereichs (0–25 %)
  | 'borderline_high'   // Oberes Viertel des Normbereichs (75–100 %)
  | 'below'             // Unter dem Normbereich
  | 'above'             // Über dem Normbereich
  | 'unknown'           // Kein Referenzbereich bekannt

interface ValueAnalysis {
  key: string
  displayName: string
  displayValue: string
  status: ValueStatus
  rangePosition: number | null
  deviationPercent: number | null
  scorePenalty: number
  refMin: number | null
  refMax: number | null
  unit: string
}

/**
 * Bestimmt Status und Penalty eines einzelnen Blutwerts.
 *
 * Referenzbereich wird aus BLOOD_VALUES (Konstante) nachgeschlagen –
 * NICHT aus den gespeicherten Firestore-Daten, da dort nur {value, unit} liegt.
 *
 * Penalty-Schema (Rohwerte vor Soft-Cap):
 *   optimal (25–75 % der Spanne):            0
 *   borderline (0–25 % / 75–100 %):          1
 *   außerhalb, Abweichung < 10 %:            4
 *   außerhalb, Abweichung 10–25 %:           6
 *   außerhalb, Abweichung 25–50 %:           8
 *   außerhalb, Abweichung > 50 %:           10
 */
function analyzeValue(key: string, val: any, gender: string): ValueAnalysis {
  const rawValue = parseFloat(String(val.value))
  const unit: string = val.unit ?? ''
  const displayValue = `${val.value} ${unit}`

  const bvDef = BLOOD_VALUE_MAP.get(key)
  const displayName = bvDef?.name ?? key

  // Geschlechtsspezifischen Referenzbereich aus der Konstante holen
  const refRanges = bvDef?.referenceRanges
  const range = refRanges
    ? (refRanges[gender as 'male' | 'female'] ?? refRanges.all ?? null)
    : null

  const refMin: number | null = range?.min ?? null
  const refMax: number | null = range?.max ?? null

  if (refMin == null || refMax == null || isNaN(rawValue)) {
    return {
      key, displayName, displayValue, status: 'unknown',
      rangePosition: null, deviationPercent: null,
      scorePenalty: 0, refMin, refMax, unit,
    }
  }

  // Werte mit künstlichem Maximum (z.B. HDL: refMax = 999) → nur Untergrenze prüfen
  const hasNoUpperLimit = refMax >= 900
  const span = refMax - refMin
  const position = span > 0 ? (rawValue - refMin) / span : 0.5

  // Unterhalb des Normbereichs
  if (position < 0) {
    const deviationPercent = span > 0 ? Math.abs(position) * 100 : 0
    return {
      key, displayName, displayValue, status: 'below',
      rangePosition: position, deviationPercent,
      scorePenalty: deviationPenalty(deviationPercent),
      refMin, refMax, unit,
    }
  }

  // Oberhalb des Normbereichs (außer bei Werten ohne sinnvolle Obergrenze wie HDL)
  if (position > 1 && !hasNoUpperLimit) {
    const deviationPercent = (position - 1) * 100
    return {
      key, displayName, displayValue, status: 'above',
      rangePosition: position, deviationPercent,
      scorePenalty: deviationPenalty(deviationPercent),
      refMin, refMax, unit,
    }
  }

  // Innerhalb: Viertel bestimmen
  if (!hasNoUpperLimit && position < 0.25) {
    return {
      key, displayName, displayValue, status: 'borderline_low',
      rangePosition: position, deviationPercent: null,
      scorePenalty: 1, refMin, refMax, unit,
    }
  }
  if (!hasNoUpperLimit && position > 0.75) {
    return {
      key, displayName, displayValue, status: 'borderline_high',
      rangePosition: position, deviationPercent: null,
      scorePenalty: 1, refMin, refMax, unit,
    }
  }

  return {
    key, displayName, displayValue, status: 'optimal',
    rangePosition: position, deviationPercent: null,
    scorePenalty: 0, refMin, refMax, unit,
  }
}

/** Penalty-Punkte abhängig vom Abweichungsgrad (in % außerhalb des Bereichs) */
function deviationPenalty(deviationPercent: number): number {
  if (deviationPercent < 10) return 4
  if (deviationPercent < 25) return 6
  if (deviationPercent < 50) return 8
  return 10
}

/**
 * Berechnet den Vorschlags-Score auf Basis der Einzelwert-Penalties.
 *
 * Scoring-Formel:
 *   1. Rohpenalty = Summe aller Einzelpenalties
 *   2. Soft-Cap ab 60 Punkten: jeder weitere Punkt zählt nur 40 %
 *      → verhindert, dass viele mäßig-schlechte Werte zum Score 0 führen
 *   3. Minimaler Score = 8 (selbst bei extremen Befunden)
 *
 * Beispiel-Eichung:
 *   Alle optimal             → 100
 *   1 leicht außerhalb       →  96
 *   3 moderat außerhalb      →  82
 *   5 moderat außerhalb      →  66
 *   8 moderat außerhalb      →  43
 *   12 außerhalb (mix)       →  31
 *   15 außerhalb (stark)     →  16
 */
function computeSuggestedScore(analyses: ValueAnalysis[]): number {
  const rawPenalty = analyses.reduce((sum, a) => sum + a.scorePenalty, 0)

  // Soft-Cap: nach 60 Punkten gilt jeder weitere Abzug nur zu 40 %
  const cappedPenalty = rawPenalty <= 60
    ? rawPenalty
    : 60 + (rawPenalty - 60) * 0.4

  return Math.max(8, Math.min(100, Math.round(100 - cappedPenalty)))
}

function statusLabel(s: ValueStatus): string {
  switch (s) {
    case 'below':           return '⬇ UNTER Normbereich'
    case 'above':           return '⬆ ÜBER Normbereich'
    case 'borderline_low':  return '↙ unteres Normviertel'
    case 'borderline_high': return '↗ oberes Normviertel'
    case 'optimal':         return '✓ optimal'
    default:                return '? kein Referenzbereich'
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Hauptfunktion
// ─────────────────────────────────────────────────────────────────────────────

export async function analyzeHealthData(input: AnalysisInput): Promise<AnalysisResult> {
  const { bloodTests, nutrition, supplements, training, profile } = input
  const latestBloodTest = bloodTests[0]
  const age = profile.birthYear ? new Date().getFullYear() - profile.birthYear : null
  const gender = profile.gender ?? 'male'

  // ── 1. Client-seitige Voranalyse ────────────────────────────────────────────
  const rawEntries = Object.entries(latestBloodTest?.values ?? {}) as [string, any][]
  const analyses = rawEntries.map(([key, val]) => analyzeValue(key, val, gender))
  const suggestedScore = computeSuggestedScore(analyses)

  const abnormalCount   = analyses.filter((a) => a.status === 'below' || a.status === 'above').length
  const borderlineCount = analyses.filter((a) => a.status === 'borderline_low' || a.status === 'borderline_high').length
  const optimalCount    = analyses.filter((a) => a.status === 'optimal').length
  const unknownCount    = analyses.filter((a) => a.status === 'unknown').length

  console.log(
    `[Analyse] ${analyses.length} Werte gesamt | ` +
    `${abnormalCount} außerhalb | ${borderlineCount} Randbereich | ` +
    `${optimalCount} optimal | ${unknownCount} ohne Ref | ` +
    `Score-Vorschlag: ${suggestedScore}`
  )

  // ── 2. Prompt-Tabelle ────────────────────────────────────────────────────────
  const valueLines = analyses.map((a) => {
    const refStr = a.refMin != null
      ? `Ref: ${a.refMin}–${a.refMax !== null && a.refMax >= 900 ? '∞' : a.refMax} ${a.unit}`
      : 'kein Ref.'
    const posStr = a.rangePosition != null && a.rangePosition >= 0 && a.rangePosition <= 1
      ? `Pos: ${Math.round(a.rangePosition * 100)}%`
      : ''
    const devStr = a.deviationPercent != null
      ? ` (${Math.round(a.deviationPercent)}% außerhalb)`
      : ''
    return `${a.displayName}: ${a.displayValue} | ${refStr} | ${statusLabel(a.status)}${devStr} | ${posStr}`
  }).join('\n')

  // ── 3. Score-Toleranzband für den KI-Aufruf ─────────────────────────────────
  // KI darf ±5 Punkte vom vorberechneten Score abweichen
  const scoreMin = Math.max(8, suggestedScore - 5)
  const scoreMax = Math.min(100, suggestedScore + 5)

  // ── 4. Prompt ────────────────────────────────────────────────────────────────
  const prompt = `Du bist ein präziser medizinischer Gesundheitsanalyst. Analysiere die Gesundheitsdaten und antworte AUSSCHLIESSLICH mit einem JSON-Objekt – kein Text, keine Backticks.

NUTZERPROFIL:
- Geschlecht: ${gender === 'male' ? 'Männlich' : gender === 'female' ? 'Weiblich' : 'Divers/Unbekannt'}
- Alter: ${age ? `${age} Jahre` : 'Unbekannt'}${gender === 'female' ? `\n- Zyklusphase: ${profile.cyclePhase}` : ''}

BLUTWERTE (${latestBloodTest?.date ?? 'kein Datum'}):
${valueLines || 'Keine Blutwerte vorhanden'}

ERNÄHRUNG: ${nutrition.length} Einträge erfasst
SUPPLEMENTS: ${supplements.map((s: any) => s.name).join(', ') || 'Keine'}
TRAINING: ${training.slice(0, 5).map((t: any) => `${t.label} ${t.duration}min`).join(', ') || 'Kein Training erfasst'}

═══════════════════════════════════════
SCORING (strikt einhalten):
═══════════════════════════════════════
Vorberechneter Score: ${suggestedScore}/100

Basis dieser Berechnung:
- Werte AUSSERHALB (⬇/⬆): -4 bis -10 Punkte je nach Abweichungsgrad
- Werte am Normrand (↙/↗): -1 Punkt
- Soft-Cap: ab 60 Punkten Gesamtabzug wird jeder weitere Abzug auf 40% reduziert

Der finale overallScore MUSS im Bereich [${scoreMin}, ${scoreMax}] liegen.
Einzige Ausnahme: systemische Zusammenhänge zwischen mehreren Werten sind klinisch eindeutig.

═══════════════════════════════════════
AUSGABE (kompakt & konkret):
═══════════════════════════════════════
• summary: 2–3 Sätze. Gesamteindruck + wichtigster Handlungsbedarf.
• abnormalValues: NUR Werte mit ⬇ oder ⬆.
  - assessment: 1 Satz medizinische Bedeutung.
  - recommendation: 1–2 konkrete Maßnahmen (Supplement + Dosis, Ernährung oder Arzttermin).
• borderlineValues: NUR Werte mit ↙ oder ↗.
  - assessment: 1 kurzer Satz.
  - recommendation: 1 präventive Maßnahme.
• nutritionInsights: max. 2 Sätze.
• supplementRecommendations: Konkrete Supplements mit Dosis, max. 5 Empfehlungen.
• trainingInsights: 1–2 Sätze.
• advice: Genau 4 priorisierte Handlungsstichpunkte (kurz, kein Fließtext).

Empfehlungs-Stil (nur als Vorlage):
- "Ferritin niedrig → Eisenbisglycinat 25 mg nüchtern + Vitamin C täglich"
- "LDL erhöht → Omega-3 2–3 g/Tag, rotes Fleisch max. 2×/Woche"
- "Vitamin D low → D3 4000 IE/Tag für 8 Wochen, dann erneut messen"

Antworte NUR mit diesem JSON:
{
  "summary": "...",
  "abnormalValues": [{"name":"...","value":"...","assessment":"...","recommendation":"..."}],
  "borderlineValues": [{"name":"...","value":"...","assessment":"...","recommendation":"..."}],
  "nutritionInsights": "...",
  "supplementRecommendations": "...",
  "trainingInsights": "...",
  "overallScore": ${suggestedScore},
  "advice": ["...","...","...","..."]
}`

  // ── 5. Firebase-Call ─────────────────────────────────────────────────────────
  const callAnalyze = httpsCallable(functions, 'analyzeHealthData')
  const result = await callAnalyze({ prompt })

  const data = result.data as any
  const parts = data.candidates?.[0]?.content?.parts ?? []
  const fullText = parts
    .filter((p: any) => p.text)
    .map((p: any) => p.text)
    .join('')

  if (!fullText) throw new Error('Keine Antwort von Gemini erhalten')

  const jsonMatch = fullText.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Kein gültiges JSON in der Antwort gefunden')

  let parsed: AnalysisResult
  try {
    parsed = JSON.parse(jsonMatch[0]) as AnalysisResult
  } catch {
    throw new Error('JSON konnte nicht geparst werden')
  }

  // ── 6. Hartes Sicherheitsnetz: Score-Clamp ───────────────────────────────────
  parsed.overallScore = Math.max(scoreMin, Math.min(scoreMax, parsed.overallScore))

  // Defensive Defaults für fehlende Arrays
  parsed.borderlineValues = parsed.borderlineValues ?? []
  parsed.abnormalValues   = parsed.abnormalValues ?? []
  parsed.advice           = parsed.advice ?? []

  return parsed
}