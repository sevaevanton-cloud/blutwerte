// src/app/(tabs)/profile.tsx
import AsyncStorage from '@react-native-async-storage/async-storage'
import { router } from 'expo-router'
import { collection, deleteDoc, getDocs } from 'firebase/firestore'
import React, { useState } from 'react'
import {
  Alert, ScrollView, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from 'react-native'
import { db } from '../../config/firebase'
import { useAuth } from '../../context/AuthContext'
import { useConsent } from '../../context/ConsentContext'
import { Gender, useProfile } from '../../context/ProfileContext'

const BRAND = '#84a7ff'
const BRAND_LIGHT = '#eef1ff'

const CYCLE_PHASES = [
  { id: 'menstruation', label: '🔴 Menstruation', days: 'Tag 1–5' },
  { id: 'follicular', label: '🌱 Follikelphase', days: 'Tag 6–13' },
  { id: 'ovulation', label: '🌟 Eisprung', days: 'Tag 14' },
  { id: 'luteal', label: '🌙 Lutealphase', days: 'Tag 15–28' },
  { id: 'unknown', label: '❓ Unbekannt', days: '' },
]

const COLLECTIONS = ['bloodTests', 'nutrition', 'supplements', 'training']

export default function Profile() {
  const { profile, updateProfile } = useProfile()
  const { uid } = useAuth()
  const { revokeConsent } = useConsent()

  const [name, setName] = useState(profile.name)
  const [gender, setGender] = useState(profile.gender)
  const [birthYear, setBirthYear] = useState(profile.birthYear?.toString() ?? '')
  const [cyclePhase, setCyclePhase] = useState(profile.cyclePhase)
  const [cycleDay, setCycleDay] = useState(profile.cycleDay?.toString() ?? '')
  const [deleting, setDeleting] = useState(false)

  const handleSave = () => {
    if (!name.trim()) { Alert.alert('Bitte gib deinen Namen ein.'); return }
    if (!gender) { Alert.alert('Bitte wähle dein Geschlecht.'); return }
    updateProfile({
      name: name.trim(),
      gender,
      birthYear: birthYear ? parseInt(birthYear) : null,
      cyclePhase: gender === 'female' ? cyclePhase : 'unknown',
      cycleDay: gender === 'female' && cycleDay ? parseInt(cycleDay) : null,
    })
    Alert.alert('✅ Profil gespeichert!')
  }

  const handleReset = () => {
    Alert.alert(
      'Profil zurücksetzen?',
      'Du wirst zum Onboarding weitergeleitet. Deine eingetragenen Daten bleiben erhalten.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Zurücksetzen',
          style: 'destructive',
          onPress: async () => {
            await updateProfile({
              name: '',
              gender: null,
              birthYear: null,
              cyclePhase: 'unknown',
              cycleDay: null,
              isProfileComplete: false,
            })
            router.replace('/onboarding')
          },
        },
      ]
    )
  }

  // Einwilligung widerrufen
  const handleRevokeConsent = () => {
    Alert.alert(
      'Einwilligung widerrufen?',
      'Du wirst zum Datenschutz-Bildschirm weitergeleitet. Die App kann ohne Einwilligung nicht genutzt werden. Deine gespeicherten Daten bleiben erhalten.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Widerrufen',
          style: 'destructive',
          onPress: async () => {
            await revokeConsent()
            router.replace('/consent')
          },
        },
      ]
    )
  }

  // Alle Daten löschen
  const handleDeleteAllData = () => {
    Alert.alert(
      '⚠️ Alle Daten löschen?',
      'Dieser Vorgang löscht unwiderruflich alle deine Blutwerte, Ernährungseinträge, Supplements, Training und Profildaten. Diese Aktion kann nicht rückgängig gemacht werden.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Endgültig löschen',
          style: 'destructive',
          onPress: () => {
            // Zweite Bestätigung
            Alert.alert(
              'Wirklich alle Daten löschen?',
              'Letzte Warnung: Alle Daten werden permanent gelöscht.',
              [
                { text: 'Abbrechen', style: 'cancel' },
                {
                  text: 'Ja, alles löschen',
                  style: 'destructive',
                  onPress: deleteAllData,
                },
              ]
            )
          },
        },
      ]
    )
  }

  const deleteAllData = async () => {
    if (!uid) return
    setDeleting(true)
    try {
      // Alle Firestore-Collections löschen
      for (const col of COLLECTIONS) {
        const snap = await getDocs(collection(db, 'users', uid, col))
        await Promise.all(snap.docs.map(doc => deleteDoc(doc.ref)))
      }

      // AsyncStorage löschen (Profil + Consent)
      await AsyncStorage.multiRemove(['userProfile', 'datenschutz_einwilligung_v1'])

      // Profil im State zurücksetzen
      await updateProfile({
        name: '',
        gender: null,
        birthYear: null,
        cyclePhase: 'unknown',
        cycleDay: null,
        isProfileComplete: false,
      })

      // Einwilligung widerrufen und zum Consent-Screen
      await revokeConsent()
      router.replace('/consent')
    } catch (e) {
      Alert.alert('Fehler', 'Daten konnten nicht vollständig gelöscht werden. Bitte versuche es erneut.')
      console.error('Daten löschen fehlgeschlagen:', e)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Mein Profil</Text>
      <Text style={styles.subtitle}>Deine Angaben helfen uns, die richtigen Referenzwerte anzuzeigen.</Text>

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

      {/* Name */}
      <View style={styles.card}>
        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Dein Name"
          placeholderTextColor="#9ca3af"
        />
      </View>

      {/* Geburtsjahr */}
      <View style={styles.card}>
        <Text style={styles.label}>Geburtsjahr</Text>
        <TextInput
          style={styles.input}
          value={birthYear}
          onChangeText={setBirthYear}
          placeholder="z.B. 1990"
          placeholderTextColor="#9ca3af"
          keyboardType="number-pad"
          maxLength={4}
        />
      </View>

      {/* Geschlecht */}
      <View style={styles.card}>
        <Text style={styles.label}>Biologisches Geschlecht</Text>
        <Text style={styles.hint}>Wird für die Referenzwerte benötigt</Text>
        <View style={styles.row}>
          {[
            { id: 'male', label: '♂ Männlich' },
            { id: 'female', label: '♀ Weiblich' },
            { id: 'diverse', label: '⚧ Divers' },
          ].map(g => (
            <TouchableOpacity
              key={g.id}
              style={[styles.chip, gender === g.id && styles.chipActive]}
              onPress={() => setGender(g.id as Gender)}
            >
              <Text style={[styles.chipText, gender === g.id && styles.chipTextActive]}>
                {g.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Zyklusphase */}
      {gender === 'female' && (
        <View style={styles.card}>
          <Text style={styles.label}>Aktuelle Zyklusphase</Text>
          <Text style={styles.hint}>Beeinflusst Referenzwerte für Östrogen, Progesteron, LH, FSH u.a.</Text>
          {CYCLE_PHASES.map(phase => (
            <TouchableOpacity
              key={phase.id}
              style={[styles.phaseRow, cyclePhase === phase.id && styles.phaseRowActive]}
              onPress={() => setCyclePhase(phase.id as any)}
            >
              <Text style={[styles.phaseLabel, cyclePhase === phase.id && styles.phaseLabelActive]}>
                {phase.label}
              </Text>
              {phase.days ? <Text style={styles.phaseDays}>{phase.days}</Text> : null}
            </TouchableOpacity>
          ))}

          <Text style={[styles.label, { marginTop: 16 }]}>Zyklustag (optional)</Text>
          <TextInput
            style={styles.input}
            value={cycleDay}
            onChangeText={setCycleDay}
            placeholder="z.B. 14"
            placeholderTextColor="#9ca3af"
            keyboardType="number-pad"
            maxLength={2}
          />
        </View>
      )}

      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>Profil speichern</Text>
      </TouchableOpacity>

      {/* Reset */}
      <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
        <Text style={styles.resetButtonText}>↩ Onboarding neu starten</Text>
      </TouchableOpacity>

      {/* ── Datenschutz-Bereich ───────────────────────────── */}
      <View style={styles.sectionDivider}>
        <Text style={styles.sectionDividerText}>Datenschutz & Daten</Text>
      </View>

      {/* Einwilligung widerrufen */}
      <TouchableOpacity style={styles.privacyButton} onPress={handleRevokeConsent}>
        <View style={styles.privacyButtonIcon}>
          <Text>🔒</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.privacyButtonTitle}>Einwilligung widerrufen</Text>
          <Text style={styles.privacyButtonDesc}>Datenschutzerklärung erneut anzeigen</Text>
        </View>
        <Text style={styles.privacyArrow}>›</Text>
      </TouchableOpacity>

      {/* Alle Daten löschen */}
      <TouchableOpacity
        style={[styles.deleteButton, deleting && { opacity: 0.6 }]}
        onPress={handleDeleteAllData}
        disabled={deleting}
      >
        <View style={styles.deleteButtonIcon}>
          <Text>🗑️</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.deleteButtonTitle}>
            {deleting ? 'Wird gelöscht...' : 'Alle Daten löschen'}
          </Text>
          <Text style={styles.deleteButtonDesc}>Blutwerte, Ernährung, Profil – unwiderruflich</Text>
        </View>
        <Text style={styles.privacyArrow}>›</Text>
      </TouchableOpacity>

    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f8fc' },
  content: { padding: 20, paddingBottom: 100 },

  title: { fontSize: 26, fontWeight: '800', color: '#1a1a2e', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: '#9ca3af', marginTop: 4, marginBottom: 24, lineHeight: 20 },

  avatarContainer: { alignItems: 'center', marginBottom: 24, gap: 12 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: BRAND, alignItems: 'center', justifyContent: 'center', shadowColor: BRAND, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: '800' },
  completeBadge: { backgroundColor: '#f0fdf4', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: '#bbf7d0' },
  completeBadgeText: { color: '#16a34a', fontSize: 13, fontWeight: '600' },

  card: { backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 14, shadowColor: '#84a7ff', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
  label: { fontSize: 12, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  hint: { fontSize: 12, color: '#9ca3af', marginBottom: 12, lineHeight: 17 },

  input: { backgroundColor: '#f7f8fc', color: '#1a1a2e', borderRadius: 10, padding: 14, fontSize: 16, borderWidth: 1.5, borderColor: '#e5e7eb' },

  row: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: '#f7f8fc', borderWidth: 1.5, borderColor: '#e5e7eb' },
  chipActive: { backgroundColor: BRAND_LIGHT, borderColor: BRAND },
  chipText: { color: '#6b7280', fontSize: 14, fontWeight: '600' },
  chipTextActive: { color: BRAND },

  phaseRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f7f8fc', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1.5, borderColor: '#e5e7eb' },
  phaseRowActive: { borderColor: BRAND, backgroundColor: BRAND_LIGHT },
  phaseLabel: { fontSize: 15, color: '#6b7280', fontWeight: '500' },
  phaseLabelActive: { color: BRAND, fontWeight: '700' },
  phaseDays: { fontSize: 12, color: '#9ca3af' },

  saveButton: { backgroundColor: BRAND, padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 8, shadowColor: BRAND, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 6 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  resetButton: { marginTop: 16, padding: 14, borderRadius: 14, alignItems: 'center', borderWidth: 1.5, borderColor: '#e5e7eb' },
  resetButtonText: { color: '#9ca3af', fontSize: 14, fontWeight: '600' },

  sectionDivider: { marginTop: 32, marginBottom: 14 },
  sectionDividerText: { fontSize: 12, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.8 },

  privacyButton: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1.5, borderColor: '#e5e7eb' },
  privacyButtonIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: BRAND_LIGHT, alignItems: 'center', justifyContent: 'center' },
  privacyButtonTitle: { fontSize: 14, fontWeight: '600', color: '#1a1a2e' },
  privacyButtonDesc: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  privacyArrow: { fontSize: 20, color: '#9ca3af' },

  deleteButton: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff5f5', borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1.5, borderColor: '#fecaca' },
  deleteButtonIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#fee2e2', alignItems: 'center', justifyContent: 'center' },
  deleteButtonTitle: { fontSize: 14, fontWeight: '600', color: '#dc2626' },
  deleteButtonDesc: { fontSize: 12, color: '#f87171', marginTop: 2 },
})
