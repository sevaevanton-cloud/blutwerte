import AsyncStorage from '@react-native-async-storage/async-storage'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { db } from '../config/firebase'
import { calculateTDEE } from '../utils/nutrition'
import { useAuth } from './AuthContext'

export type Gender = 'male' | 'female' | 'diverse'
export type CyclePhase = 'menstruation' | 'follicular' | 'ovulation' | 'luteal' | 'unknown'
export type ActivityLevel = 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extra_active'
export type FitnessGoal = 'lose_fat' | 'build_muscle' | 'improve_health' | 'boost_performance' | 'maintain'

export interface UserProfile {
  name: string
  gender: Gender | null
  birthYear: number | null
  cyclePhase: CyclePhase
  cycleDay: number | null
  height: number | null
  weight: number | null
  activityLevel: ActivityLevel | null
  calorieGoalOverride: number | null
  isProfileComplete: boolean
  bodyStatus: number | null   // KFA-Prozent (z.B. 15 für 15%)
  bodyGoal: number | null     // Legacy – nicht mehr verwendet
  fitnessGoal: FitnessGoal | null  // Primärziel des Nutzers
}

interface ProfileContextType {
  profile: UserProfile
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>
  isLoading: boolean
  calorieGoal: number
}

const DEFAULT_PROFILE: UserProfile = {
  name: '',
  gender: null,
  birthYear: null,
  cyclePhase: 'unknown',
  cycleDay: null,
  height: null,
  weight: null,
  activityLevel: null,
  calorieGoalOverride: null,
  isProfileComplete: false,
  bodyStatus: null,
  bodyGoal: null,
  fitnessGoal: null,
}

const STORAGE_KEY = 'userProfile'
const DEFAULT_CALORIE_GOAL = 2500

const ProfileContext = createContext<ProfileContextType>({
  profile: DEFAULT_PROFILE,
  updateProfile: async () => {},
  isLoading: true,
  calorieGoal: DEFAULT_CALORIE_GOAL,
})

export const ProfileProvider = ({ children }: { children: React.ReactNode }) => {
  const { uid, isAuthReady } = useAuth()
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!isAuthReady) return

    if (!uid) {
      setProfile(DEFAULT_PROFILE)
      setIsLoading(false)
      return
    }

    const loadProfile = async () => {
      try {
        const cached = await AsyncStorage.getItem(STORAGE_KEY)
        if (cached) setProfile(JSON.parse(cached))

        if (uid) {
          const snap = await getDoc(doc(db, 'users', uid, 'profile', 'data'))
          if (snap.exists()) {
            const firestoreProfile = snap.data() as UserProfile
            setProfile(firestoreProfile)
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(firestoreProfile))
          }
        }
      } catch (e) {
        console.error('Profil laden fehlgeschlagen', e)
      } finally {
        setIsLoading(false)
      }
    }

    loadProfile()
  }, [uid, isAuthReady])

  const updateProfile = async (updates: Partial<UserProfile>) => {
    const updated: UserProfile = { ...profile, ...updates }
    updated.isProfileComplete = !!(updated.name && updated.gender && updated.birthYear)
    setProfile(updated)
    await Promise.all([
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)),
      uid
        ? setDoc(doc(db, 'users', uid, 'profile', 'data'), updated)
        : Promise.resolve(),
    ])
  }

  const calorieGoal = useMemo(() => {
    if (profile.calorieGoalOverride) return profile.calorieGoalOverride
    const tdee = calculateTDEE({
      gender: profile.gender,
      birthYear: profile.birthYear,
      height: profile.height,
      weight: profile.weight,
      activityLevel: profile.activityLevel,
    })
    return tdee ?? DEFAULT_CALORIE_GOAL
  }, [profile])

  return (
    <ProfileContext.Provider value={{ profile, updateProfile, isLoading, calorieGoal }}>
      {children}
    </ProfileContext.Provider>
  )
}

export const useProfile = () => useContext(ProfileContext)
