// src/components/ui/ModalHeader.tsx
import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

interface Props {
  title: string
  subtitle?: string
  onClose: () => void
}

export default function ModalHeader({ title, subtitle, onClose }: Props) {
  return (
    <View style={styles.container}>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
        <Text style={styles.closeBtnText}>✕</Text>
      </TouchableOpacity>
    </View>
  )
}

export const modalSharedStyles = StyleSheet.create({
  modal: { flex: 1, backgroundColor: '#f7f8fc' },
})

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title:    { fontSize: 20, fontWeight: '800', color: '#1a1a2e' },
  subtitle: { fontSize: 13, color: '#9ca3af', marginTop: 2 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { fontSize: 14, color: '#6b7280', fontWeight: '700' },
})
