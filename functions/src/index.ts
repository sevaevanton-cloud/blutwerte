// functions/src/index.ts
import { defineSecret } from 'firebase-functions/params'
import { HttpsError, onCall } from 'firebase-functions/v2/https'

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY')

async function callGemini(apiKey: string, body: object): Promise<any> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  )

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new HttpsError('internal', `Gemini Fehler ${response.status}: ${JSON.stringify(err)}`)
  }

  return response.json()
}

export const scanBloodDocument = onCall(
  { secrets: [GEMINI_API_KEY], timeoutSeconds: 120, region: 'europe-west1' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Login erforderlich')
    }

    const { imageBase64, mimeType, prompt } = request.data

    if (!imageBase64 || !mimeType || !prompt) {
      throw new HttpsError('invalid-argument', 'imageBase64, mimeType und prompt sind erforderlich')
    }

    return callGemini(GEMINI_API_KEY.value(), {
      contents: [{
        parts: [
          { inlineData: { mimeType, data: imageBase64 } },
          { text: prompt },
        ],
      }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 2048,
        responseMimeType: 'application/json',
      },
    })
  }
)

export const analyzeHealthData = onCall(
  { secrets: [GEMINI_API_KEY], timeoutSeconds: 120, region: 'europe-west1' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Login erforderlich')
    }

    const { prompt } = request.data

    if (!prompt) {
      throw new HttpsError('invalid-argument', 'prompt ist erforderlich')
    }

    return callGemini(GEMINI_API_KEY.value(), {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json',
      },
    })
  }
)