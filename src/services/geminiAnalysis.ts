// src/services/geminiAnalysis.ts

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

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY

export async function analyzeHealthData(input: AnalysisInput): Promise<AnalysisResult> {
  const { bloodTests, nutrition, supplements, training, profile } = input

  const latestBloodTest = bloodTests[0]
  const age = profile.birthYear ? new Date().getFullYear() - profile.birthYear : null

  const prompt = `
Du bist ein erfahrener Gesundheitsanalyst. Analysiere die folgenden Gesundheitsdaten eines Nutzers und gib eine detaillierte, verständliche Analyse auf Deutsch.

## Nutzerprofil
- Geschlecht: ${profile.gender === 'male' ? 'Männlich' : profile.gender === 'female' ? 'Weiblich' : 'Divers'}
- Alter: ${age ? `${age} Jahre` : 'Unbekannt'}
${profile.gender === 'female' ? `- Zyklusphase: ${profile.cyclePhase}` : ''}

## Letzte Blutwerte (${latestBloodTest?.date ?? 'kein Datum'})
${latestBloodTest ? Object.entries(latestBloodTest.values || {}).map(([key, val]: [string, any]) => `- ${key}: ${val.value} ${val.unit}`).join('\n') : 'Keine Blutwerte vorhanden'}

## Ernährung (letzte 7 Tage, ${nutrition.length} Einträge)
${nutrition.slice(0, 10).map((n: any) => `- ${n.meal}: ${n.food} (${n.calories ?? '?'} kcal, P: ${n.protein ?? '?'}g, K: ${n.carbs ?? '?'}g, F: ${n.fat ?? '?'}g)`).join('\n') || 'Keine Ernährungsdaten'}

## Supplements (aktuell)
${supplements.slice(0, 10).map((s: any) => `- ${s.name}: ${s.dose ?? '?'} ${s.unit} (${s.time})`).join('\n') || 'Keine Supplement-Daten'}

## Training (letzte 7 Tage)
${training.slice(0, 7).map((t: any) => `- ${t.label}: ${t.duration} Min., ${t.intensity}`).join('\n') || 'Keine Trainingsdaten'}

## Aufgabe
Antworte NUR mit einem JSON-Objekt in diesem Format (kein Text davor oder danach, keine Markdown-Backticks):
{
  "summary": "Kurze Gesamtzusammenfassung in 2-3 Sätzen",
  "abnormalValues": [
    {
      "name": "Wertname",
      "value": "Wert mit Einheit",
      "assessment": "Kurze Erklärung was der Wert bedeutet und mögliche Ursachen"
    }
  ],
  "nutritionInsights": "Analyse der Ernährung in 2-3 Sätzen",
  "supplementRecommendations": "Supplement-Empfehlungen basierend auf den Blutwerten in 2-3 Sätzen",
  "trainingInsights": "Analyse des Trainings in 1-2 Sätzen",
  "overallScore": 75,
  "advice": [
    "Konkreter Ratschlag 1",
    "Konkreter Ratschlag 2",
    "Konkreter Ratschlag 3"
  ]
}

overallScore ist eine Zahl von 0-100 die den allgemeinen Gesundheitszustand widerspiegelt.
Sei ehrlich aber nicht alarmistisch. Weise darauf hin dass dies keine medizinische Diagnose ist.
`

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2048,
        },
      }),
    }
  )

  if (!response.ok) {
    throw new Error(`Gemini API Fehler: ${response.status}`)
  }

  const data = await response.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text

  if (!text) throw new Error('Keine Antwort von Gemini erhalten')

  const clean = text.replace(/```json|```/g, '').trim()
  return JSON.parse(clean) as AnalysisResult
}
