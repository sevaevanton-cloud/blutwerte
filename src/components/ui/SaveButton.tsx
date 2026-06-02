// src/components/ui/SaveButton.tsx
import React from 'react'
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

interface Props {
  onPress: () => void
  label: string
  loading?: boolean
  disabled?: boolean
  color?: string
}

export default function SaveButton({ onPress, label, loading = false, disabled = false, color = '#84a7ff' }: Props) {
  const isDisabled = loading || disabled
  return (
    <View style={styles.footer}>
      <TouchableOpacity
        style={[
          styles.btn,
          { backgroundColor: isDisabled && !loading ? '#e5e7eb' : color },
          { shadowColor: isDisabled ? 'transparent' : color },
          isDisabled && { shadowOpacity: 0 },
        ]}
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.8}
      >
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.label}>{label}</Text>
        }
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  footer: {
    padding: 16,
    paddingBottom: 32,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  btn: {
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  label: { color: '#fff', fontSize: 16, fontWeight: '700' },
})