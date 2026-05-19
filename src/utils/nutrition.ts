// src/utils/nutrition.ts

export type ActivityLevel =
  | 'sedentary'
  | 'light'
  | 'moderate'
  | 'active'
  | 'very_active'

export const ACTIVITY_LEVELS: { id: ActivityLevel; label: string; desc: string; multiplier: number }[] = [
  { id: 'sedentary',   label: '🪑 Sitzend',       desc: 'Kaum Bewegung, Schreibtischjob',     multiplier: 1.2   },
  { id: 'light',       label: '🚶 Leicht aktiv',  desc: '1–3x Sport pro Woche',               multiplier: 1.375 },
  { id: 'moderate',    label: '🏃 Mäßig aktiv',   desc: '3–5x Sport pro Woche',               multiplier: 1.55  },
  { id: 'active',      label: '💪 Sehr aktiv',    desc: '6–7x Sport pro Woche',               multiplier: 1.725 },
  { id: 'very_active', label: '🔥 Extrem aktiv',  desc: '2x täglich oder körperliche Arbeit', multiplier: 1.9   },
]

export function calculateTDEE(params: {
  gender: 'male' | 'female' | 'diverse' | null
  birthYear: number | null
  height: number | null
  weight: number | null
  activityLevel: ActivityLevel | null
}): number | null {
  const { gender, birthYear, height, weight, activityLevel } = params
  if (!gender || !birthYear || !height || !weight || !activityLevel) return null
  const age = new Date().getFullYear() - birthYear
  if (age < 10 || age > 120) return null

  let bmr: number
  if (gender === 'male') {
    bmr = 10 * weight + 6.25 * height - 5 * age + 5
  } else if (gender === 'female') {
    bmr = 10 * weight + 6.25 * height - 5 * age - 161
  } else {
    bmr = ((10 * weight + 6.25 * height - 5 * age + 5) + (10 * weight + 6.25 * height - 5 * age - 161)) / 2
  }

  const multiplier = ACTIVITY_LEVELS.find(a => a.id === activityLevel)?.multiplier ?? 1.55
  return Math.round(bmr * multiplier)
}

export function calculateMacros(calories: number) {
  return {
    protein: Math.round((calories * 0.30) / 4),
    carbs:   Math.round((calories * 0.40) / 4),
    fat:     Math.round((calories * 0.30) / 9),
    fiber:   Math.round(calories * 14 / 1000),  // DGE: 14g pro 1000 kcal
  }
}