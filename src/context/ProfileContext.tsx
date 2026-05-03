// src/context/ProfileContext.tsx
import AsyncStorage from '@react-native-async-storage/async-storage'
import React, { createContext, useContext, useEffect, useState } from 'react'

export type Gender = 'male' | 'female' | 'diverse'
export type CyclePhase = 'menstruation' | 'follicular' | 'ovulation' | 'luteal' | 'unknown'

export interface UserProfile {
  name: string
  gender: Gender | null
  birthYear: number | null
  cyclePhase: CyclePhase
  cycleDay: number | null
  isProfileComplete: boolean
}

interface ProfileContextType {
  profile: UserProfile
  updateProfile: (updates: Partial<UserProfile>) => void
  isLoading: boolean
}

const DEFAULT_PROFILE: UserProfile = {
  name: '',
  gender: null,
  birthYear: null,
  cyclePhase: 'unknown',
  cycleDay: null,
  isProfileComplete: false,
}

const ProfileContext = createContext<ProfileContextType>({
  profile: DEFAULT_PROFILE,
  updateProfile: () => {},
  isLoading: true,
})

export const ProfileProvider = ({ children }: { children: React.ReactNode }) => {
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const stored = await AsyncStorage.getItem('userProfile')
        if (stored) setProfile(JSON.parse(stored))
      } catch (e) {
        console.error('Profil laden fehlgeschlagen', e)
      } finally {
        setIsLoading(false)
      }
    }
    loadProfile()
  }, [])

  const updateProfile = async (updates: Partial<UserProfile>) => {
    const updated = { ...profile, ...updates }
    updated.isProfileComplete = !!(updated.name && updated.gender && updated.birthYear)
    setProfile(updated)
    await AsyncStorage.setItem('userProfile', JSON.stringify(updated))
  }

  return (
    <ProfileContext.Provider value={{ profile, updateProfile, isLoading }}>
      {children}
    </ProfileContext.Provider>
  )
}

export const useProfile = () => useContext(ProfileContext)
