// src/components/add/AddTraining.tsx
import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import React, { useState } from 'react'
import {
  Alert, ScrollView, StyleSheet, Text,
  TextInput, TouchableOpacity, View
} from 'react-native'
import { db } from '../../config/firebase'
import { useAuth } from '../../context/AuthContext'
import SaveButton from '../ui/SaveButton'

const TRAINING_TYPES = [
  { id: 'strength', label: '🏋️ Krafttraining' },
  { id: 'cardio',   label: '🏃 Cardio' },
  { id: 'yoga',     label: '🧘 Yoga / Mobility' },
  { id: 'swim',     label: '🏊 Schwimmen' },
  { id: 'bike',     label: '🚴 Radfahren' },
  { id: 'hiit',     label: '⚡ HIIT' },
  { id: 'walk',     label: '🚶 Spazieren' },
  { id: 'other',    label: '🎯 Sonstiges' },
]

const INTENSITIES = ['Leicht', 'Moderat', 'Intensiv', 'Maximal']

interface Props {
  onClose: () => void
  docId?: string
  initialData?: { type: string; duration: string; intensity: string; note: string }
}

export default function AddTraining({ onClose, docId, initialData }: Props) {
  const { uid } = useAuth()
  const isEditing = !!docId

  const [type,      setType]      = useState(initialData?.type      ?? '')
  const [duration,  setDuration]  = useState(initialData?.duration  ?? '')
  const [intensity, setIntensity] = useState(initialData?.intensity ?? 'Moderat')
  const [note,      setNote]      = useState(initialData?.note      ?? '')
  const [saving,    setSaving]    = useState(false)

  const handleSave = async () => {
    if (!type) {
      Alert.alert('Bitte wähle eine Trainingsart.')
      return
    }
    if (!duration) {
      Alert.alert('Bitte gib die Dauer ein.')
      return
    }
    if (!uid) {
      Alert.alert('Fehler', 'Nicht eingeloggt.')
      return
    }
    setSaving(true)
    try {
      const label = TRAINING_TYPES.find((t) => t.id === type)?.label ?? type
      const data = {
        type,
        label,
        duration: parseInt(duration),
        intensity,
        note: note.trim(),
      }

      if (isEditing) {
        await updateDoc(doc(db, 'users', uid, 'training', docId), data)
        Alert.alert('✅ Aktualisiert!', `${label} wurde aktualisiert.`)
      } else {
        await addDoc(collection(db, 'users', uid, 'training'), {
          ...data,
          date: new Date().toISOString().split('T')[0],
          createdAt: serverTimestamp(),
        })
        Alert.alert('✅ Gespeichert!', `${label} – ${duration} Min. wurde eingetragen.`)
      }
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

      <SaveButton
        onPress={handleSave}
        label={isEditing ? '💾 Änderungen speichern' : '💾 Training speichern'}
        loading={saving}
        color="#fbbf24"
      />
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
})
