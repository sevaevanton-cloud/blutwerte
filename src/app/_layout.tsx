import { Stack } from 'expo-router'
import React from 'react'
import { ActivityIndicator, View } from 'react-native'
import { AuthProvider, useAuth } from '../context/AuthContext'
import { ProfileProvider } from '../context/ProfileContext'

function AppNavigator() {
  const { isAuthReady } = useAuth()

  if (!isAuthReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#84a7ff" />
      </View>
    )
  }

  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  )
}

const RootLayout = () => {
  return (
    <AuthProvider>
      <ProfileProvider>
        <AppNavigator />
      </ProfileProvider>
    </AuthProvider>
  )
}

export default RootLayout