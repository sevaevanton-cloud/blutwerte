// src/app/(tabs)/profile.tsx
import React, { useState } from 'react'
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { useProfile } from '../../context/ProfileContext'

const CYCLE_PHASES = [
  { id: 'menstruation', label: '🔴 Menstruation', days: 'Tag 1–5' },
  { id: 'follicular', label: '🌱 Follikelphase', days: 'Tag 6–13' },
  { id: 'ovulation', label: '🌟 Eisprung', days: 'Tag 14' },
  { id: 'luteal', label: '🌙 Lutealphase', days: 'Tag 15–28' },
  { id: 'unknown', label: '❓ Unbekannt', days: '' },
]

export default function Profile() {
  const { profile, updateProfile } = useProfile()

  const [name, setName] = useState(profile.name)
  const [gender, setGender] = useState(profile.gender)
  const [birthYear, setBirthYear] = useState(profile.birthYear?.toString() ?? '')
  const [cyclePhase, setCyclePhase] = useState(profile.cyclePhase)
  const [cycleDay, setCycleDay] = useState(profile.cycleDay?.toString() ?? '')

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Bitte gib deinen Namen ein.')
      return
    }
    if (!gender) {
      Alert.alert('Bitte wähle dein Geschlecht.')
      return
    }
    updateProfile({
      name: name.trim(),
      gender,
      birthYear: birthYear ? parseInt(birthYear) : null,
      cyclePhase: gender === 'female' ? cyclePhase : 'unknown',
      cycleDay: gender === 'female' && cycleDay ? parseInt(cycleDay) : null,
    })
    Alert.alert('✅ Profil gespeichert!')
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Mein Profil</Text>
      <Text style={styles.subtitle}>
        Deine Angaben helfen uns, die richtigen Referenzwerte anzuzeigen.
      </Text>

      {/* Name */}
      <View style={styles.section}>
        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Dein Name"
          placeholderTextColor="#555"
        />
      </View>

      {/* Geburtsjahr */}
      <View style={styles.section}>
        <Text style={styles.label}>Geburtsjahr</Text>
        <TextInput
          style={styles.input}
          value={birthYear}
          onChangeText={setBirthYear}
          placeholder="z.B. 1990"
          placeholderTextColor="#555"
          keyboardType="number-pad"
          maxLength={4}
        />
      </View>

      {/* Geschlecht */}
      <View style={styles.section}>
        <Text style={styles.label}>Biologisches Geschlecht</Text>
        <Text style={styles.hint}>
          Wird für die Referenzwerte benötigt
        </Text>
        <View style={styles.row}>
          {[
            { id: 'male', label: '♂ Männlich' },
            { id: 'female', label: '♀ Weiblich' },
            { id: 'diverse', label: '⚧ Divers' },
          ].map((g) => (
            <TouchableOpacity
              key={g.id}
              style={[styles.chip, gender === g.id && styles.chipActive]}
              onPress={() => setGender(g.id as any)}
            >
              <Text style={[styles.chipText, gender === g.id && styles.chipTextActive]}>
                {g.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Zyklusphase – nur für Frauen */}
      {gender === 'female' && (
        <View style={styles.section}>
          <Text style={styles.label}>Aktuelle Zyklusphase</Text>
          <Text style={styles.hint}>
            Beeinflusst Referenzwerte für Östrogen, Progesteron, LH, FSH u.a.
          </Text>
          {CYCLE_PHASES.map((phase) => (
            <TouchableOpacity
              key={phase.id}
              style={[styles.phaseRow, cyclePhase === phase.id && styles.phaseRowActive]}
              onPress={() => setCyclePhase(phase.id as any)}
            >
              <Text style={[styles.phaseLabel, cyclePhase === phase.id && styles.phaseLabelActive]}>
                {phase.label}
              </Text>
              {phase.days ? (
                <Text style={styles.phaseDays}>{phase.days}</Text>
              ) : null}
            </TouchableOpacity>
          ))}

          <Text style={[styles.label, { marginTop: 16 }]}>Zyklustag (optional)</Text>
          <TextInput
            style={styles.input}
            value={cycleDay}
            onChangeText={setCycleDay}
            placeholder="z.B. 14"
            placeholderTextColor="#555"
            keyboardType="number-pad"
            maxLength={2}
          />
        </View>
      )}

      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>Profil speichern</Text>
      </TouchableOpacity>

      {profile.isProfileComplete && (
        <View style={styles.savedBadge}>
          <Text style={styles.savedBadgeText}>✅ Profil vollständig</Text>
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  content: { padding: 20, paddingBottom: 60 },
  title: { fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 6 },
  subtitle: { fontSize: 13, color: '#666', marginBottom: 24, lineHeight: 18 },
  section: { marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '600', color: '#aaa', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.8 },
  hint: { fontSize: 12, color: '#555', marginBottom: 10 },
  input: {
    backgroundColor: '#1a1a1a',
    color: '#fff',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  row: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  chipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  chipText: { color: '#888', fontSize: 14, fontWeight: '500' },
  chipTextActive: { color: '#fff' },
  phaseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  phaseRowActive: { borderColor: '#2563eb', backgroundColor: '#1a2a4a' },
  phaseLabel: { fontSize: 15, color: '#aaa', fontWeight: '500' },
  phaseLabelActive: { color: '#fff' },
  phaseDays: { fontSize: 12, color: '#555' },
  saveButton: {
    backgroundColor: '#2563eb',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  savedBadge: {
    marginTop: 16,
    backgroundColor: '#0a2a1a',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1a5a3a',
  },
  savedBadgeText: { color: '#4ade80', fontSize: 14, fontWeight: '600' },
})
