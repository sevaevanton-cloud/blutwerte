// src/app/index.tsx
import { Redirect } from 'expo-router'
import { useConsent } from '../context/ConsentContext'
import { useProfile } from '../context/ProfileContext'

export default function Index() {
  const { consentGiven, isLoading: consentLoading } = useConsent()
  const { profile, isLoading: profileLoading } = useProfile()

  if (consentLoading || profileLoading) return null

  // Erst Consent prüfen
  if (!consentGiven) {
    return <Redirect href="/consent" />
  }

  // Dann Profil prüfen
  if (!profile.isProfileComplete) {
    return <Redirect href="/onboarding" />
  }

  return <Redirect href="/(tabs)/home" />
}
