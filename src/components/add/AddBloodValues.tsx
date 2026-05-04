// src/components/add/AddBloodValues.tsx
'use no memo';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import React, { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { db } from '../../config/firebase';
import {
    BLOOD_VALUE_CATEGORIES,
    BloodValue,
    getValuesByCategory,
} from '../../constants/bloodValues';
import { useProfile } from '../../context/ProfileContext';

const BRAND = '#84a7ff'

interface EnteredValue {
  value: string
  unit: string
}

export default function AddBloodValues({ onClose }: { onClose: () => void }) {
  const { profile } = useProfile()
  const [enteredValues, setEnteredValues] = useState<Record<string, EnteredValue>>({})
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [unitPickerFor, setUnitPickerFor] = useState<BloodValue | null>(null)
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>(
    { '🩸 Blutbild': true }
  )

  const gender = profile.gender ?? 'male'
  const valuesByCategory = useMemo(() => getValuesByCategory(gender), [gender])
  const filledCount = Object.values(enteredValues).filter((v) => v.value.trim() !== '').length

  const handleValueChange = (id: string, text: string, defaultUnit: string) => {
    setEnteredValues((prev) => ({
      ...prev,
      [id]: { value: text, unit: prev[id]?.unit ?? defaultUnit },
    }))
  }

  const handleUnitChange = (id: string, unit: string) => {
    setEnteredValues((prev) => ({
      ...prev,
      [id]: { value: prev[id]?.value ?? '', unit },
    }))
    setUnitPickerFor(null)
  }

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => ({ ...prev, [category]: !prev[category] }))
  }

  const getValueColor = (bv: BloodValue, inputValue: string): string => {
    if (!inputValue) return '#1a1a2e'
    const ref = bv.referenceRanges
    if (!ref) return '#1a1a2e'
    const range = ref[gender as 'male' | 'female'] ?? ref.all
    if (!range) return '#1a1a2e'
    const val = parseFloat(inputValue.replace(',', '.'))
    if (isNaN(val)) return '#1a1a2e'
    if (val < range.min || val > range.max) return '#f87171'
    return '#34d399'
  }

  const getReferenceLabel = (bv: BloodValue): string | null => {
    const ref = bv.referenceRanges
    if (!ref) return null
    const range = ref[gender as 'male' | 'female'] ?? ref.all
    if (!range) return null
    return `${range.min}–${range.max}`
  }

  const handleSave = async () => {
    if (filledCount === 0) {
      Alert.alert('Keine Werte', 'Bitte trage mindestens einen Wert ein.')
      return
    }
    setSaving(true)
    try {
      const values: Record<string, { value: number; unit: string }> = {}
      Object.entries(enteredValues).forEach(([id, entry]) => {
        if (entry.value.trim()) {
          const parsed = parseFloat(entry.value.replace(',', '.'))
          if (!isNaN(parsed)) values[id] = { value: parsed, unit: entry.unit }
        }
      })
      await addDoc(collection(db, 'bloodTests'), {
        date,
        note: note.trim(),
        gender,
        cyclePhase: profile.cyclePhase,
        values,
        createdAt: serverTimestamp(),
      })
      Alert.alert('✅ Gespeichert!', `${Object.keys(values).length} Wert(e) gespeichert.`)
      onClose()
    } catch (e) {
      Alert.alert('Fehler', 'Speichern fehlgeschlagen.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Datum */}
        <View style={styles.section}>
          <Text style={styles.label}>📅 Datum der Blutabnahme</Text>
          <TextInput
            style={styles.input}
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#9ca3af"
          />
        </View>

        {/* Kategorien */}
        {BLOOD_VALUE_CATEGORIES.map((category) => {
          const values = valuesByCategory[category]
          if (!values || values.length === 0) return null
          const isExpanded = expandedCategories[category] ?? false

          return (
            <View key={category} style={styles.categoryBlock}>
              <TouchableOpacity
                style={styles.categoryHeader}
                onPress={() => toggleCategory(category)}
              >
                <Text style={styles.categoryTitle}>{category}</Text>
                <Text style={styles.chevron}>{isExpanded ? '▲' : '▼'}</Text>
              </TouchableOpacity>

              {isExpanded && (
                <View style={styles.valuesList}>
                  {values.map((bv) => {
                    const entry = enteredValues[bv.id]
                    const currentUnit = entry?.unit ?? bv.defaultUnit
                    const currentValue = entry?.value ?? ''
                    const refLabel = getReferenceLabel(bv)
                    const valueColor = getValueColor(bv, currentValue)

                    return (
                      <View key={bv.id} style={styles.valueRow}>
                        <View style={styles.valueMeta}>
                          <Text style={styles.valueName}>
                            {bv.name}{bv.cycleDependent ? ' 🔄' : ''}
                          </Text>
                          {refLabel && (
                            <Text style={styles.refLabel}>
                              Ref: {refLabel} {currentUnit}
                            </Text>
                          )}
                        </View>
                        <View style={styles.inputRow}>
                          <TextInput
                            style={[styles.valueInput, { color: valueColor }]}
                            value={currentValue}
                            onChangeText={(t) => handleValueChange(bv.id, t, bv.defaultUnit)}
                            placeholder="–"
                            placeholderTextColor="#d1d5db"
                            keyboardType="decimal-pad"
                          />
                          {bv.units.length > 1 ? (
                            <TouchableOpacity
                              style={styles.unitBtn}
                              onPress={() => setUnitPickerFor(bv)}
                            >
                              <Text style={styles.unitBtnText}>{currentUnit} ▾</Text>
                            </TouchableOpacity>
                          ) : (
                            <Text style={styles.unitStatic}>{currentUnit}</Text>
                          )}
                        </View>
                      </View>
                    )
                  })}
                </View>
              )}
            </View>
          )
        })}

        {/* Notiz */}
        <View style={styles.section}>
          <Text style={styles.label}>📝 Notiz</Text>
          <TextInput
            style={[styles.input, { height: 70, textAlignVertical: 'top' }]}
            value={note}
            onChangeText={setNote}
            placeholder="z.B. Nüchternblut..."
            placeholderTextColor="#9ca3af"
            multiline
          />
        </View>
      </ScrollView>

      {/* Save Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveBtn, filledCount === 0 && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving || filledCount === 0}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>
              {filledCount > 0
                ? `💾 ${filledCount} Wert${filledCount > 1 ? 'e' : ''} speichern`
                : 'Noch keine Werte eingetragen'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Unit Picker */}
      <Modal visible={!!unitPickerFor} transparent animationType="slide">
        <TouchableOpacity style={styles.overlay} onPress={() => setUnitPickerFor(null)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Einheit wählen</Text>
            <Text style={styles.sheetSubtitle}>{unitPickerFor?.name}</Text>
            {unitPickerFor?.units.map((unit) => (
              <TouchableOpacity
                key={unit}
                style={styles.unitOption}
                onPress={() => handleUnitChange(unitPickerFor.id, unit)}
              >
                <Text style={styles.unitOptionText}>{unit || '–'}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 100 },
  section: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#6b7280', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#1a1a2e',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  categoryBlock: { marginBottom: 10 },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  categoryTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a2e' },
  chevron: { fontSize: 12, color: '#9ca3af' },
  valuesList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginTop: 2,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f9fafb',
  },
  valueMeta: { flex: 1, marginRight: 10 },
  valueName: { fontSize: 14, color: '#1a1a2e', fontWeight: '500' },
  refLabel: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  valueInput: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 15,
    fontWeight: '700',
    width: 72,
    textAlign: 'right',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  unitBtn: {
    backgroundColor: '#eef1ff',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  unitBtnText: { color: BRAND, fontSize: 11, fontWeight: '700' },
  unitStatic: { fontSize: 11, color: '#9ca3af', paddingHorizontal: 4 },
  footer: {
    padding: 16,
    paddingBottom: 32,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  saveBtn: {
    backgroundColor: BRAND,
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  saveBtnDisabled: { backgroundColor: '#e5e7eb', shadowOpacity: 0 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  overlay: { flex: 1, backgroundColor: '#00000066', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 44 },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: '#1a1a2e', marginBottom: 4 },
  sheetSubtitle: { fontSize: 13, color: '#9ca3af', marginBottom: 16 },
  unitOption: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f9fafb' },
  unitOptionText: { fontSize: 16, color: '#1a1a2e', fontWeight: '500' },
})
