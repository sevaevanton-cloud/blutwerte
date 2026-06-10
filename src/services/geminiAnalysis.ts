// src/services/geminiAnalysis.ts
import { getFunctions, httpsCallable } from 'firebase/functions'
import { app } from '../config/firebase'
import { BLOOD_VALUES } from '../constants/bloodValues'

const functions = getFunctions(app, 'europe-west1')

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

export async function analyzeHealthData(input: AnalysisInput): Promise<AnalysisResult> {
  const { bloodTests, nutrition, supplements, training, profile } = input

  const latestBloodTest = bloodTests[0]
  const age = profile.birthYear ? new Date().getFullYear() - profile.birthYear : null
  const gender = profile.gender ?? 'all'

  // Blutwerte MIT Richtgrenzen formatieren – Referenzbereiche zur Laufzeit
  // aus BLOOD_VALUES nachschlagen (wie history.tsx), NICHT aus Firestore lesen
  const formattedBloodValues = latestBloodTest
    ? Object.entries(latestBloodTest.values || {}).map(([key, val]: [string, any]) => {
        // Referenzbereich aus dem zentralen Katalog laden
        const def = BLOOD_VALUES.find(bv => bv.id === key)
        const refRange = def?.referenceRanges?.[gender as 'male' | 'female']
          ?? def?.referenceRanges?.all

        const refMin = refRange?.min
        const refMax = refRange?.max
        const numericValue = typeof val.value === 'number' ? val.value : parseFloat(val.value)

        // Abweichung selbst berechnen statt aus Firestore zu lesen
        const isLow = refMin != null && !isNaN(numericValue) && numericValue < refMin
        const isHigh = refMax != null && !isNaN(numericValue) && numericValue > refMax

        const ref = refMin != null && refMax != null
          ? ` (Richtgrenze: ${refMin}–${refMax} ${val.unit})`
          : ''
        const flag = isLow ? ' ⬇ UNTER Referenz' : isHigh ? ' ⬆ ÜBER Referenz' : ' ✓ normal'

        return `${key}: ${val.value} ${val.unit}${ref}${flag}`
      }).join('\n')
    : 'Keine Blutwerte'

  // Kein Name im Prompt – Pseudonymisierung gemäß DSGVO
  const prompt = `Du bist ein erfahrener medizinischer Gesundheitsanalyst. Analysiere die folgenden Gesundheitsdaten KRITISCH und PRÄZISE. Antworte AUSSCHLIESSLICH mit einem JSON-Objekt – kein Text davor/danach, keine Markdown-Formatierung, keine Backticks.

NUTZERPROFIL:
- Geschlecht: ${profile.gender === 'male' ? 'Männlich' : profile.gender === 'female' ? 'Weiblich' : 'Divers'}
- Alter: ${age ? `${age} Jahre` : 'Unbekannt'}
${profile.gender === 'female' ? `- Zyklusphase: ${profile.cyclePhase}` : ''}

BLUTWERTE (${latestBloodTest?.date ?? 'kein Datum'}):
${formattedBloodValues}

ERNÄHRUNG: ${nutrition.length} Einträge
SUPPLEMENTS: ${supplements.map((s: any) => s.name).join(', ') || 'Keine'}
TRAINING: ${training.slice(0, 5).map((t: any) => `${t.label} ${t.duration}min`).join(', ') || 'Kein Training'}

SCORING-REGELN (strikt einhalten):
- Starte bei 100 Punkten
- Jeder Wert UNTER oder ÜBER der Richtgrenze: -8 bis -15 Punkte je nach Schwere der Abweichung
- Mehrere Werte im selben Hormonsystem auffällig (z.B. Testosteron + SHBG + FAI): zusätzlich -10 Punkte (systemisches Problem)
- Schilddrüsenwerte auffällig: -10 bis -20 Punkte
- Alle Werte normal: Score 85-100
- Score MUSS die tatsächliche Schwere widerspiegeln – niemals schönreden

ANALYSE-REGELN:
- Jeden auffälligen Wert (⬇ oder ⬆) ZWINGEND in abnormalValues aufnehmen
- Bei Hormonstörungen: Zusammenhänge zwischen den Werten erklären (z.B. hohe SHBG → niedriges freies Testosteron)
- assessment pro Wert: min. 2 Sätze – medizinische Bedeutung UND mögliche Symptome nennen
- supplementRecommendations: konkrete Supplements mit Dosierung bei Mängeln empfehlen
- advice: mindestens 4 konkrete, umsetzbare Handlungsempfehlungen

Antworte NUR mit diesem JSON (keine anderen Zeichen):
{"summary":"...","abnormalValues":[{"name":"...","value":"...","assessment":"..."}],"nutritionInsights":"...","supplementRecommendations":"...","trainingInsights":"...","overallScore":0,"advice":["...","...","...","..."]}`

  const callAnalyze = httpsCallable(functions, 'analyzeHealthData')
  const result = await callAnalyze({ prompt })

  const data = result.data as any
  const parts = data.candidates?.[0]?.content?.parts ?? []
  const fullText = parts.filter((p: any) => p.text).map((p: any) => p.text).join('')

  if (!fullText) throw new Error('Keine Antwort von Gemini erhalten')

  const jsonMatch = fullText.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Kein gültiges JSON in der Antwort gefunden')

  try {
    return JSON.parse(jsonMatch[0]) as AnalysisResult
  } catch {
    throw new Error('JSON konnte nicht geparst werden')
  }
}
