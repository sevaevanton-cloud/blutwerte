// src/services/geminiAnalysis.ts
import { getFunctions, httpsCallable } from 'firebase/functions'
import { app } from '../config/firebase'
import { BLOOD_VALUES } from '../constants/bloodValues'
import { getRefRangeForUnit } from '../utils/unitConversions'

const functions = getFunctions(app, 'europe-west1')

// ─── Types ────────────────────────────────────────────────────────────────────
export interface AnalysisInput {
  bloodTests: any[]
  nutrition: any[]
  supplements: any[]
  training: any[]
  profile: {
    gender: string | null
    birthYear: number | null
    cyclePhase: string
  }
}

export interface AnalysisResult {
  summary: string
  abnormalValues: { name: string; value: string; assessment: string }[]
  nutritionInsights: string
  supplementRecommendations: string
  trainingInsights: string
  overallScore: number
  advice: string[]
}

// ─── Systeme für Systemmalus ──────────────────────────────────────────────────
const SYSTEMS: { name: string; ids: string[] }[] = [
  { name: 'Schilddrüse',         ids: ['tsh', 'ft3', 'ft4', 'tpo_ak', 'thyroglobulin', 'thyroglobulin_antibody', 'trak', 'calcitonin', 'reverse_t3'] },
  { name: 'Männliche Hormone',   ids: ['total_testosterone_male', 'free_testosterone_male', 'dht', 'shbg_male', 'lh_male', 'fsh_male', 'estradiol_male', 'fai'] },
  { name: 'Weibliche Hormone',   ids: ['total_testosterone_female', 'free_testosterone_female', 'shbg_female', 'estradiol', 'fsh', 'lh', 'progesterone', 'amh', 'progesterone_17oh'] },
  { name: 'Allg. Hormone',       ids: ['cortisol', 'cortisol_midnight', 'acth', 'dhea_s', 'dhea_female', 'dhea_free', 'growth_hormone', 'insulin_like_growth_factor', 'prolactin', 'aldosterone'] },
  { name: 'Stoffwechsel',        ids: ['glucose', 'hba1c', 'insulin', 'homa_index', 'c_peptide', 'insulin_fasting', 'glucose_2h', 'fructosamine'] },
  { name: 'Entzündung',          ids: ['crp', 'hs_crp', 'esr', 'il6', 'il2_receptor', 'ecp', 'pct', 'leukocytes'] },
  { name: 'Leber',               ids: ['got', 'gpt', 'ggt', 'ap', 'bilirubin_total', 'bilirubin_direct', 'gldh', 'cholinesterase', 'ldh', 'hbdh', 'albumin'] },
  { name: 'Niere',               ids: ['creatinine', 'gfr', 'urea', 'uric_acid', 'cystatin_c', 'creatinine_clearance'] },
  { name: 'Herz & Lipide',       ids: ['cholesterol', 'ldl', 'hdl', 'triglycerides', 'lipoprotein_a', 'apolipoprotein_a1', 'apolipoprotein_b', 'bnp', 'troponin'] },
  { name: 'Eisenstoffwechsel',   ids: ['ferritin', 'iron', 'transferrin', 'transferrin_saturation', 'tibc', 'holo_tc', 'soluble_transferrin_receptor', 'haptoglobin'] },
]

// ─── Supplement → Blutwert Mapping ───────────────────────────────────────────
const SUPPLEMENT_MAP: { keywords: string[]; bloodIds: string[]; nutrient: string }[] = [
  { keywords: ['vitamin d', 'd3', 'cholecalciferol', 'vitamin-d'],            bloodIds: ['vitamin_d', 'vitamin_d_1_25oh'],              nutrient: 'Vitamin D' },
  { keywords: ['vitamin b12', 'b12', 'cobalamin', 'methylcobalamin'],          bloodIds: ['vitamin_b12', 'holo_tc', 'methylmalonic_acid'], nutrient: 'Vitamin B12' },
  { keywords: ['eisen', 'iron', 'ferrum'],                                     bloodIds: ['ferritin', 'iron', 'transferrin_saturation'],   nutrient: 'Eisen' },
  { keywords: ['magnesium'],                                                    bloodIds: ['magnesium'],                                    nutrient: 'Magnesium' },
  { keywords: ['zink', 'zinc'],                                                 bloodIds: ['zinc'],                                         nutrient: 'Zink' },
  { keywords: ['omega-3', 'omega 3', 'fischöl', 'fish oil', 'epa', 'dha'],     bloodIds: ['crp', 'hs_crp', 'triglycerides'],               nutrient: 'Omega-3' },
  { keywords: ['folsäure', 'folat', 'folic', 'folate', 'vitamin b9'],          bloodIds: ['folate'],                                       nutrient: 'Folsäure' },
  { keywords: ['selen', 'selenium'],                                            bloodIds: ['selenium'],                                     nutrient: 'Selen' },
  { keywords: ['coenzym q10', 'coq10', 'ubiquinol', 'ubiquinon'],              bloodIds: ['ubiquinone_q10'],                               nutrient: 'CoQ10' },
  { keywords: ['vitamin k2', 'k2', 'menaquinon', 'mk-7', 'mk7'],              bloodIds: ['vitamin_k'],                                    nutrient: 'Vitamin K2' },
  { keywords: ['vitamin b6', 'pyridoxin'],                                     bloodIds: ['vitamin_b6'],                                   nutrient: 'Vitamin B6' },
  { keywords: ['vitamin a', 'retinol'],                                        bloodIds: ['vitamin_a'],                                    nutrient: 'Vitamin A' },
  { keywords: ['vitamin e', 'tocopherol'],                                     bloodIds: ['vitamin_e'],                                    nutrient: 'Vitamin E' },
  { keywords: ['jod', 'iodine', 'iodid'],                                      bloodIds: ['tsh', 'ft3', 'ft4'],                            nutrient: 'Jod' },
  { keywords: ['ashwagandha', 'rhodiola'],                                     bloodIds: ['cortisol', 'dhea_s'],                           nutrient: 'Adaptogen' },
]

// ─── Referenzbereich-Lookup mit Einheiten-Unterstützung ──────────────────────
// Gibt den korrekten Referenzbereich für die EINGEGEBENE Einheit zurück
function getRefRange(
  key: string,
  enteredUnit: string,
  gender: string
): { min: number; max: number } | undefined {
  const def = BLOOD_VALUES.find(bv => bv.id === key)
  if (!def) return undefined

  return getRefRangeForUnit(
    key,
    enteredUnit,
    gender,
    def.referenceRanges
  )
}

// ─── Abweichung % (bezogen auf den Grenzwert) ────────────────────────────────
function deviationPct(value: number, min?: number, max?: number): number {
  if (min != null && value < min) return min !== 0 ? ((min - value) / Math.abs(min)) * 100 : 100
  if (max != null && value > max) return max !== 0 ? ((value - max) / Math.abs(max)) * 100 : 100
  return 0
}

// ─── DETERMINISTISCHER SCORE ──────────────────────────────────────────────────
interface ScoreResult {
  score: number
  baseMax: number
  trendNote: string
  abnormalIds: Set<string>
}

function computeHealthScore(bloodTests: any[], gender: string): ScoreResult {
  const latest = bloodTests[0]
  if (!latest?.values) return { score: 0, baseMax: 90, trendNote: '', abnormalIds: new Set() }

  const entries = Object.entries(latest.values as Record<string, any>)
  const N = entries.length
  if (N === 0) return { score: 0, baseMax: 90, trendNote: '', abnormalIds: new Set() }

  const baseMax = N <= 10 ? 90 : N <= 20 ? 94 : 97

  let totalDeduction = 0
  let positionBonus  = 0
  const abnormalIds  = new Set<string>()
  const systemCounts: Record<string, number> = {}

  for (const [key, val] of entries) {
    const def      = BLOOD_VALUES.find(bv => bv.id === key)
    const numVal   = typeof val.value === 'number' ? val.value : parseFloat(String(val.value))
    const unit     = val.unit ?? def?.defaultUnit ?? ''

    if (isNaN(numVal) || !def) continue

    // ── Referenzbereich für die eingegebene Einheit holen ─────────────────
    const refRange = getRefRange(key, unit, gender)

    if (!refRange) continue
    const { min, max } = refRange

    const isLow  = numVal < min
    const isHigh = numVal > max

    if (isLow || isHigh) {
      abnormalIds.add(key)
      const dev       = deviationPct(numVal, min, max)
      const deduction = dev <= 5 ? 1 : dev <= 20 ? 3 : 5
      totalDeduction += deduction

      for (const sys of SYSTEMS) {
        if (sys.ids.includes(key)) {
          systemCounts[sys.name] = (systemCounts[sys.name] ?? 0) + 1
        }
      }
    } else {
      // Positionsbonus für mittleres Drittel (optimale Zone)
      const rangeSize = max - min
      if (rangeSize > 0) {
        const lo = min + rangeSize / 3
        const hi = max - rangeSize / 3
        if (numVal >= lo && numVal <= hi) positionBonus += 0.25
      }
    }
  }

  // Systemmalus: -3 pro System mit ≥2 auffälligen Werten
  for (const count of Object.values(systemCounts)) {
    if (count >= 2) totalDeduction += 3
  }

  totalDeduction = Math.min(totalDeduction, 60)
  const cappedBonus = Math.min(Math.round(positionBonus), 3)

  // Trend (wenn 2+ Blutbilder vorhanden)
  let trendDelta = 0
  let trendNote  = ''

  if (bloodTests.length >= 2) {
    const prev     = bloodTests[1]
    const currVals = latest.values as Record<string, any>
    const prevVals = (prev.values ?? {}) as Record<string, any>
    let improved = 0, worsened = 0

    for (const [key] of entries) {
      if (!prevVals[key]) continue
      const def      = BLOOD_VALUES.find(bv => bv.id === key)
      const unit     = currVals[key]?.unit ?? def?.defaultUnit ?? ''
      const refRange = getRefRange(key, unit, gender)
      if (!refRange) continue

      const mid     = (refRange.min + refRange.max) / 2
      const currNum = typeof currVals[key].value === 'number' ? currVals[key].value : parseFloat(String(currVals[key].value))
      const prevNum = typeof prevVals[key].value === 'number' ? prevVals[key].value : parseFloat(String(prevVals[key].value))

      if (isNaN(currNum) || isNaN(prevNum)) continue
      if (Math.abs(currNum - mid) < Math.abs(prevNum - mid) - 0.01) improved++
      else if (Math.abs(currNum - mid) > Math.abs(prevNum - mid) + 0.01) worsened++
    }

    const net = improved - worsened
    if (net > 2)  { trendDelta = -2; trendNote = `📈 Positiver Verlauf: ${improved} Werte verbessert, ${worsened} verschlechtert.` }
    else if (net < -2) { trendDelta = 2;  trendNote = `📉 Negativer Verlauf: ${worsened} Werte verschlechtert, ${improved} verbessert.` }
    else          { trendNote = `➡️ Stabiler Verlauf: ${improved} verbessert, ${worsened} verschlechtert.` }

    totalDeduction = Math.max(0, Math.min(60, totalDeduction + trendDelta))
  }

  const score = Math.max(0, Math.min(baseMax, Math.round(baseMax - totalDeduction + cappedBonus)))
  return { score, baseMax, trendNote, abnormalIds }
}

function scoreLabel(s: number) {
  return s >= 95 ? 'Optimal' : s >= 90 ? 'Gut' : s >= 80 ? 'OK' : s >= 70 ? 'Grenzwertig' : s >= 60 ? 'Bedenklich' : 'Kritisch'
}

// ─── Supplement-Intelligenz-Text ─────────────────────────────────────────────
function buildSupplementContext(
  supplements: any[],
  bloodValues: Record<string, any>,
  abnormalIds: Set<string>,
  gender: string
): string {
  if (supplements.length === 0) return 'Keine Supplements eingetragen.'
  const lines: string[] = []

  for (const mapping of SUPPLEMENT_MAP) {
    const taken = supplements.find((s: any) =>
      mapping.keywords.some(kw => s.name?.toLowerCase().includes(kw))
    )
    if (!taken) continue

    const abnormalBloodId = mapping.bloodIds.find(id => abnormalIds.has(id))
    if (abnormalBloodId) {
      const def      = BLOOD_VALUES.find(bv => bv.id === abnormalBloodId)
      const val      = bloodValues[abnormalBloodId]
      lines.push(
        `⚠️ ${mapping.nutrient}: Nutzer nimmt bereits "${taken.name}"` +
        `${taken.dose ? ` (${taken.dose} ${taken.unit})` : ''}, ` +
        `aber ${def?.name ?? abnormalBloodId}${val ? ` = ${val.value} ${val.unit}` : ''} ist trotzdem auffällig. ` +
        `→ KEINE neue Einnahme empfehlen, stattdessen Dosierung/Timing optimieren.`
      )
    } else {
      lines.push(`✅ ${mapping.nutrient}: "${taken.name}" wird eingenommen, zugehörige Werte unauffällig.`)
    }
  }

  const notMapped = supplements.filter((s: any) =>
    !SUPPLEMENT_MAP.some(m => m.keywords.some(kw => s.name?.toLowerCase().includes(kw)))
  )
  if (notMapped.length > 0) {
    lines.push(`Sonstige Supplements: ${notMapped.map((s: any) => s.name).join(', ')}`)
  }

  return lines.length > 0 ? lines.join('\n') : `Supplements: ${supplements.map((s: any) => s.name).join(', ')}`
}

// ─── HAUPTFUNKTION ────────────────────────────────────────────────────────────
export async function analyzeHealthData(input: AnalysisInput): Promise<AnalysisResult> {
  const { bloodTests, nutrition, supplements, training, profile } = input

  const latestBloodTest = bloodTests[0]
  const age    = profile.birthYear ? new Date().getFullYear() - profile.birthYear : null
  const gender = profile.gender ?? 'all'

  const { score: computedScore, baseMax, trendNote, abnormalIds } =
    computeHealthScore(bloodTests, gender)
  const label = scoreLabel(computedScore)

  // ── Blutwerte für Prompt formatieren (mit einheitenkorrekten Referenzbereichen) ──
  const bloodValues = latestBloodTest?.values ?? {}
  const N = Object.keys(bloodValues).length

  const formattedBloodValues = N > 0
    ? Object.entries(bloodValues as Record<string, any>).map(([key, val]) => {
        const def    = BLOOD_VALUES.find(bv => bv.id === key)
        const unit   = val.unit ?? def?.defaultUnit ?? ''
        const numVal = typeof val.value === 'number' ? val.value : parseFloat(String(val.value))

        // Einheitenkorrekter Referenzbereich ──────────────────────────────
        const refRange = getRefRange(key, unit, gender)
        const { min, max } = refRange ?? {}

        const isLow  = min != null && !isNaN(numVal) && numVal < min
        const isHigh = max != null && !isNaN(numVal) && numVal > max
        const dev    = isNaN(numVal) ? 0 : deviationPct(numVal, min, max)

        const refStr  = min != null && max != null ? ` [Ref: ${min}–${max} ${unit}]` : ''
        const flagStr = isLow
          ? ` ⬇ UNTER Referenz (${dev.toFixed(1)}% Abw.)`
          : isHigh
          ? ` ⬆ ÜBER Referenz (${dev.toFixed(1)}% Abw.)`
          : ' ✓'

        return `• ${def?.name ?? key}: ${val.value} ${unit}${refStr}${flagStr}`
      }).join('\n')
    : 'Keine Blutwerte verfügbar'

  const dataTier = N <= 10
    ? `Kleines Blutbild (${N} Werte) – max. Score ${baseMax}`
    : N <= 20
    ? `Mittleres Blutbild (${N} Werte) – max. Score ${baseMax}`
    : `Großes Blutbild (${N} Werte) – max. Score ${baseMax}`

  const supplementContext = buildSupplementContext(supplements, bloodValues, abnormalIds, gender)
  const trendSection = trendNote ? `\nTREND:\n${trendNote}` : ''

  // ── Prompt ────────────────────────────────────────────────────────────────
  const prompt = `Du bist ein erfahrener Gesundheitsanalyst. Erstelle eine präzise, medizinisch fundierte Analyse.
Antworte AUSSCHLIESSLICH mit einem JSON-Objekt – kein Text davor/danach, keine Backticks, kein Markdown.

═══════════════════════════════════════════════════
⚠️  SCORE WURDE MATHEMATISCH BERECHNET: ${computedScore}/100 (${label})
     Du MUSST "overallScore": ${computedScore} zurückgeben. Nicht ändern.
═══════════════════════════════════════════════════

NUTZERPROFIL:
• Geschlecht: ${profile.gender === 'male' ? 'Männlich' : profile.gender === 'female' ? 'Weiblich' : 'Divers/Unbekannt'}
• Alter: ${age ? `${age} Jahre` : 'Unbekannt'}${profile.gender === 'female' ? `\n• Zyklusphase: ${profile.cyclePhase}` : ''}

BLUTBILD (${latestBloodTest?.date ?? 'kein Datum'}) – ${dataTier}:
${formattedBloodValues}
${trendSection}

ERNÄHRUNG: ${nutrition.length} Einträge
TRAINING: ${training.slice(0, 5).map((t: any) => `${t.label ?? t.type ?? 'Training'} ${t.duration ?? ''}min`).join(', ') || 'Kein Training'}

SUPPLEMENT-KONTEXT (zwingend beachten):
${supplementContext}

DEINE AUFGABEN:
• summary: 2–3 Sätze – was bedeutet Score ${computedScore} (${label})? Wichtigste Befunde benennen.
• abnormalValues: JEDEN ⬇⬆ Wert aufführen. Pro Wert: name, value (mit Einheit + Ref-Bereich), assessment (medizinische Bedeutung + mögliche Symptome).
• nutritionInsights: Ernährungshinweise basierend auf auffälligen Werten.
• supplementRecommendations: ✅-Supplements NICHT neu empfehlen · ⚠️-Supplements: Dosierung/Timing optimieren · sonst: konkrete Empfehlung mit Dosierung.
• trainingInsights: Trainingsempfehlung basierend auf Blutbild.
• advice: Mindestens 4 priorisierte, konkrete Handlungsempfehlungen.

JSON:
{"summary":"...","abnormalValues":[{"name":"...","value":"...","assessment":"..."}],"nutritionInsights":"...","supplementRecommendations":"...","trainingInsights":"...","overallScore":${computedScore},"advice":["...","...","...","..."]}`

  const callAnalyze = httpsCallable(functions, 'analyzeHealthData')
  const result = await callAnalyze({ prompt })

  const data     = result.data as any
  const parts    = data.candidates?.[0]?.content?.parts ?? []
  const fullText = parts.filter((p: any) => p.text).map((p: any) => p.text).join('')

  if (!fullText) throw new Error('Keine Antwort von Gemini erhalten')

  const jsonMatch = fullText.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Kein gültiges JSON in der Antwort gefunden')

  try {
    const parsed = JSON.parse(jsonMatch[0]) as AnalysisResult

    // Score immer auf den berechneten Wert setzen – Gemini kann ihn nicht überschreiben
    parsed.overallScore = computedScore

    if (!Array.isArray(parsed.abnormalValues)) parsed.abnormalValues = []
    if (!Array.isArray(parsed.advice))         parsed.advice         = []

    return parsed
  } catch {
    throw new Error('JSON konnte nicht geparst werden')
  }
}
