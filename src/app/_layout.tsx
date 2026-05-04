import { Stack } from 'expo-router'
import React from 'react'
import { ProfileProvider } from '../context/ProfileContext'

const RootLayout = () => {
  return (
    <ProfileProvider>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </ProfileProvider>
  )
}

export default RootLayout