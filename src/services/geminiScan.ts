// src/services/geminiScan.ts
import { getFunctions, httpsCallable } from 'firebase/functions'
import { app } from '../config/firebase'   // firebase app export – siehe Hinweis unten

const functions = getFunctions(app, 'europe-west1')  // Frankfurt – nächste Region zu DE

// Alle bekannten Werte mit ID → Deutscher Name
const KNOWN_VALUES = `
hemoglobin=Hämoglobin,Hb
hematocrit=Hämatokrit,Hkt
erythrocytes=Erythrozyten,RBC
leukocytes=Leukozyten,WBC
thrombocytes=Thrombozyten,PLT
mcv=MCV
mch=MCH
mchc=MCHC
rdw=RDW
neutrophils=Neutrophile,Neutrophile Granulozyten
lymphocytes=Lymphozyten
monocytes=Monozyten
eosinophils=Eosinophile
basophils=Basophile
glucose=Glukose,Blutzucker,Glucose
hba1c=HbA1c
cholesterol=Gesamtcholesterin,Cholesterin
ldl=LDL,LDL-Cholesterin
hdl=HDL,HDL-Cholesterin
triglycerides=Triglyzeride,Triglyceride
uric_acid=Harnsäure
crp=CRP,C-reaktives Protein
hs_crp=hsCRP
creatinine=Kreatinin
gfr=GFR,eGFR
urea=Harnstoff
sodium=Natrium,Na
potassium=Kalium,K
calcium=Kalzium,Ca
magnesium=Magnesium,Mg
phosphate=Phosphat
chloride=Chlorid,Cl
got=GOT,AST,ASAT
gpt=GPT,ALT,ALAT
ggt=GGT,Gamma-GT
ap=Alkalische Phosphatase,AP
bilirubin_total=Bilirubin gesamt
bilirubin_direct=Bilirubin direkt
albumin=Albumin
total_protein=Gesamtprotein
tsh=TSH
ft3=fT3,freies T3
ft4=fT4,freies T4
vitamin_d=Vitamin D,25-OH-Vitamin D
vitamin_b12=Vitamin B12,B12
folate=Folsäure,Folat
ferritin=Ferritin
iron=Eisen,Serumeisen
transferrin=Transferrin
tibc=TIBC
zinc=Zink
selenium=Selen
homocysteine=Homocystein
cortisol=Kortisol
tpo_ak=TPO-AK,Anti-TPO
prolactin=Prolaktin
estradiol=Estradiol,E2
progesterone=Progesteron
lh=LH
fsh=FSH
total_testosterone_male=Testosteron
free_testosterone_male=Freies Testosteron
psa=PSA
inr=INR,Quick
ptt=PTT,aPTT
fibrinogen=Fibrinogen
dimer=D-Dimer
ldh=LDH
amylase=Amylase
lipase=Lipase
`

export interface ScanResult {
  extractedValues: Record<string, { value: string; unit: string }>
  detectedCount: number
  confidence: 'high' | 'medium' | 'low'
}

export async function scanBloodDocument(
  base64Image: string,
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp' = 'image/jpeg'
): Promise<ScanResult> {
  const prompt = `Du bist ein Laborbefund-Analysator. Auf dem Bild ist ein medizinischer Laborbefund.

Extrahiere ALLE sichtbaren Blutwerte und gib sie als JSON zurück.

Ordne jeden gefundenen Wert der passenden ID aus dieser Liste zu:
${KNOWN_VALUES}

Regeln:
- Nutze NUR IDs aus der obigen Liste
- Behalte die originale Einheit aus dem Dokument (z.B. "mg/dl", "mmol/l", "g/dl", "U/l")
- Kommazahlen mit Komma (z.B. "13,5") → Punkt-Notation ("13.5")
- Ignoriere Referenzbereiche, Flags (H/L) und Kommentare
- Antworte NUR mit dem JSON-Objekt

Format:
{
  "values": {
    "hemoglobin": { "value": "14.2", "unit": "g/dl" }
  },
  "confidence": "high"
}`

  const callScan = httpsCallable(functions, 'scanBloodDocument')
  const result = await callScan({ imageBase64: base64Image, mimeType, prompt })

  // Gemini-Antwort aus dem Cloud-Function-Response parsen
  const data = result.data as any
  const text = data.candidates?.[0]?.content?.parts
    ?.filter((p: any) => p.text)
    ?.map((p: any) => p.text)
    ?.join('') ?? ''

  if (!text) throw new Error('Keine Antwort von Gemini erhalten')

  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Kein JSON in der Gemini-Antwort')

  const parsed = JSON.parse(jsonMatch[0])
  const extractedValues = parsed.values ?? {}

  return {
    extractedValues,
    detectedCount: Object.keys(extractedValues).length,
    confidence: parsed.confidence ?? 'medium',
  }
}
