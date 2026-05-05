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

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 8192,
          responseMimeType: 'application/json',
        },
      }),
    }
  )

  if (!response.ok) {
    const errorBody = await response.json()
    throw new Error(`Gemini API Fehler: ${response.status} - ${JSON.stringify(errorBody)}`)
  }

  const data = await response.json()
  console.log('Gemini raw response:', JSON.stringify(data).substring(0, 500))

  const parts = data.candidates?.[0]?.content?.parts ?? []
  console.log('Parts count:', parts.length)
  parts.forEach((p: any, i: number) => {
    console.log(`Part ${i} keys:`, Object.keys(p), '| text preview:', p.text?.substring(0, 100))
  })

  const fullText = parts
    .filter((p: any) => p.text)
    .map((p: any) => p.text)
    .join('')

  console.log('Full text preview:', fullText.substring(0, 300))

  if (!fullText) throw new Error('Keine Antwort von Gemini erhalten')

  const jsonMatch = fullText.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Kein gültiges JSON in der Antwort gefunden')

  try {
    return JSON.parse(jsonMatch[0]) as AnalysisResult
  } catch (e) {
    console.log('Parse error:', e, '| JSON attempt:', jsonMatch[0].substring(0, 200))
    throw new Error('JSON konnte nicht geparst werden')
  }
}