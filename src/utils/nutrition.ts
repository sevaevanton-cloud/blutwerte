import { ActivityLevel, Gender } from '../context/ProfileContext';

export const ACTIVITY_LEVELS: { id: ActivityLevel; label: string; desc: string; multiplier: number }[] = [
  { id: 'sedentary',         label: '🪑 Sitzend',           desc: 'Kaum Bewegung, Bürojob',              multiplier: 1.2   },
  { id: 'lightly_active',    label: '🚶 Leicht aktiv',       desc: '1–3x Sport pro Woche',                multiplier: 1.375 },
  { id: 'moderately_active', label: '🏃 Mäßig aktiv',        desc: '3–5x Sport pro Woche',                multiplier: 1.55  },
  { id: 'very_active',       label: '💪 Sehr aktiv',         desc: '6–7x intensiver Sport pro Woche',     multiplier: 1.725 },
  { id: 'extra_active',      label: '🔥 Extrem aktiv',       desc: 'Körperliche Arbeit + täglicher Sport', multiplier: 1.9  },
]

interface TDEEInput {
  gender: Gender | null
  birthYear: number | null
  height: number | null
  weight: number | null
  activityLevel: ActivityLevel | null
}

export function calculateTDEE(input: TDEEInput): number | null {
  const { gender, birthYear, height, weight, activityLevel } = input
  if (!gender || !birthYear || !height || !weight || !activityLevel) return null

  const age = new Date().getFullYear() - birthYear
  let bmr: number

  if (gender === 'male') {
    bmr = 10 * weight + 6.25 * height - 5 * age + 5
  } else {
    bmr = 10 * weight + 6.25 * height - 5 * age - 161
  }

  const level = ACTIVITY_LEVELS.find(l => l.id === activityLevel)
  if (!level) return null

  return Math.round(bmr * level.multiplier)
}