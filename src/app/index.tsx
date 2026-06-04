import { Redirect } from 'expo-router'
import { useConsent } from '../context/ConsentContext'
import { useProfile } from '../context/ProfileContext'

export default function Index() {
  const { consentGiven, isLoading: consentLoading } = useConsent()
  const { profile, isLoading: profileLoading } = useProfile()

  // Warte bis beide Contexts geladen sind
  if (consentLoading || profileLoading) return null

  // Keine Einwilligung → immer zuerst zum Consent-Screen (DSGVO)
  if (!consentGiven) {
    return <Redirect href="/consent" />
  }

  // Einwilligung vorhanden, aber Profil unvollständig → Onboarding
  if (!profile.isProfileComplete) {
    return <Redirect href="/onboarding" />
  }

  return <Redirect href="/(tabs)/home" />
}
