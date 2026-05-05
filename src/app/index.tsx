import { Redirect } from 'expo-router'
import { useProfile } from '../context/ProfileContext'

export default function Index() {
  const { profile, isLoading } = useProfile()

  if (isLoading) return null

  if (!profile.isProfileComplete) {
    return <Redirect href="/onboarding" />
  }

  return <Redirect href="/(tabs)/home" />
}