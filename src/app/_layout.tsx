import { Stack } from 'expo-router'
import React from 'react'

const RootLayout = () => {
  return (
    <Stack>
        <Stack.Screen name="Index"></Stack.Screen>
        <Stack.Screen name="Profile"></Stack.Screen>
    </Stack>
  )
}

export default RootLayout

