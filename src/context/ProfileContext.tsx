// src/context/ProfileContext.tsx
import AsyncStorage from '@react-native-async-storage/async-storage'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import React, { createContext, useContext, useEffect, useState } from 'react'
import { db } from '../config/firebase'
import { ActivityLevel, calculateTDEE } from '../utils/nutrition'
import { useAuth } from './AuthContext'

export type Gender = 'male' | 'female' | 'diverse'
export type CyclePhase = 'menstruation' | 'follicular' | 'ovulation' | 'luteal' | 'unknown'
export type { ActivityLevel }

export interface UserProfile {
  name: string
  gender: Gender | null
  birthYear: number | null
  cyclePhase: CyclePhase
  cycleDay: number | null
  isProfileComplete: boolean
  // Körperliche Stats
  height: number | null        // cm
  weight: number | null        // kg
  activityLevel: ActivityLevel | null
  calorieGoalOverride: number | null  // manuelles Ziel überschreibt TDEE
}

interface ProfileContextType {
  profile: UserProfile
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>
  isLoading: boolean
  calorieGoal: number           // berechnetes TDEE oder Override oder Fallback 2000
  macroGoals: { protein: number; carbs: number; fat: number; fiber: number }
}

const DEFAULT_PROFILE: UserProfile = {
  name: '',
  gender: null,
  birthYear: null,
  cyclePhase: 'unknown',
  cycleDay: null,
  isProfileComplete: false,
  height: null,
  weight: null,
  activityLevel: null,
  calorieGoalOverride: null,
}

const STORAGE_KEY = 'userProfile'

const ProfileContext = createContext<ProfileContextType>({
  profile: DEFAULT_PROFILE,
  updateProfile: async () => {},
  isLoading: true,
  calorieGoal: 2000,
  macroGoals: { protein: 150, carbs: 200, fat: 67, fiber: 28 },
})

export const ProfileProvider = ({ children }: { children: React.ReactNode }) => {
  const { uid } = useAuth()
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE)
  const [isLoading, setIsLoading] = useState(true)

  // Phase 1: AsyncStorage sofort laden
  useEffect(() => {
    const loadLocal = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY)
        if (stored) setProfile(JSON.parse(stored))
      } catch (e) {
        console.error('Profil (lokal) laden fehlgeschlagen', e)
      } finally {
        setIsLoading(false)
      }
    }
    loadLocal()
  }, [])

  // Phase 2: Firestore im Hintergrund synchronisieren
  useEffect(() => {
    if (!uid) return
    const syncFromFirestore = async () => {
      try {
        const snap = await getDoc(doc(db, 'users', uid, 'profile', 'data'))
        if (snap.exists()) {
          const firestoreProfile = snap.data() as UserProfile
          setProfile(firestoreProfile)
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(firestoreProfile))
        }
      } catch (e) {
        console.error('Profil (Firestore) laden fehlgeschlagen', e)
      }
    }
    syncFromFirestore()
  }, [uid])

  const updateProfile = async (updates: Partial<UserProfile>) => {
    const updated: UserProfile = { ...profile, ...updates }
    updated.isProfileComplete = !!(updated.name && updated.gender && updated.birthYear)
    setProfile(updated)
    const tasks: Promise<any>[] = [AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated))]
    if (uid) tasks.push(setDoc(doc(db, 'users', uid, 'profile', 'data'), updated))
    await Promise.all(tasks)
  }

  // Kalorienziel: Override → TDEE → Fallback 2000
  const tdee = calculateTDEE({
    gender: profile.gender,
    birthYear: profile.birthYear,
    height: profile.height,
    weight: profile.weight,
    activityLevel: profile.activityLevel,
  })
  const calorieGoal = profile.calorieGoalOverride ?? tdee ?? 2000

  // Makros: 30% Protein / 40% Carbs / 30% Fett
  const macroGoals = {
    protein: Math.round((calorieGoal * 0.30) / 4),
    carbs:   Math.round((calorieGoal * 0.40) / 4),
    fat:     Math.round((calorieGoal * 0.30) / 9),
    fiber:   Math.round(calorieGoal * 14 / 1000),
  }

  return (
    <ProfileContext.Provider value={{ profile, updateProfile, isLoading, calorieGoal, macroGoals }}>
      {children}
    </ProfileContext.Provider>
  )
}

export const useProfile = () => useContext(ProfileContext)