// src/components/add/AddTraining.tsx
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import React, { useState } from 'react'
import {
  ActivityIndicator, Alert, ScrollView, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from 'react-native'
import { db } from '../../config/firebase'

const TRAINING_TYPES = [
  { id: 'strength', label: '🏋️ Krafttraining' },
  { id: 'cardio', label: '🏃 Cardio' },
  { id: 'yoga', label: '🧘 Yoga / Mobility' },
  { id: 'swim', label: '🏊 Schwimmen' },
  { id: 'bike', label: '🚴 Radfahren' },
  { id: 'hiit', label: '⚡ HIIT' },
  { id: 'walk', label: '🚶 Spazieren' },
  { id: 'other', label: '🎯 Sonstiges' },
]

const INTENSITIES = ['Leicht', 'Moderat', 'Intensiv', 'Maximal']

export default function AddTraining({ onClose }: { onClose: () => void }) {
  const [type, setType] = useState('')
  const [duration, setDuration] = useState('')
  const [intensity, setIntensity] = useState('Moderat')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!type) {
      Alert.alert('Bitte wähle eine Trainingsart.')
      return
    }
    if (!duration) {
      Alert.alert('Bitte gib die Dauer ein.')
      return
    }
    setSaving(true)
    try {
      const label = TRAINING_TYPES.find((t) => t.id === type)?.label ?? type
      await addDoc(collection(db, 'training'), {
        type,
        label,
        duration: parseInt(duration),
        intensity,
        note: note.trim(),
        date: new Date().toISOString().split('T')[0],
        createdAt: serverTimestamp(),
      })
      Alert.alert('✅ Gespeichert!', `${label} – ${duration} Min. wurde eingetragen.`)
      onClose()
    } catch (e) {
      Alert.alert('Fehler', 'Speichern fehlgeschlagen.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.label}>Trainingsart</Text>
        <View style={styles.typeGrid}>
          {TRAINING_TYPES.map((t) => (
            <TouchableOpacity
              key={t.id}
              style={[styles.typeCard, type === t.id && styles.typeCardActive]}
              onPress={() => setType(t.id)}
            >
              <Text style={styles.typeCardText}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Dauer (Minuten)</Text>
        <TextInput
          style={styles.input}
          value={duration}
          onChangeText={setDuration}
          placeholder="z.B. 60"
          placeholderTextColor="#9ca3af"
          keyboardType="number-pad"
        />

        <Text style={styles.label}>Intensität</Text>
        <View style={styles.chipRow}>
          {INTENSITIES.map((i) => (
            <TouchableOpacity
              key={i}
              style={[styles.chip, intensity === i && styles.chipActive]}
              onPress={() => setIntensity(i)}
            >
              <Text style={[styles.chipText, intensity === i && styles.chipTextActive]}>{i}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Notiz (optional)</Text>
        <TextInput
          style={[styles.input, { height: 70, textAlignVertical: 'top' }]}
          value={note}
          onChangeText={setNote}
          placeholder="z.B. Brust & Trizeps, 5km Lauf..."
          placeholderTextColor="#9ca3af"
          multiline
        />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.saveBtnText}>💾 Training speichern</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 100 },
  label: { fontSize: 13, fontWeight: '600', color: '#6b7280', marginBottom: 10, marginTop: 16, textTransform: 'uppercase', letterSpacing: 0.8 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  typeCard: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb' },
  typeCardActive: { backgroundColor: '#fff7e7', borderColor: '#fbbf24' },
  typeCardText: { fontSize: 14, color: '#1a1a2e', fontWeight: '600' },
  input: { backgroundColor: '#fff', borderRadius: 12, padding: 14, fontSize: 15, color: '#1a1a2e', borderWidth: 1, borderColor: '#e5e7eb' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb' },
  chipActive: { backgroundColor: '#fbbf24', borderColor: '#fbbf24' },
  chipText: { fontSize: 13, color: '#6b7280', fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  footer: { padding: 16, paddingBottom: 32, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  saveBtn: { backgroundColor: '#fbbf24', padding: 16, borderRadius: 14, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})
