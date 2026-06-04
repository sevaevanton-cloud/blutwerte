// src/app/index.tsx
import { Redirect } from 'expo-router'
import { useAuth } from '../context/AuthContext'
import { useConsent } from '../context/ConsentContext'
import { useProfile } from '../context/ProfileContext'

export default function Index() {
  const { user, isAuthReady }                   = useAuth()
  const { consentGiven, isLoading: consentLoad } = useConsent()
  const { profile, isLoading: profileLoad }      = useProfile()

  // Warten bis alle Contexts geladen sind
  if (!isAuthReady || consentLoad || profileLoad) return null

  // 1. Keine Einwilligung → Datenschutz-Screen
  if (!consentGiven) return <Redirect href="/consent" />

  // 2. Nicht eingeloggt → Login / Registrieren
  if (!user) return <Redirect href="/auth" />

  // 3. Eingeloggt, aber Profil unvollständig → Onboarding
  if (!profile.isProfileComplete) return <Redirect href="/onboarding" />

  // 4. Alles vollständig → App
  return <Redirect href="/(tabs)/home" />
}
