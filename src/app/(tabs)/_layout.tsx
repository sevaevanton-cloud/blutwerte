import { Ionicons } from '@expo/vector-icons'
import { Tabs } from 'expo-router'
import React from 'react'

const TabsLayout = () => {
  return (
    <Tabs>
      <Tabs.Screen name="home" options={{
        title: 'Home',
        tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} />,
      }} />
      <Tabs.Screen name="add" options={{
        title: 'Hinzufügen',
        tabBarIcon: ({ color, size }) => <Ionicons name="add-circle" color={color} size={size} />,
      }} />
      <Tabs.Screen name="history" options={{
        title: 'Verlauf',
        tabBarIcon: ({ color, size }) => <Ionicons name="stats-chart" color={color} size={size} />,
      }} />
      <Tabs.Screen name="analysis" options={{
        title: 'KI-Analyse',
        tabBarIcon: ({ color, size }) => <Ionicons name="sparkles" color={color} size={size} />,
      }} />
      <Tabs.Screen name="profile" options={{
        title: 'Profil',
        tabBarIcon: ({ color, size }) => <Ionicons name="person" color={color} size={size} />,
      }} />
    </Tabs>
  )
}

export default TabsLayout