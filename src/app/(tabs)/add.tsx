// src/app/(tabs)/add.tsx
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import React, { useMemo, useState } from 'react'
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
} from 'react-native'
import { db } from '../../config/firebase'
import {
  BLOOD_VALUE_CATEGORIES,
  BloodValue,
  getValuesByCategory,
} from '../../constants/bloodValues'
import { useProfile } from '../../context/ProfileContext'

interface EnteredValue {
  value: string
  unit: string
}

export default function Add() {
  const { profile } = useProfile()
  const [enteredValues, setEnteredValues] = useState<Record<string, EnteredValue>>({})
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [unitPickerFor, setUnitPickerFor] = useState<BloodValue | null>(null)
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>(
    { '🩸 Blutbild': true } // Blutbild standardmäßig aufgeklappt
  )

  const gender = profile.gender ?? 'male'
  const valuesByCategory = useMemo(() => getValuesByCategory(gender), [gender])

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

  const filledCount = Object.values(enteredValues).filter((v) => v.value.trim() !== '').length

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
        cycleDay: profile.cycleDay,
        values,
        createdAt: serverTimestamp(),
      })

      Alert.alert('✅ Gespeichert!', `${Object.keys(values).length} Wert(e) wurden gespeichert.`)
      setEnteredValues({})
      setNote('')
    } catch (e) {
      Alert.alert('Fehler', 'Beim Speichern ist etwas schiefgelaufen.')
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const getReferenceLabel = (bv: BloodValue): string | null => {
    const ref = bv.referenceRanges
    if (!ref) return null
    const range = ref[gender as 'male' | 'female'] ?? ref.all
    if (!range) return null
    return `Referenz: ${range.min}–${range.max}`
  }

  const getValueColor = (bv: BloodValue, inputValue: string): string => {
    if (!inputValue) return '#fff'
    const ref = bv.referenceRanges
    if (!ref) return '#fff'
    const range = ref[gender as 'male' | 'female'] ?? ref.all
    if (!range) return '#fff'
    const val = parseFloat(inputValue.replace(',', '.'))
    if (isNaN(val)) return '#fff'
    if (val < range.min || val > range.max) return '#f87171'
    return '#4ade80'
  }

  if (!profile.isProfileComplete) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyEmoji}>👤</Text>
        <Text style={styles.emptyTitle}>Profil erforderlich</Text>
        <Text style={styles.emptyText}>
          Bitte lege zuerst dein Profil an (Tab „Profil"), damit wir die richtigen
          Blutwerte und Referenzbereiche für dich anzeigen können.
        </Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <Text style={styles.title}>Blutwerte eintragen</Text>

        {/* Profil-Badge */}
        <View style={styles.profileBadge}>
          <Text style={styles.profileBadgeText}>
            {gender === 'female' ? '♀' : gender === 'male' ? '♂' : '⚧'} {profile.name}
            {gender === 'female' && profile.cyclePhase !== 'unknown'
              ? `  •  ${CYCLE_PHASE_LABELS[profile.cyclePhase]}`
              : ''}
          </Text>
        </View>

        {/* Datum */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>📅 Datum der Blutabnahme</Text>
          <TextInput
            style={styles.dateInput}
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#555"
          />
        </View>

        {/* Zyklus-Hinweis für Frauen */}
        {gender === 'female' && profile.cyclePhase !== 'unknown' && (
          <View style={styles.cycleBanner}>
            <Text style={styles.cycleBannerText}>
              ⚠️ Einige Werte (Östradiol, LH, FSH, Progesteron...) sind stark
              zyklusabhängig. Deine aktuelle Phase: {CYCLE_PHASE_LABELS[profile.cyclePhase]}
            </Text>
          </View>
        )}

        {/* Werte nach Kategorien */}
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
                <Text style={styles.categoryChevron}>{isExpanded ? '▲' : '▼'}</Text>
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
                            {bv.name}
                            {bv.cycleDependent ? ' 🔄' : ''}
                          </Text>
                          {bv.note && (
                            <Text style={styles.valueNote}>{bv.note}</Text>
                          )}
                          {refLabel && (
                            <Text style={styles.refLabel}>{refLabel} {currentUnit}</Text>
                          )}
                        </View>

                        <View style={styles.inputRow}>
                          <TextInput
                            style={[styles.valueInput, { color: valueColor }]}
                            value={currentValue}
                            onChangeText={(text) =>
                              handleValueChange(bv.id, text, bv.defaultUnit)
                            }
                            placeholder="–"
                            placeholderTextColor="#333"
                            keyboardType="decimal-pad"
                          />
                          {bv.units.length > 1 ? (
                            <TouchableOpacity
                              style={styles.unitButton}
                              onPress={() => setUnitPickerFor(bv)}
                            >
                              <Text style={styles.unitButtonText}>{currentUnit} ▾</Text>
                            </TouchableOpacity>
                          ) : (
                            <View style={styles.unitStatic}>
                              <Text style={styles.unitStaticText}>{currentUnit}</Text>
                            </View>
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
          <Text style={styles.sectionLabel}>📝 Notiz (optional)</Text>
          <TextInput
            style={[styles.dateInput, { height: 80, textAlignVertical: 'top' }]}
            value={note}
            onChangeText={setNote}
            placeholder="z.B. Nüchternblut, nach Sport..."
            placeholderTextColor="#555"
            multiline
          />
        </View>

        {/* Speichern Button */}
        <TouchableOpacity
          style={[styles.saveButton, filledCount === 0 && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving || filledCount === 0}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>
              {filledCount > 0
                ? `💾 ${filledCount} Wert${filledCount > 1 ? 'e' : ''} speichern`
                : 'Noch keine Werte eingetragen'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Einheit-Picker Modal */}
      <Modal
        visible={!!unitPickerFor}
        transparent
        animationType="slide"
        onRequestClose={() => setUnitPickerFor(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          onPress={() => setUnitPickerFor(null)}
        >
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Einheit wählen</Text>
            <Text style={styles.modalSubtitle}>{unitPickerFor?.name}</Text>
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

const CYCLE_PHASE_LABELS: Record<string, string> = {
  menstruation: '🔴 Menstruation',
  follicular: '🌱 Follikelphase',
  ovulation: '🌟 Eisprung',
  luteal: '🌙 Lutealphase',
  unknown: '❓ Unbekannt',
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  content: { padding: 16, paddingBottom: 80 },
  title: { fontSize: 26, fontWeight: '800', color: '#fff', marginBottom: 12 },

  profileBadge: {
    backgroundColor: '#1a1a2e',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2563eb44',
  },
  profileBadgeText: { color: '#7aa2f7', fontSize: 13, fontWeight: '600' },

  section: { marginBottom: 20 },
  sectionLabel: { fontSize: 13, color: '#888', fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 },
  dateInput: {
    backgroundColor: '#1a1a1a',
    color: '#fff',
    borderRadius: 10,
    padding: 13,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },

  cycleBanner: {
    backgroundColor: '#2a1a00',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#5a3a00',
  },
  cycleBannerText: { color: '#fbbf24', fontSize: 12, lineHeight: 18 },

  categoryBlock: { marginBottom: 12 },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#222',
  },
  categoryTitle: { fontSize: 15, fontWeight: '700', color: '#fff' },
  categoryChevron: { fontSize: 12, color: '#555' },

  valuesList: {
    backgroundColor: '#111',
    borderRadius: 10,
    marginTop: 2,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    overflow: 'hidden',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  valueMeta: { flex: 1, marginRight: 12 },
  valueName: { fontSize: 14, color: '#ddd', fontWeight: '500' },
  valueNote: { fontSize: 11, color: '#555', marginTop: 2 },
  refLabel: { fontSize: 11, color: '#444', marginTop: 2 },

  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  valueInput: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 16,
    fontWeight: '600',
    width: 75,
    textAlign: 'right',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  unitButton: {
    backgroundColor: '#1e2a4a',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  unitButtonText: { color: '#7aa2f7', fontSize: 11, fontWeight: '600' },
  unitStatic: { paddingHorizontal: 6 },
  unitStaticText: { color: '#444', fontSize: 11 },

  saveButton: {
    backgroundColor: '#2563eb',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  saveButtonDisabled: { backgroundColor: '#1a1a1a', shadowOpacity: 0 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  emptyContainer: { flex: 1, backgroundColor: '#0a0a0a', alignItems: 'center', justifyContent: 'center', padding: 30 },
  emptyEmoji: { fontSize: 50, marginBottom: 16 },
  emptyTitle: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 10 },
  emptyText: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 22 },

  modalOverlay: { flex: 1, backgroundColor: '#000000aa', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#111', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#fff', marginBottom: 4 },
  modalSubtitle: { fontSize: 13, color: '#666', marginBottom: 16 },
  unitOption: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  unitOptionText: { fontSize: 16, color: '#fff', fontWeight: '500' },
})
