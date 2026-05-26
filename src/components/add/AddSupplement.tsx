// src/components/add/AddSupplement.tsx
import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import React, { useState } from 'react'
import {
  Alert, ScrollView, StyleSheet, Text,
  TextInput, TouchableOpacity, View
} from 'react-native'
import { db } from '../../config/firebase'
import { BRAND } from '../../constants/theme'
import { useAuth } from '../../context/AuthContext'
import SaveButton from '../ui/SaveButton'

const COMMON_SUPPLEMENTS = [
  'Vitamin D3', 'Vitamin K2', 'Omega-3', 'Magnesium',
  'Zink', 'Vitamin B12', 'Folsäure', 'Eisen',
  'Ashwagandha', 'Kreatin', 'Protein', 'Vitamin C',
]

const UNITS = ['mg', 'µg', 'g', 'IE', 'ml', 'Kapsel(n)', 'Tablette(n)']
const TIMES = ['Morgens', 'Mittags', 'Abends', 'Vor dem Training', 'Nach dem Training']

interface Props {
  onClose: () => void
  docId?: string
  initialData?: { name: string; rawDose: string; unit: string; time: string }
}

export default function AddSupplement({ onClose, docId, initialData }: Props) {
  const { uid } = useAuth()
  const isEditing = !!docId

  const [name, setName]   = useState(initialData?.name    ?? '')
  const [dose, setDose]   = useState(initialData?.rawDose ?? '')
  const [unit, setUnit]   = useState(initialData?.unit    ?? 'mg')
  const [time, setTime]   = useState(initialData?.time    ?? 'Morgens')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Bitte wähle oder gib ein Supplement ein.')
      return
    }
    if (!uid) {
      Alert.alert('Fehler', 'Nicht eingeloggt.')
      return
    }
    setSaving(true)
    try {
      const data = {
        name: name.trim(),
        dose: dose ? parseFloat(dose.replace(',', '.')) : null,
        unit,
        time,
      }

      if (isEditing) {
        await updateDoc(doc(db, 'users', uid, 'supplements', docId), data)
        Alert.alert('✅ Aktualisiert!', `${name} wurde aktualisiert.`)
      } else {
        await addDoc(collection(db, 'users', uid, 'supplements'), {
          ...data,
          createdAt: serverTimestamp(),
        })
        Alert.alert('✅ Gespeichert!', `${name}${dose ? ` ${dose} ${unit}` : ''} wurde eingetragen.`)
      }
      onClose()
    } catch (e) {
      Alert.alert('Fehler', 'Speichern fehlgeschlagen. Bitte erneut versuchen.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.content}>
        {!isEditing && (
          <>
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
          </>
        )}

        <Text style={styles.label}>{isEditing ? 'Name' : 'Oder manuell eingeben'}</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Name des Supplements"
          placeholderTextColor="#9ca3af"
        />

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

      <SaveButton
        onPress={handleSave}
        label={isEditing ? '💾 Änderungen speichern' : '💾 Supplement speichern'}
        loading={saving}
      />
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
})
