// src/components/add/AddSupplement.tsx
import React, { useState } from 'react'
import {
  Alert, ScrollView, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from 'react-native'

const BRAND = '#84a7ff'

const COMMON_SUPPLEMENTS = [
  'Vitamin D3', 'Vitamin K2', 'Omega-3', 'Magnesium',
  'Zink', 'Vitamin B12', 'Folsäure', 'Eisen',
  'Ashwagandha', 'Kreatin', 'Protein', 'Vitamin C',
]

export default function AddSupplement({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('')
  const [dose, setDose] = useState('')
  const [unit, setUnit] = useState('mg')
  const [time, setTime] = useState('Morgens')

  const UNITS = ['mg', 'µg', 'g', 'IE', 'ml', 'Kapsel(n)', 'Tablette(n)']
  const TIMES = ['Morgens', 'Mittags', 'Abends', 'Vor dem Training', 'Nach dem Training']

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Bitte wähle oder gib ein Supplement ein.')
      return
    }
    Alert.alert('✅ Gespeichert!', `${name} ${dose}${unit} wurde eingetragen.`)
    onClose()
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Schnellauswahl */}
        <Text style={styles.label}>Häufige Supplements</Text>
        <View style={styles.chipGrid}>
          {COMMON_SUPPLEMENTS.map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.chip, name === s && styles.chipActive]}
              onPress={() => setName(s)}
            >
              <Text style={[styles.chipText, name === s && styles.chipTextActive]}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Eigene Eingabe */}
        <Text style={styles.label}>Oder manuell eingeben</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Name des Supplements"
          placeholderTextColor="#9ca3af"
        />

        {/* Dosis */}
        <Text style={styles.label}>Dosis</Text>
        <View style={styles.doseRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={dose}
            onChangeText={setDose}
            placeholder="z.B. 2000"
            placeholderTextColor="#9ca3af"
            keyboardType="decimal-pad"
          />
          <View style={styles.unitPicker}>
            {UNITS.map((u) => (
              <TouchableOpacity
                key={u}
                style={[styles.unitChip, unit === u && styles.unitChipActive]}
                onPress={() => setUnit(u)}
              >
                <Text style={[styles.unitChipText, unit === u && styles.unitChipTextActive]}>{u}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Zeitpunkt */}
        <Text style={styles.label}>Zeitpunkt</Text>
        <View style={styles.chipGrid}>
          {TIMES.map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.chip, time === t && styles.chipActive]}
              onPress={() => setTime(t)}
            >
              <Text style={[styles.chipText, time === t && styles.chipTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>💾 Supplement speichern</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 100 },
  label: { fontSize: 13, fontWeight: '600', color: '#6b7280', marginBottom: 10, marginTop: 16, textTransform: 'uppercase', letterSpacing: 0.8 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb' },
  chipActive: { backgroundColor: BRAND, borderColor: BRAND },
  chipText: { fontSize: 13, color: '#6b7280', fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  input: { backgroundColor: '#fff', borderRadius: 12, padding: 14, fontSize: 15, color: '#1a1a2e', borderWidth: 1, borderColor: '#e5e7eb' },
  doseRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  unitPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, flex: 1 },
  unitChip: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb' },
  unitChipActive: { backgroundColor: BRAND, borderColor: BRAND },
  unitChipText: { fontSize: 12, color: '#6b7280', fontWeight: '600' },
  unitChipTextActive: { color: '#fff' },
  footer: { padding: 16, paddingBottom: 32, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  saveBtn: { backgroundColor: BRAND, padding: 16, borderRadius: 14, alignItems: 'center', shadowColor: BRAND, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})
