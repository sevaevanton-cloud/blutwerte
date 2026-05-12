// src/context/ConsentContext.tsx
import AsyncStorage from '@react-native-async-storage/async-storage'
import React, { createContext, useContext, useEffect, useState } from 'react'

const CONSENT_KEY = 'datenschutz_einwilligung_v1'

interface ConsentContextType {
  consentGiven: boolean
  isLoading: boolean
  giveConsent: () => Promise<void>
  revokeConsent: () => Promise<void>
}

const ConsentContext = createContext<ConsentContextType>({
  consentGiven: false,
  isLoading: true,
  giveConsent: async () => {},
  revokeConsent: async () => {},
})

export const ConsentProvider = ({ children }: { children: React.ReactNode }) => {
  const [consentGiven, setConsentGiven] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const stored = await AsyncStorage.getItem(CONSENT_KEY)
        setConsentGiven(stored === 'true')
      } catch (e) {
        console.error('Consent laden fehlgeschlagen', e)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  const giveConsent = async () => {
    await AsyncStorage.setItem(CONSENT_KEY, 'true')
    setConsentGiven(true)
  }

  const revokeConsent = async () => {
    await AsyncStorage.removeItem(CONSENT_KEY)
    setConsentGiven(false)
  }

  return (
    <ConsentContext.Provider value={{ consentGiven, isLoading, giveConsent, revokeConsent }}>
      {children}
    </ConsentContext.Provider>
  )
}

export const useConsent = () => useContext(ConsentContext)
