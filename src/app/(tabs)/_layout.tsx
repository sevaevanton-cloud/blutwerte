import { Ionicons } from '@expo/vector-icons'
import { Tabs } from 'expo-router'
import React from 'react'
import { StyleSheet } from 'react-native'

const TabsLayout = () => {
  return (
    <Tabs>
        <Tabs.Screen name="home" options={{
            tabBarIcon: ({ color, size }) => (
                <Ionicons name="home" color={color} size={size} />
            ),
        }}></Tabs.Screen>
        <Tabs.Screen name="add" options={{
            tabBarIcon: ({ color, size }) => (
                <Ionicons name="add" color={color} size={size} />
            ),
        }}></Tabs.Screen>
        <Tabs.Screen name="analysis" options={{
            title: 'KI-Analyse',
            tabBarIcon: ({ color, size }) => (
                <Ionicons name="sparkles" color={color} size={size} />
            ),
        }}></Tabs.Screen>
        <Tabs.Screen name="profile" options={{
            tabBarIcon: ({ color, size }) => (
                <Ionicons name="person" color={color} size={size} />
            ),
        }}></Tabs.Screen>
    </Tabs>
  )
}

export default TabsLayout

const styles = StyleSheet.create({})