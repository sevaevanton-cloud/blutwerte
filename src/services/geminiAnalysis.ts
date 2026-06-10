// src/services/geminiAnalysis.ts
import { getFunctions, httpsCallable } from 'firebase/functions'
import { app } from '../config/firebase'
import { BLOOD_VALUES } from '../constants/bloodValues'

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
  {
    name: 'Schilddrüse',
    ids: ['tsh', 'ft3', 'ft4', 'tpo_ak', 'thyroglobulin', 'thyroglobulin_antibody', 'trak', 'calcitonin', 'reverse_t3'],
  },
  {
    name: 'Männliche Hormone',
    ids: ['total_testosterone_male', 'free_testosterone_male', 'dht', 'shbg_male', 'lh_male', 'fsh_male', 'estradiol_male', 'fai'],
  },
  {
    name: 'Weibliche Hormone',
    ids: ['total_testosterone_female', 'free_testosterone_female', 'shbg_female', 'estradiol', 'fsh', 'lh', 'progesterone', 'amh', 'progesterone_17oh'],
  },
  {
    name: 'Allg. Hormone & Stress',
    ids: ['cortisol', 'cortisol_midnight', 'acth', 'dhea_s', 'dhea_female', 'dhea_free', 'growth_hormone', 'insulin_like_growth_factor', 'prolactin', 'aldosterone'],
  },
  {
    name: 'Stoffwechsel',
    ids: ['glucose', 'hba1c', 'insulin', 'homa_index', 'c_peptide', 'insulin_fasting', 'glucose_2h', 'fructosamine'],
  },
  {
    name: 'Entzündung',
    ids: ['crp', 'hs_crp', 'esr', 'il6', 'il2_receptor', 'ecp', 'pct', 'leukocytes'],
  },
  {
    name: 'Leber',
    ids: ['got', 'gpt', 'ggt', 'ap', 'bilirubin_total', 'bilirubin_direct', 'gldh', 'cholinesterase', 'ldh', 'hbdh', 'albumin'],
  },
  {
    name: 'Niere',
    ids: ['creatinine', 'gfr', 'urea', 'uric_acid', 'cystatin_c', 'creatinine_clearance'],
  },
  {
    name: 'Herz & Lipide',
    ids: ['cholesterol', 'ldl', 'hdl', 'triglycerides', 'lipoprotein_a', 'apolipoprotein_a1', 'apolipoprotein_b', 'bnp', 'troponin'],
  },
  {
    name: 'Eisenstoffwechsel',
    ids: ['ferritin', 'iron', 'transferrin', 'transferrin_saturation', 'tibc', 'holo_tc', 'soluble_transferrin_receptor', 'haptoglobin'],
  },
]

// ─── Supplement → Blutwert Mapping (für Intelligenz-Check) ───────────────────
const SUPPLEMENT_MAP: { keywords: string[]; bloodIds: string[]; nutrient: string }[] = [
  { keywords: ['vitamin d', 'd3', 'cholecalciferol', 'vitamin-d'],             bloodIds: ['vitamin_d', 'vitamin_d_1_25oh'],              nutrient: 'Vitamin D' },
  { keywords: ['vitamin b12', 'b12', 'cobalamin', 'methylcobalamin'],           bloodIds: ['vitamin_b12', 'holo_tc', 'methylmalonic_acid'], nutrient: 'Vitamin B12' },
  { keywords: ['eisen', 'iron', 'ferrum', 'ferritin'],                          bloodIds: ['ferritin', 'iron', 'transferrin_saturation'],   nutrient: 'Eisen' },
  { keywords: ['magnesium'],                                                     bloodIds: ['magnesium'],                                    nutrient: 'Magnesium' },
  { keywords: ['zink', 'zinc'],                                                  bloodIds: ['zinc'],                                         nutrient: 'Zink' },
  { keywords: ['omega-3', 'omega 3', 'fischöl', 'fish oil', 'epa', 'dha'],      bloodIds: ['crp', 'hs_crp', 'triglycerides'],               nutrient: 'Omega-3' },
  { keywords: ['folsäure', 'folat', 'folic', 'folate', 'vitamin b9'],           bloodIds: ['folate'],                                       nutrient: 'Folsäure' },
  { keywords: ['selen', 'selenium'],                                             bloodIds: ['selenium'],                                     nutrient: 'Selen' },
  { keywords: ['coenzym q10', 'coq10', 'ubiquinol', 'ubiquinon'],               bloodIds: ['ubiquinone_q10'],                               nutrient: 'CoQ10' },
  { keywords: ['vitamin k2', 'k2', 'menaquinon', 'mk-7', 'mk7'],               bloodIds: ['vitamin_k'],                                    nutrient: 'Vitamin K2' },
  { keywords: ['vitamin b1', 'thiamin', 'thiamine'],                            bloodIds: ['vitamin_b1'],                                   nutrient: 'Vitamin B1' },
  { keywords: ['vitamin b2', 'riboflavin'],                                      bloodIds: ['vitamin_b2'],                                   nutrient: 'Vitamin B2' },
  { keywords: ['vitamin b6', 'pyridoxin', 'pyridoxine'],                        bloodIds: ['vitamin_b6'],                                   nutrient: 'Vitamin B6' },
  { keywords: ['vitamin a', 'retinol', 'beta-carotin'],                         bloodIds: ['vitamin_a'],                                    nutrient: 'Vitamin A' },
  { keywords: ['vitamin e', 'tocopherol', 'tokoferol'],                         bloodIds: ['vitamin_e'],                                    nutrient: 'Vitamin E' },
  { keywords: ['jod', 'iodine', 'iodid', 'iod'],                               bloodIds: ['tsh', 'ft3', 'ft4'],                            nutrient: 'Jod' },
  { keywords: ['kalzium', 'calcium'],                                            bloodIds: ['calcium'],                                      nutrient: 'Kalzium' },
  { keywords: ['kupfer', 'copper'],                                              bloodIds: ['copper'],                                       nutrient: 'Kupfer' },
  { keywords: ['ashwagandha', 'rhodiola', 'adaptogen'],                         bloodIds: ['cortisol', 'dhea_s'],                           nutrient: 'Adaptogen' },
]

// ─── Abweichung berechnen (% außerhalb des Grenzwerts) ───────────────────────
function getDeviationPct(value: number, min?: number, max?: number): number {
  if (min != null && value < min) {
    // Bezugspunkt: der Grenzwert selbst; Fallback auf 1 wenn min=0
    return min !== 0 ? ((min - value) / Math.abs(min)) * 100 : 100
  }
  if (max != null && value > max) {
    return max !== 0 ? ((value - max) / Math.abs(max)) * 100 : 100
  }
  return 0
}

// ─── SCORE BERECHNUNG (deterministisch, kein KI-Einfluss) ────────────────────
interface ScoreResult {
  score: number
  baseMax: number
  trendNote: string
  abnormalIds: Set<string>   // für Prompt-Formatierung
}

function computeHealthScore(bloodTests: any[], gender: string): ScoreResult {
  const latest = bloodTests[0]
  if (!latest?.values) return { score: 0, baseMax: 90, trendNote: '', abnormalIds: new Set() }

  const entries = Object.entries(latest.values as Record<string, any>)
  const N = entries.length
  if (N === 0) return { score: 0, baseMax: 90, trendNote: '', abnormalIds: new Set() }

  // ── 1. Datenmenge → Max. erreichbarer Score ──────────────────────────────
  const baseMax = N <= 10 ? 90 : N <= 20 ? 94 : 97

  let totalDeduction  = 0
  let positionBonus   = 0
  const abnormalIds   = new Set<string>()
  const systemCounts: Record<string, number> = {}

  // ── 2. Pro Wert Abzug berechnen ──────────────────────────────────────────
  for (const [key, val] of entries) {
    const def      = BLOOD_VALUES.find(bv => bv.id === key)
    const refRange = def?.referenceRanges?.[gender as 'male' | 'female']
      ?? def?.referenceRanges?.all
    if (!refRange) continue

    const { min, max } = refRange
    const numVal = typeof val.value === 'number' ? val.value : parseFloat(String(val.value))
    if (isNaN(numVal)) continue

    const isLow  = min != null && numVal < min
    const isHigh = max != null && numVal > max

    if (isLow || isHigh) {
      abnormalIds.add(key)

      // Abweichung in % vom Grenzwert
      const dev = getDeviationPct(numVal, min ?? undefined, max ?? undefined)

      // Gestaffelte Strafe, MAX -5 Punkte pro Wert
      const deduction = dev <= 5 ? 1 : dev <= 20 ? 3 : 5
      totalDeduction += deduction

      // Systemzähler
      for (const sys of SYSTEMS) {
        if (sys.ids.includes(key)) {
          systemCounts[sys.name] = (systemCounts[sys.name] ?? 0) + 1
        }
      }
    } else if (min != null && max != null) {
      // Wert im Bereich – Bonus wenn im mittleren Drittel (optimale Zone)
      const rangeSize = max - min
      if (rangeSize > 0) {
        const lowerOpt = min + rangeSize / 3
        const upperOpt = max - rangeSize / 3
        if (numVal >= lowerOpt && numVal <= upperOpt) {
          positionBonus += 0.25 // kleine Belohnung für optimale Lage
        }
      }
    }
  }

  // ── 3. Systemmalus: -3 Punkte wenn ≥2 Werte im selben System auffällig ──
  for (const count of Object.values(systemCounts)) {
    if (count >= 2) totalDeduction += 3
  }

  // ── 4. Gesamt-Abzug auf max. 60 deckeln ─────────────────────────────────
  totalDeduction = Math.min(totalDeduction, 60)

  // ── 5. Positionsbonus (max. +3) ──────────────────────────────────────────
  const cappedBonus = Math.min(Math.round(positionBonus), 3)

  // ── 6. Trend (wenn 2+ Blutbilder) ────────────────────────────────────────
  let trendDelta = 0
  let trendNote  = ''

  if (bloodTests.length >= 2) {
    const prev      = bloodTests[1]
    const currVals  = latest.values as Record<string, any>
    const prevVals  = (prev.values ?? {}) as Record<string, any>
    let improved = 0, worsened = 0

    for (const [key] of entries) {
      if (!prevVals[key]) continue
      const def      = BLOOD_VALUES.find(bv => bv.id === key)
      const refRange = def?.referenceRanges?.[gender as 'male' | 'female'] ?? def?.referenceRanges?.all
      if (!refRange?.min || !refRange?.max) continue

      const mid     = (refRange.min + refRange.max) / 2
      const currNum = typeof currVals[key].value === 'number' ? currVals[key].value : parseFloat(String(currVals[key].value))
      const prevNum = typeof prevVals[key].value === 'number' ? prevVals[key].value : parseFloat(String(prevVals[key].value))

      if (isNaN(currNum) || isNaN(prevNum)) continue
      const currDist = Math.abs(currNum - mid)
      const prevDist = Math.abs(prevNum - mid)

      if (currDist < prevDist - 0.01) improved++
      else if (currDist > prevDist + 0.01) worsened++
    }

    const net = improved - worsened
    if (net > 2) {
      trendDelta = -2 // Verbesserung → Bonus (reduziert Abzug)
      trendNote  = `📈 Positiver Verlauf: ${improved} Werte verbessert, ${worsened} verschlechtert.`
    } else if (net < -2) {
      trendDelta = 2  // Verschlechterung → Malus
      trendNote  = `📉 Negativer Verlauf: ${worsened} Werte verschlechtert, ${improved} verbessert.`
    } else {
      trendNote = `➡️ Stabiler Verlauf: ${improved} verbessert, ${worsened} verschlechtert.`
    }
    totalDeduction = Math.max(0, Math.min(60, totalDeduction + trendDelta))
  }

  // ── 7. Finalwert ─────────────────────────────────────────────────────────
  const raw   = baseMax - totalDeduction + cappedBonus
  const score = Math.max(0, Math.min(baseMax, Math.round(raw)))

  return { score, baseMax, trendNote, abnormalIds }
}

// ─── Score-Label ──────────────────────────────────────────────────────────────
function scoreLabel(score: number): string {
  if (score >= 95) return 'Optimal'
  if (score >= 90) return 'Gut'
  if (score >= 80) return 'OK'
  if (score >= 70) return 'Grenzwertig'
  if (score >= 60) return 'Bedenklich'
  return 'Kritisch'
}

// ─── Supplement-Intelligenz Text für Prompt ───────────────────────────────────
function buildSupplementContext(
  supplements: any[],
  bloodValues: Record<string, any>,
  abnormalIds: Set<string>,
  gender: string
): string {
  if (supplements.length === 0) return 'Keine Supplements eingetragen.'

  const suppNames = supplements.map((s: any) => s.name?.toLowerCase() ?? '')
  const lines: string[] = []

  for (const mapping of SUPPLEMENT_MAP) {
    // Prüfen ob Supplement genommen wird
    const taken = supplements.find((s: any) =>
      mapping.keywords.some(kw => s.name?.toLowerCase().includes(kw))
    )
    if (!taken) continue

    // Prüfen ob zugehöriger Blutwert auffällig ist
    const abnormalBloodId = mapping.bloodIds.find(id => abnormalIds.has(id))
    if (abnormalBloodId) {
      const def      = BLOOD_VALUES.find(bv => bv.id === abnormalBloodId)
      const refRange = def?.referenceRanges?.[gender as 'male' | 'female'] ?? def?.referenceRanges?.all
      const val      = bloodValues[abnormalBloodId]
      if (val && refRange) {
        lines.push(
          `⚠️ ${mapping.nutrient}: Nutzer nimmt bereits "${taken.name}" (${taken.dose ? `${taken.dose} ${taken.unit}` : 'Dosierung unbekannt'}), ` +
          `aber ${def?.name ?? abnormalBloodId} = ${val.value} ${val.unit} ist trotzdem auffällig. ` +
          `→ KEINE neue Einnahme empfehlen, stattdessen Dosierungsoptimierung oder Timing-Anpassung vorschlagen.`
        )
      }
    } else {
      // Supplement wird genommen und Wert ist normal → kurz bestätigen
      lines.push(`✅ ${mapping.nutrient}: "${taken.name}" wird eingenommen, zugehörige Werte unauffällig.`)
    }
  }

  const notMapped = supplements.filter((s: any) =>
    !SUPPLEMENT_MAP.some(m => m.keywords.some(kw => s.name?.toLowerCase().includes(kw)))
  )
  if (notMapped.length > 0) {
    lines.push(`Sonstige Supplements (kein direkter Blutwert-Bezug): ${notMapped.map((s: any) => s.name).join(', ')}`)
  }

  return lines.length > 0 ? lines.join('\n') : `Supplements: ${supplements.map((s: any) => s.name).join(', ')}`
}

// ─── HAUPTFUNKTION ────────────────────────────────────────────────────────────
export async function analyzeHealthData(input: AnalysisInput): Promise<AnalysisResult> {
  const { bloodTests, nutrition, supplements, training, profile } = input

  const latestBloodTest = bloodTests[0]
  const age    = profile.birthYear ? new Date().getFullYear() - profile.birthYear : null
  const gender = profile.gender ?? 'all'

  // ── Deterministischen Score berechnen (kein Gemini-Einfluss) ─────────────
  const { score: computedScore, baseMax, trendNote, abnormalIds } =
    computeHealthScore(bloodTests, gender)

  const label = scoreLabel(computedScore)

  // ── Blutwerte für Prompt formatieren ─────────────────────────────────────
  const bloodValues = latestBloodTest?.values ?? {}
  const N = Object.keys(bloodValues).length

  const formattedBloodValues = N > 0
    ? Object.entries(bloodValues).map(([key, val]: [string, any]) => {
        const def      = BLOOD_VALUES.find(bv => bv.id === key)
        const refRange = def?.referenceRanges?.[gender as 'male' | 'female']
          ?? def?.referenceRanges?.all

        const min    = refRange?.min
        const max    = refRange?.max
        const numVal = typeof val.value === 'number' ? val.value : parseFloat(String(val.value))
        const isLow  = min != null && !isNaN(numVal) && numVal < min
        const isHigh = max != null && !isNaN(numVal) && numVal > max

        const dev  = isNaN(numVal) ? 0 : getDeviationPct(numVal, min ?? undefined, max ?? undefined)
        const ref  = min != null && max != null ? ` [Ref: ${min}–${max} ${val.unit}]` : ''
        const flag = isLow
          ? ` ⬇ UNTER Referenz (${dev.toFixed(1)}% abw.)`
          : isHigh
          ? ` ⬆ ÜBER Referenz (${dev.toFixed(1)}% abw.)`
          : ' ✓'

        return `• ${def?.name ?? key}: ${val.value} ${val.unit}${ref}${flag}`
      }).join('\n')
    : 'Keine Blutwerte verfügbar'

  // ── Data-Tier Beschreibung ────────────────────────────────────────────────
  const dataTier = N <= 10
    ? `Kleines Blutbild (${N} Werte) – Analyse auf verfügbarer Datenbasis, max. Score ${baseMax}`
    : N <= 20
    ? `Mittleres Blutbild (${N} Werte) – gute Datenbasis, max. Score ${baseMax}`
    : `Großes Blutbild (${N} Werte) – umfassende Analyse möglich, max. Score ${baseMax}`

  // ── Supplement-Intelligenz ───────────────────────────────────────────────
  const supplementContext = buildSupplementContext(supplements, bloodValues, abnormalIds, gender)

  // ── Trend-Blutbilder formatieren (Vergleich wenn vorhanden) ──────────────
  const trendSection = trendNote
    ? `\nTREND (Vergleich mit vorherigem Blutbild):\n${trendNote}`
    : ''

  // ─────────────────────────────────────────────────────────────────────────
  // PROMPT: Gemini generiert NUR Text – Score ist bereits berechnet & fix
  // ─────────────────────────────────────────────────────────────────────────
  const prompt = `Du bist ein erfahrener Gesundheitsanalyst. Erstelle eine präzise, medizinisch fundierte Analyse.
Antworte AUSSCHLIESSLICH mit einem JSON-Objekt – kein Text davor/danach, keine Backticks, kein Markdown.

═══════════════════════════════════════════════════
⚠️  SCORE WURDE MATHEMATISCH BERECHNET: ${computedScore}/100 (${label})
     Du MUSST "overallScore": ${computedScore} im JSON zurückgeben.
     Ändere diesen Wert NICHT. Interpretiere ihn nur in der summary.
═══════════════════════════════════════════════════

NUTZERPROFIL:
• Geschlecht: ${profile.gender === 'male' ? 'Männlich' : profile.gender === 'female' ? 'Weiblich' : 'Divers/Unbekannt'}
• Alter: ${age ? `${age} Jahre` : 'Unbekannt'}${profile.gender === 'female' ? `\n• Zyklusphase: ${profile.cyclePhase}` : ''}

BLUTBILD (${latestBloodTest?.date ?? 'kein Datum'}) – ${dataTier}:
${formattedBloodValues}
${trendSection}

ERNÄHRUNG: ${nutrition.length} Einträge
TRAINING: ${training.slice(0, 5).map((t: any) => `${t.label ?? t.type ?? 'Training'} ${t.duration ?? ''}min`).join(', ') || 'Kein Training'}

SUPPLEMENT-KONTEXT (ZWINGEND beachten für supplementRecommendations):
${supplementContext}

══════════════════════════
DEINE ANALYSE-AUFGABEN:
══════════════════════════

summary (2–3 Sätze):
  Erkläre was Score ${computedScore} (${label}) bedeutet. Benenne die wichtigsten auffälligen Bereiche.
  Bezug auf Datenmenge nehmen (${N} Werte).

abnormalValues:
  Jeden ⬇⬆ Wert aufführen. Pro Wert: name, value (mit Einheit), assessment (2+ Sätze: medizinische Bedeutung + mögliche Symptome).
  Bei verwandten Werten (z.B. Schilddrüse): Zusammenhänge erklären.

nutritionInsights:
  Ernährungshinweise basierend auf auffälligen Werten. Falls keine Ernährungsdaten: allgemeine Hinweise zu den Mängelwerten.

supplementRecommendations (WICHTIG – Supplement-Kontext oben beachten!):
  ✅-markierte Supplements werden bereits eingenommen → NICHT neu empfehlen
  ⚠️-markierte Supplements werden eingenommen aber Wert trotzdem auffällig → Dosierung/Timing optimieren
  Für restliche Mängel: konkrete Supplement-Empfehlung mit Dosierung und Einnahmezeit

trainingInsights:
  Trainings-Empfehlungen basierend auf Blutbild (z.B. bei Eisenmangel: Intensität reduzieren)

advice (mindestens 4 konkrete, umsetzbare Punkte):
  Priorisierte Handlungsempfehlungen. Erste Priorität: auffällige Werte, dann Prävention.

Antworte NUR mit diesem JSON:
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

    // ✅ Score IMMER auf den berechneten Wert setzen (Gemini kann ihn nicht überschreiben)
    parsed.overallScore = computedScore

    // Sicherheitscheck für Arrays
    if (!Array.isArray(parsed.abnormalValues)) parsed.abnormalValues = []
    if (!Array.isArray(parsed.advice))         parsed.advice         = []

    return parsed
  } catch {
    throw new Error('JSON konnte nicht geparst werden')
  }
}
