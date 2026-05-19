// src/app/(tabs)/_layout.tsx
import { Ionicons } from '@expo/vector-icons'
import { Tabs } from 'expo-router'
import React from 'react'
import { Platform } from 'react-native'
import { BRAND, TAB_INACTIVE } from '../../constants/theme'


const TabsLayout = () => {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: BRAND,
        tabBarInactiveTintColor: TAB_INACTIVE,
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#f0f0f0',
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 84 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
          paddingTop: 8,
          elevation: 0,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen name="home" options={{
        title: 'Home',
        tabBarIcon: ({ color, size, focused }) =>
          <Ionicons name={focused ? 'home' : 'home-outline'} color={color} size={size} />,
      }} />
      <Tabs.Screen name="add" options={{
        title: 'Hinzufügen',
        tabBarIcon: ({ color, focused }) =>
          <Ionicons name={focused ? 'add-circle' : 'add-circle-outline'} color={color} size={28} />,
      }} />
      <Tabs.Screen name="history" options={{
        title: 'Verlauf',
        tabBarIcon: ({ color, size, focused }) =>
          <Ionicons name={focused ? 'stats-chart' : 'stats-chart-outline'} color={color} size={size} />,
      }} />
      <Tabs.Screen name="analysis" options={{
        title: 'KI-Analyse',
        tabBarIcon: ({ color, size, focused }) =>
          <Ionicons name={focused ? 'sparkles' : 'sparkles-outline'} color={color} size={size} />,
      }} />
      <Tabs.Screen name="profile" options={{
        title: 'Profil',
        tabBarIcon: ({ color, size, focused }) =>
          <Ionicons name={focused ? 'person' : 'person-outline'} color={color} size={size} />,
      }} />
    </Tabs>
  )
}

export default TabsLayout
