// src/services/geminiAnalysis.ts
import { getFunctions, httpsCallable } from 'firebase/functions'
import { app } from '../config/firebase'

const functions = getFunctions(app, 'europe-west1')

export interface AnalysisInput {
  bloodTests: any[]
  nutrition: any[]
  supplements: any[]
  training: any[]
  profile: {
    name: string
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

  const prompt = `Du bist ein erfahrener Gesundheitsanalyst. Analysiere die folgenden Gesundheitsdaten und antworte AUSSCHLIESSLICH mit einem JSON-Objekt. Kein Text davor oder danach, keine Erklärungen, keine Markdown-Formatierung, keine Backticks.

NUTZERPROFIL:
- Geschlecht: ${profile.gender === 'male' ? 'Männlich' : profile.gender === 'female' ? 'Weiblich' : 'Divers'}
- Alter: ${age ? `${age} Jahre` : 'Unbekannt'}
${profile.gender === 'female' ? `- Zyklusphase: ${profile.cyclePhase}` : ''}

BLUTWERTE (${latestBloodTest?.date ?? 'kein Datum'}):
${latestBloodTest ? Object.entries(latestBloodTest.values || {}).map(([key, val]: [string, any]) => `${key}: ${val.value} ${val.unit}`).join(', ') : 'Keine Blutwerte'}

ERNÄHRUNG: ${nutrition.length} Einträge
SUPPLEMENTS: ${supplements.map((s: any) => s.name).join(', ') || 'Keine'}
TRAINING: ${training.slice(0, 5).map((t: any) => `${t.label} ${t.duration}min`).join(', ') || 'Kein Training'}

Antworte NUR mit diesem JSON (keine anderen Zeichen):
{"summary":"...","abnormalValues":[{"name":"...","value":"...","assessment":"..."}],"nutritionInsights":"...","supplementRecommendations":"...","trainingInsights":"...","overallScore":75,"advice":["...","...","..."]}`

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
