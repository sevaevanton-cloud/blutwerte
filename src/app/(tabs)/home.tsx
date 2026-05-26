// src/components/add/AddBloodValues.tsx
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
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
import SaveButton from '../../components/ui/SaveButton'; // ✅ richtig
import { db } from '../../config/firebase';
import {
  BLOOD_VALUE_CATEGORIES,
  BloodValue,
  getValuesByCategory,
} from '../../constants/bloodValues';
import { BRAND } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { useProfile } from '../../context/ProfileContext';
import { scanBloodDocument } from '../../services/geminiScan';

interface EnteredValue {
  value: string
  unit: string
}

// ── Scan-Banner ────────────────────────────────────────────────────
function ScanBanner({
  onScanCamera,
  onScanGallery,
  scanning,
  scanResult,
}: {
  onScanCamera: () => void
  onScanGallery: () => void
  scanning: boolean
  scanResult: { count: number; confidence: string } | null
}) {
  return (
    <View style={scanStyles.container}>
      <View style={scanStyles.header}>
        <View>
          <Text style={scanStyles.title}>📸 Laborbefund scannen</Text>
          <Text style={scanStyles.subtitle}>KI liest deine Werte automatisch aus</Text>
        </View>
        {scanResult && (
          <View style={scanStyles.badge}>
            <Text style={scanStyles.badgeText}>✓ {scanResult.count} erkannt</Text>
          </View>
        )}
      </View>

      {scanning ? (
        <View style={scanStyles.loadingRow}>
          <ActivityIndicator color={BRAND} size="small" />
          <Text style={scanStyles.loadingText}>KI analysiert Befund...</Text>
        </View>
      ) : (
        <View style={scanStyles.btnRow}>
          <TouchableOpacity style={scanStyles.btn} onPress={onScanCamera}>
            <Text style={scanStyles.btnIcon}>📷</Text>
            <Text style={scanStyles.btnText}>Kamera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={scanStyles.btn} onPress={onScanGallery}>
            <Text style={scanStyles.btnIcon}>🖼️</Text>
            <Text style={scanStyles.btnText}>Galerie</Text>
          </TouchableOpacity>
        </View>
      )}

      {scanResult && (
        <Text style={scanStyles.hint}>
          {scanResult.confidence === 'high'
            ? '✅ Hohe Erkennungsgenauigkeit – bitte trotzdem kurz prüfen'
            : '⚠️ Bitte alle Werte überprüfen und ggf. korrigieren'}
        </Text>
      )}
    </View>
  )
}

// ── Main Component ────────────────────────────────────────────────
interface Props {
  onClose: () => void
  docId?: string
  initialValues?: Record<string, { value: number; unit: string }>
  initialDate?: string
  initialNote?: string
}

export default function AddBloodValues({ onClose, docId, initialValues, initialDate, initialNote }: Props) {
  const isEditing = !!docId
  const { profile } = useProfile()
  const { uid } = useAuth()
  const [enteredValues, setEnteredValues] = useState<Record<string, EnteredValue>>(
    initialValues
      ? Object.fromEntries(
          Object.entries(initialValues).map(([k, v]) => [k, { value: v.value.toString(), unit: v.unit }])
        )
      : {}
  )
  const [date, setDate] = useState(initialDate ?? new Date().toISOString().split('T')[0])
  const [note, setNote] = useState(initialNote ?? '')
  const [saving, setSaving] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState<{ count: number; confidence: string } | null>(null)
  const [unitPickerFor, setUnitPickerFor] = useState<BloodValue | null>(null)
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>(
    { '🩸 Blutbild': true }
  )

  const gender = profile.gender ?? 'male'

  // Beim Bearbeiten: Kategorien der vorhandenen Werte aufklappen
  React.useEffect(() => {
    if (initialValues) {
      expandCategoriesForValues(Object.keys(initialValues))
    }
  }, [])
  const valuesByCategory = useMemo(() => getValuesByCategory(gender), [gender])
  const filledCount = Object.values(enteredValues).filter((v) => v.value.trim() !== '').length

  // ── Scan-Logik ──────────────────────────────────────────────────

  const handleScan = async (source: 'camera' | 'gallery') => {
    if (source === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Keine Berechtigung', 'Kamera-Zugriff ist erforderlich.')
        return
      }
    }

    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          quality: 1,
          allowsEditing: true,
          aspect: [3, 4],
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 1,
        })

    if (result.canceled || !result.assets?.[0]) return

    const asset = result.assets[0]

    setScanning(true)
    try {
      // Bild auf max. 1000px verkleinern – reduziert ~3MB auf ~150KB
      const compressed = await ImageManipulator.manipulateAsync(
        asset.uri,
        [{ resize: { width: 1000 } }],
        {
          compress: 0.5,
          format: ImageManipulator.SaveFormat.JPEG,
          base64: true,
        }
      )

      if (!compressed.base64) {
        throw new Error('Bild konnte nicht komprimiert werden')
      }

      const scan = await scanBloodDocument(compressed.base64, 'image/jpeg')

      if (scan.detectedCount === 0) {
        Alert.alert(
          'Keine Werte erkannt',
          'Gemini konnte keine Laborwerte im Bild finden.\n\nTipps:\n• Gutes Licht verwenden\n• Dokument gerade halten\n• Ganzen Befund abfotografieren'
        )
        return
      }

      setEnteredValues(prev => ({ ...prev, ...scan.extractedValues }))
      expandCategoriesForValues(Object.keys(scan.extractedValues))
      setScanResult({ count: scan.detectedCount, confidence: scan.confidence })

      Alert.alert(
        `✅ ${scan.detectedCount} Werte erkannt`,
        'Die Felder wurden automatisch ausgefüllt.\nBitte kontrolliere und ergänze die Werte.'
      )
    } catch (e: any) {
      Alert.alert('Scan fehlgeschlagen', e.message ?? 'Unbekannter Fehler')
    } finally {
      setScanning(false)
    }
  }

  const expandCategoriesForValues = (valueIds: string[]) => {
    const updates: Record<string, boolean> = {}
    BLOOD_VALUE_CATEGORIES.forEach(cat => {
      const values = valuesByCategory[cat]
      if (values?.some(bv => valueIds.includes(bv.id))) {
        updates[cat] = true
      }
    })
    setExpandedCategories(prev => ({ ...prev, ...updates }))
  }

  // ── Bestehende Handlers ─────────────────────────────────────────

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

  const isValidDate = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d) && !isNaN(Date.parse(d))

  const handleSave = async () => {
    if (!uid) { Alert.alert('Fehler', 'Nicht eingeloggt.'); return }
    if (filledCount === 0) {
      Alert.alert('Keine Werte', 'Bitte trage mindestens einen Wert ein.')
      return
    }
    if (!isValidDate(date)) {
      Alert.alert('Ungültiges Datum', 'Bitte gib das Datum im Format JJJJ-MM-TT ein, z.B. 2024-03-15.')
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
      if (isEditing) {
        await updateDoc(doc(db, 'users', uid, 'bloodTests', docId), {
          date,
          note: note.trim(),
          gender,
          cyclePhase: profile.cyclePhase,
          values,
          scannedByAI: scanResult !== null,
        })
        Alert.alert('✅ Aktualisiert!', `${Object.keys(values).length} Wert(e) aktualisiert.`)
      } else {
        await addDoc(collection(db, 'users', uid, 'bloodTests'), {
          date,
          note: note.trim(),
          gender,
          cyclePhase: profile.cyclePhase,
          values,
          scannedByAI: scanResult !== null,
          createdAt: serverTimestamp(),
        })
        Alert.alert('✅ Gespeichert!', `${Object.keys(values).length} Wert(e) gespeichert.`)
      }
      onClose()
    } catch (e) {
      Alert.alert('Fehler', 'Speichern fehlgeschlagen.')
    } finally {
      setSaving(false)
    }
  }

  // ── Render ──────────────────────────────────────────────────────

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <ScanBanner
          onScanCamera={() => handleScan('camera')}
          onScanGallery={() => handleScan('gallery')}
          scanning={scanning}
          scanResult={scanResult}
        />

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

        {BLOOD_VALUE_CATEGORIES.map((category) => {
          const values = valuesByCategory[category]
          if (!values || values.length === 0) return null
          const isExpanded = expandedCategories[category] ?? false
          const filledInCategory = values.filter(bv => enteredValues[bv.id]?.value.trim()).length

          return (
            <View key={category} style={styles.categoryBlock}>
              <TouchableOpacity
                style={styles.categoryHeader}
                onPress={() => toggleCategory(category)}
              >
                <Text style={styles.categoryTitle}>{category}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {filledInCategory > 0 && (
                    <View style={styles.filledBadge}>
                      <Text style={styles.filledBadgeText}>{filledInCategory}</Text>
                    </View>
                  )}
                  <Text style={styles.chevron}>{isExpanded ? '▲' : '▼'}</Text>
                </View>
              </TouchableOpacity>

              {isExpanded && (
                <View style={styles.valuesList}>
                  {values.map((bv) => {
                    const entry = enteredValues[bv.id]
                    const currentUnit = entry?.unit ?? bv.defaultUnit
                    const currentValue = entry?.value ?? ''
                    const refLabel = getReferenceLabel(bv)
                    const valueColor = getValueColor(bv, currentValue)
                    const wasScanned = scanResult && entry?.value

                    return (
                      <View key={bv.id} style={styles.valueRow}>
                        <View style={styles.valueMeta}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Text style={styles.valueName}>
                              {bv.name}{bv.cycleDependent ? ' 🔄' : ''}
                            </Text>
                            {wasScanned && (
                              <Text style={styles.scannedDot}>●</Text>
                            )}
                          </View>
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

      <SaveButton
        onPress={handleSave}
        label={filledCount > 0
          ? (isEditing ? '💾 Änderungen speichern' : `💾 ${filledCount} Wert${filledCount > 1 ? 'e' : ''} speichern`)
          : 'Noch keine Werte eingetragen'}
        loading={saving}
        disabled={filledCount === 0}
      />

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

const scanStyles = StyleSheet.create({
  container: {
    backgroundColor: '#eef1ff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#d4dcff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  title: { fontSize: 15, fontWeight: '700', color: '#1a1a2e' },
  subtitle: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  badge: {
    backgroundColor: '#34d399',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  btnRow: { flexDirection: 'row', gap: 10 },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: BRAND,
    borderRadius: 12,
    paddingVertical: 12,
  },
  btnIcon: { fontSize: 16 },
  btnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    justifyContent: 'center',
    paddingVertical: 12,
  },
  loadingText: { fontSize: 14, color: '#6b7280' },
  hint: { fontSize: 11, color: '#6b7280', marginTop: 10, lineHeight: 16 },
})

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
  filledBadge: {
    backgroundColor: BRAND,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  filledBadgeText: { fontSize: 11, color: '#fff', fontWeight: '700' },
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
  scannedDot: { fontSize: 8, color: BRAND },
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