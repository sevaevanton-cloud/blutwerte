// src/app/(tabs)/profile.tsx
import AsyncStorage from '@react-native-async-storage/async-storage'
import DateTimePicker from '@react-native-community/datetimepicker'
import { router } from 'expo-router'
import { collection, deleteDoc, getDocs } from 'firebase/firestore'
import React, { useState } from 'react'
import {
  Alert, Platform, ScrollView, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { db } from '../../config/firebase'
import { BRAND, BRAND_LIGHT } from '../../constants/theme'
import { useAuth } from '../../context/AuthContext'
import { useConsent } from '../../context/ConsentContext'
import { ActivityLevel, Gender, useProfile } from '../../context/ProfileContext'
import { ACTIVITY_LEVELS, calculateTDEE } from '../../utils/nutrition'

const CYCLE_PHASES = [
  { id: 'menstruation', label: '🔴 Menstruation', days: 'Tag 1–5' },
  { id: 'follicular',   label: '🌱 Follikelphase', days: 'Tag 6–13' },
  { id: 'ovulation',    label: '🌟 Eisprung',       days: 'Tag 14' },
  { id: 'luteal',       label: '🌙 Lutealphase',    days: 'Tag 15–28' },
  { id: 'unknown',      label: '❓ Unbekannt',       days: '' },
]

/** Löscht alle Dokumente einer Subcollection */
async function deleteSubcollection(uid: string, subcollection: string) {
  const colRef = collection(db, 'users', uid, subcollection)
  const snap = await getDocs(colRef)
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)))
}

export default function Profile() {
  const { profile, updateProfile, calorieGoal } = useProfile()
  const { user, uid, signOut } = useAuth()
  const { revokeConsent } = useConsent()
  const [deletingData, setDeletingData] = useState(false)

  const handleSignOut = () => {
    Alert.alert(
      'Abmelden?',
      'Du wirst abgemeldet. Wenn du anonym eingeloggt bist, gehen deine Daten verloren.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        { text: 'Abmelden', style: 'destructive', onPress: async () => {
          // Lokalen Cache ZUERST löschen, bevor signOut() den uid-Listener auslöst
          await AsyncStorage.clear()
          await revokeConsent()
          await signOut()
          router.replace('/consent')
        }},
      ]
    )
  }

  // DSGVO Art. 17 – Recht auf Löschung
  const handleDeleteAllData = () => {
    Alert.alert(
      '🗑️ Alle Daten löschen?',
      'Hiermit werden alle deine gespeicherten Daten unwiderruflich gelöscht:\n\n' +
      '• Alle Blutwerte\n' +
      '• Alle Ernährungseinträge\n' +
      '• Alle Supplements\n' +
      '• Alle Trainingseinträge\n' +
      '• KI-Analyse-Cache\n' +
      '• Dein Profil\n\n' +
      'Diese Aktion kann nicht rückgängig gemacht werden.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Alles löschen',
          style: 'destructive',
          onPress: async () => {
            if (!uid) return
            setDeletingData(true)
            try {
              // 1. Lokalen Cache sofort löschen (verhindert Re-Load nach Navigation)
              await AsyncStorage.clear()
              await revokeConsent()

              // 2. Firestore-Löschung mit allSettled: ein Fehler blockiert nicht den Rest
              await Promise.allSettled([
                deleteSubcollection(uid, 'bloodTests'),
                deleteSubcollection(uid, 'nutrition'),
                deleteSubcollection(uid, 'supplements'),
                deleteSubcollection(uid, 'training'),
                deleteSubcollection(uid, 'analysisCache'),
                deleteSubcollection(uid, 'profile'),
              ])

              // 3. Direkt navigieren – kein Alert davor (Alert + router.replace = Race Condition)
              await signOut()
              router.replace('/consent')
            } catch (e: any) {
              Alert.alert('Fehler', `Löschen fehlgeschlagen: ${e.message}`)
            } finally {
              setDeletingData(false)

            }
          },
        },
      ]
    )
  }

  // Einwilligung widerrufen (ohne Datenlöschung)
  const handleRevokeConsent = () => {
    Alert.alert(
      '⚠️ Einwilligung widerrufen?',
      'Deine Einwilligung zur Datenspeicherung und -verarbeitung wird widerrufen. ' +
      'Du wirst zur Datenschutz-Seite weitergeleitet und kannst die App nicht mehr nutzen, ' +
      'bis du erneut zustimmst.\n\n' +
      'Deine bereits gespeicherten Daten bleiben erhalten.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Einwilligung widerrufen',
          style: 'destructive',
          onPress: async () => {
            await revokeConsent()
            router.replace('/consent')
          },
        },
      ]
    )
  }

  const [name, setName]               = useState(profile.name)
  const [gender, setGender]           = useState(profile.gender)
  const [birthDate, setBirthDate]     = useState<Date>(
    profile.birthYear
      ? new Date(profile.birthYear, 0, 1)
      : new Date(1990, 0, 1)
  )
  const [showBirthPicker, setShowBirthPicker] = useState(false)
  const [cyclePhase, setCyclePhase]   = useState(profile.cyclePhase)
  const [cycleDay, setCycleDay]       = useState(profile.cycleDay?.toString() ?? '')
  const [height, setHeight]           = useState(profile.height?.toString() ?? '')
  const [weight, setWeight]           = useState(profile.weight?.toString() ?? '')
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | null>(profile.activityLevel)
  const [calorieOverride, setCalorieOverride] = useState(profile.calorieGoalOverride?.toString() ?? '')

  // Live-Vorschau TDEE
  const previewTDEE = calculateTDEE({
    gender,
    birthYear: birthDate.getFullYear(),
    height: height ? parseFloat(height) : null,
    weight: weight ? parseFloat(weight) : null,
    activityLevel,
  })

  const handleSave = () => {
    if (!name.trim()) { Alert.alert('Bitte gib deinen Namen ein.'); return }
    if (!gender) { Alert.alert('Bitte wähle dein Geschlecht.'); return }
    updateProfile({
      name: name.trim(),
      gender,
      birthYear: birthDate.getFullYear(),
      cyclePhase: gender === 'female' ? cyclePhase : 'unknown',
      cycleDay: gender === 'female' && cycleDay ? parseInt(cycleDay) : null,
      height: height ? parseFloat(height) : null,
      weight: weight ? parseFloat(weight) : null,
      activityLevel,
      calorieGoalOverride: calorieOverride ? parseInt(calorieOverride) : null,
    })
    Alert.alert('✅ Profil gespeichert!')
  }

  const handleReset = () => {
    Alert.alert(
      'Profil zurücksetzen?',
      'Du wirst zum Onboarding weitergeleitet. Deine eingetragenen Daten bleiben erhalten.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        { text: 'Zurücksetzen', style: 'destructive', onPress: async () => {
          await updateProfile({ name: '', gender: null, birthYear: null,
            cyclePhase: 'unknown', cycleDay: null, isProfileComplete: false,
            height: null, weight: null, activityLevel: null, calorieGoalOverride: null })
          router.replace('/onboarding')
        }},
      ]
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f7f8fc' }} edges={['top']}>
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Mein Profil</Text>
      <Text style={styles.subtitle}>Deine Angaben helfen uns, Referenzwerte und Kalorienziele zu berechnen.</Text>

      {/* Avatar */}
      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{name ? name[0].toUpperCase() : '?'}</Text>
        </View>
        {profile.isProfileComplete && (
          <View style={styles.completeBadge}>
            <Text style={styles.completeBadgeText}>✅ Profil vollständig</Text>
          </View>
        )}
      </View>

      {/* ── Grunddaten ── */}
      <Text style={styles.sectionTitle}>Grunddaten</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Name</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName}
          placeholder="Dein Name" placeholderTextColor="#9ca3af" />
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Geburtsjahr · {birthDate.getFullYear()}</Text>
        <TouchableOpacity
          style={styles.input}
          onPress={() => setShowBirthPicker(v => !v)}
          activeOpacity={0.75}
        >
          <Text style={{ fontSize: 16, color: '#1a1a2e', fontWeight: '600' }}>
            {birthDate.getFullYear()}
          </Text>
          <Text style={{ color: BRAND, fontWeight: '700' }}>
            {showBirthPicker ? '▴' : '▾'}
          </Text>
        </TouchableOpacity>
        {showBirthPicker && (
          <View style={styles.pickerWrapper}>
            <DateTimePicker
              value={birthDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, selectedDate) => {
                if (Platform.OS === 'android') setShowBirthPicker(false)
                if (selectedDate) setBirthDate(selectedDate)
              }}
              minimumDate={new Date(new Date().getFullYear() - 100, 0, 1)}
              maximumDate={new Date(new Date().getFullYear() - 14, 11, 31)}
              locale="de-DE"
              style={{ height: 150 }}
              textColor="#1a1a2e"
            />
            {Platform.OS === 'ios' && (
              <TouchableOpacity
                style={styles.pickerDoneBtn}
                onPress={() => setShowBirthPicker(false)}
              >
                <Text style={{ color: BRAND, fontWeight: '700', fontSize: 15 }}>Fertig</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Biologisches Geschlecht</Text>
        <Text style={styles.hint}>Wird für Referenzwerte und Kalorienziel benötigt</Text>
        <View style={styles.row}>
          {[{ id: 'male', label: '♂ Männlich' }, { id: 'female', label: '♀ Weiblich' }, { id: 'diverse', label: '⚧ Divers' }].map(g => (
            <TouchableOpacity key={g.id}
              style={[styles.chip, gender === g.id && styles.chipActive]}
              onPress={() => setGender(g.id as Gender)}>
              <Text style={[styles.chipText, gender === g.id && styles.chipTextActive]}>{g.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {gender === 'female' && (
        <View style={styles.card}>
          <Text style={styles.label}>Aktuelle Zyklusphase</Text>
          <Text style={styles.hint}>Beeinflusst Referenzwerte für Östrogen, Progesteron, LH, FSH u.a.</Text>
          {CYCLE_PHASES.map(phase => (
            <TouchableOpacity key={phase.id}
              style={[styles.phaseRow, cyclePhase === phase.id && styles.phaseRowActive]}
              onPress={() => setCyclePhase(phase.id as any)}>
              <Text style={[styles.phaseLabel, cyclePhase === phase.id && styles.phaseLabelActive]}>{phase.label}</Text>
              {phase.days ? <Text style={styles.phaseDays}>{phase.days}</Text> : null}
            </TouchableOpacity>
          ))}
          <Text style={[styles.label, { marginTop: 16 }]}>Zyklustag (optional)</Text>
          <TextInput style={styles.input} value={cycleDay} onChangeText={setCycleDay}
            placeholder="z.B. 14" placeholderTextColor="#9ca3af" keyboardType="number-pad" maxLength={2} />
        </View>
      )}

      {/* ── Körperliche Stats ── */}
      <Text style={styles.sectionTitle}>Körperliche Daten</Text>

      <View style={styles.cardRow}>
        <View style={[styles.card, { flex: 1 }]}>
          <Text style={styles.label}>Größe</Text>
          <TextInput style={styles.input} value={height} onChangeText={setHeight}
            placeholder="cm" placeholderTextColor="#9ca3af" keyboardType="decimal-pad" maxLength={5} />
        </View>
        <View style={[styles.card, { flex: 1 }]}>
          <Text style={styles.label}>Gewicht</Text>
          <TextInput style={styles.input} value={weight} onChangeText={setWeight}
            placeholder="kg" placeholderTextColor="#9ca3af" keyboardType="decimal-pad" maxLength={5} />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Aktivitätslevel</Text>
        <Text style={styles.hint}>Wie aktiv bist du im Alltag?</Text>
        {ACTIVITY_LEVELS.map(level => (
          <TouchableOpacity key={level.id}
            style={[styles.phaseRow, activityLevel === level.id && styles.phaseRowActive]}
            onPress={() => setActivityLevel(level.id)}>
            <View>
              <Text style={[styles.phaseLabel, activityLevel === level.id && styles.phaseLabelActive]}>{level.label}</Text>
              <Text style={styles.phaseDays}>{level.desc}</Text>
            </View>
            {activityLevel === level.id && <Text style={{ color: BRAND, fontWeight: '800' }}>✓</Text>}
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Kalorienziel ── */}
      <Text style={styles.sectionTitle}>Kalorienziel</Text>

      <View style={styles.card}>
        {previewTDEE ? (
          <View style={styles.tdeeBox}>
            <Text style={styles.tdeeLabel}>Berechnetes Ziel (TDEE)</Text>
            <Text style={styles.tdeeValue}>{previewTDEE.toLocaleString('de-DE')} kcal</Text>
            <Text style={styles.tdeeFormula}>Mifflin-St Jeor · {activityLevel ? ACTIVITY_LEVELS.find(a => a.id === activityLevel)?.label : '–'}</Text>
          </View>
        ) : (
          <View style={styles.tdeeBox}>
            <Text style={styles.tdeeLabel}>Berechnetes Ziel</Text>
            <Text style={[styles.tdeeValue, { color: '#9ca3af', fontSize: 16 }]}>
              Fülle Größe, Gewicht & Aktivitätslevel aus
            </Text>
          </View>
        )}

        <Text style={[styles.label, { marginTop: 16 }]}>Manuelles Ziel (optional)</Text>
        <Text style={styles.hint}>Überschreibt die Berechnung</Text>
        <TextInput style={styles.input} value={calorieOverride} onChangeText={setCalorieOverride}
          placeholder={previewTDEE ? `Berechnet: ${previewTDEE} kcal` : 'z.B. 2200'}
          placeholderTextColor="#9ca3af" keyboardType="number-pad" maxLength={5} />
      </View>

      {/* ── Account ── */}
      <Text style={styles.sectionTitle}>Account</Text>
      <View style={styles.accountBadge}>
        <Text style={styles.accountBadgeIcon}>✅</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.accountBadgeText}>Account gesichert</Text>
          {user?.email ? (
            <Text style={styles.accountBadgeEmail}>{user.email}</Text>
          ) : null}
        </View>
      </View>

      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>Profil speichern</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
        <Text style={styles.resetButtonText}>↩ Onboarding neu starten</Text>
      </TouchableOpacity>

      {/* ── Datenschutz ── */}
      <Text style={styles.sectionTitle}>Datenschutz (DSGVO)</Text>

      <TouchableOpacity
        style={styles.revokeConsentButton}
        onPress={handleRevokeConsent}
      >
        <Text style={styles.revokeConsentButtonText}>⚠️ Einwilligung widerrufen</Text>
        <Text style={styles.revokeConsentSubtext}>Daten bleiben erhalten – nur Einwilligung wird widerrufen</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.deleteDataButton, deletingData && { opacity: 0.6 }]}
        onPress={handleDeleteAllData}
        disabled={deletingData}
      >
        <Text style={styles.deleteDataButtonText}>
          {deletingData ? '⏳ Wird gelöscht…' : '🗑️ Alle Daten löschen (Art. 17 DSGVO)'}
        </Text>
        <Text style={styles.deleteDataSubtext}>Löscht alle Gesundheitsdaten unwiderruflich</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutButtonText}>Abmelden</Text>
      </TouchableOpacity>
    </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f8fc' },
  content: { padding: 20, paddingBottom: 100 },

  title: { fontSize: 26, fontWeight: '800', color: '#1a1a2e', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: '#9ca3af', marginTop: 4, marginBottom: 24, lineHeight: 20 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, marginTop: 8 },

  avatarContainer: { alignItems: 'center', marginBottom: 24, gap: 12 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: BRAND, alignItems: 'center', justifyContent: 'center', shadowColor: BRAND, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: '800' },
  completeBadge: { backgroundColor: '#f0fdf4', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: '#bbf7d0' },
  completeBadgeText: { color: '#16a34a', fontSize: 13, fontWeight: '600' },

  cardRow: { flexDirection: 'row', gap: 12, marginBottom: 0 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 12, shadowColor: BRAND, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
  label: { fontSize: 12, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  hint: { fontSize: 12, color: '#9ca3af', marginBottom: 12, lineHeight: 17 },
  input: { backgroundColor: '#f7f8fc', color: '#1a1a2e', borderRadius: 10, padding: 14, fontSize: 16, borderWidth: 1.5, borderColor: '#e5e7eb', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pickerWrapper: { backgroundColor: '#fff', borderRadius: 12, marginTop: 8, borderWidth: 1, borderColor: '#e5e7eb', overflow: 'hidden' },
  pickerDoneBtn: { alignItems: 'flex-end', padding: 12, borderTopWidth: 1, borderTopColor: '#f0f0f0' },

  row: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: '#f7f8fc', borderWidth: 1.5, borderColor: '#e5e7eb' },
  chipActive: { backgroundColor: BRAND_LIGHT, borderColor: BRAND },
  chipText: { color: '#6b7280', fontSize: 14, fontWeight: '600' },
  chipTextActive: { color: BRAND },

  phaseRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f7f8fc', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1.5, borderColor: '#e5e7eb' },
  phaseRowActive: { borderColor: BRAND, backgroundColor: BRAND_LIGHT },
  phaseLabel: { fontSize: 15, color: '#6b7280', fontWeight: '500' },
  phaseLabelActive: { color: BRAND, fontWeight: '700' },
  phaseDays: { fontSize: 12, color: '#9ca3af', marginTop: 2 },

  tdeeBox: { backgroundColor: BRAND_LIGHT, borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 4 },
  tdeeLabel: { fontSize: 12, color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 },
  tdeeValue: { fontSize: 32, fontWeight: '800', color: BRAND, marginTop: 4 },
  tdeeFormula: { fontSize: 12, color: '#9ca3af', marginTop: 4 },

  accountBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#f0fdf4', borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: '#bbf7d0', marginBottom: 12 },
  accountBadgeIcon: { fontSize: 18 },
  accountBadgeText: { fontSize: 13, color: '#16a34a', fontWeight: '600' },
  accountBadgeEmail: { fontSize: 12, color: '#6b7280', marginTop: 2 },

  saveButton: { backgroundColor: BRAND, padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 8, shadowColor: BRAND, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 6 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  resetButton: { marginTop: 12, padding: 14, borderRadius: 14, alignItems: 'center', borderWidth: 1.5, borderColor: '#e5e7eb' },
  resetButtonText: { color: '#9ca3af', fontSize: 14, fontWeight: '600' },

  revokeConsentButton: { marginTop: 8, padding: 14, borderRadius: 14, alignItems: 'center', borderWidth: 1.5, borderColor: '#fcd34d', backgroundColor: '#fffbeb' },
  revokeConsentButtonText: { color: '#b45309', fontSize: 14, fontWeight: '700' },
  revokeConsentSubtext: { color: '#92400e', fontSize: 11, marginTop: 3 },

  deleteDataButton: { marginTop: 8, padding: 14, borderRadius: 14, alignItems: 'center', borderWidth: 1.5, borderColor: '#fecaca', backgroundColor: '#fff5f5' },
  deleteDataButtonText: { color: '#dc2626', fontSize: 14, fontWeight: '700' },
  deleteDataSubtext: { color: '#b91c1c', fontSize: 11, marginTop: 3 },

  signOutButton: { marginTop: 8, padding: 14, borderRadius: 14, alignItems: 'center', borderWidth: 1.5, borderColor: '#e5e7eb' },
  signOutButtonText: { color: '#ef4444', fontSize: 14, fontWeight: '600' },
})
