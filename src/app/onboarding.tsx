// src/app/onboarding.tsx
import { router } from 'expo-router'
import React, { useRef, useState } from 'react'
import {
    Animated, Dimensions, KeyboardAvoidingView, Platform,
    ScrollView, StyleSheet, Text, TextInput,
    TouchableOpacity, View,
} from 'react-native'
import { Gender, useProfile } from '../context/ProfileContext'

const BRAND = '#84a7ff'
const BRAND_LIGHT = '#eef1ff'
const BRAND_DARK = '#5b7ef7'
const { width } = Dimensions.get('window')

const CYCLE_PHASES = [
  { id: 'menstruation', label: '🔴 Menstruation', days: 'Tag 1–5' },
  { id: 'follicular', label: '🌱 Follikelphase', days: 'Tag 6–13' },
  { id: 'ovulation', label: '🌟 Eisprung', days: 'Tag 14' },
  { id: 'luteal', label: '🌙 Lutealphase', days: 'Tag 15–28' },
  { id: 'unknown', label: '❓ Unbekannt', days: '' },
]

const STEPS = ['welcome', 'name', 'gender', 'cycle', 'done']

export default function Onboarding() {
  const { updateProfile } = useProfile()

  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [gender, setGender] = useState<Gender | null>(null)
  const [birthYear, setBirthYear] = useState('')
  const [cyclePhase, setCyclePhase] = useState<string>('unknown')

  const fadeAnim = useRef(new Animated.Value(1)).current
  const slideAnim = useRef(new Animated.Value(0)).current

  const totalSteps = gender === 'female' ? 5 : 4
  const effectiveSteps = gender === 'female'
    ? STEPS
    : STEPS.filter(s => s !== 'cycle')

  const goNext = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -30, duration: 180, useNativeDriver: true }),
    ]).start(() => {
      setStep(s => s + 1)
      slideAnim.setValue(30)
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start()
    })
  }

  const handleFinish = async () => {
    await updateProfile({
      name: name.trim(),
      gender,
      birthYear: birthYear ? parseInt(birthYear) : null,
      cyclePhase: gender === 'female' ? (cyclePhase as any) : 'unknown',
    })
    router.replace('/(tabs)/home')
  }

  const currentStep = effectiveSteps[step]
  const progress = step / (effectiveSteps.length - 1)

  const canProceed = () => {
    if (currentStep === 'name') return name.trim().length >= 2
    if (currentStep === 'gender') return gender !== null
    return true
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Progress Bar */}
        {currentStep !== 'welcome' && currentStep !== 'done' && (
          <View style={styles.progressContainer}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
            </View>
            <Text style={styles.progressText}>{step} / {effectiveSteps.length - 2}</Text>
          </View>
        )}

        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], flex: 1 }}>

          {/* ── Welcome ── */}
          {currentStep === 'welcome' && (
            <View style={styles.centerContent}>
              <Text style={styles.bigEmoji}>🩸</Text>
              <Text style={styles.welcomeTitle}>Willkommen bei{'\n'}Blutwerte</Text>
              <Text style={styles.welcomeSubtitle}>
                Deine persönliche App für Blutwerte, Ernährung und Gesundheitsanalyse.
                {'\n\n'}In wenigen Schritten richten wir alles für dich ein.
              </Text>
              <TouchableOpacity style={styles.primaryBtn} onPress={goNext}>
                <Text style={styles.primaryBtnText}>Los geht's →</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Name ── */}
          {currentStep === 'name' && (
            <View style={styles.stepContent}>
              <Text style={styles.stepEmoji}>👤</Text>
              <Text style={styles.stepTitle}>Wie heißt du?</Text>
              <Text style={styles.stepSubtitle}>Dein Name wird für die persönliche Begrüßung verwendet.</Text>
              <TextInput
                style={styles.bigInput}
                value={name}
                onChangeText={setName}
                placeholder="Dein Name"
                placeholderTextColor="#9ca3af"
                autoFocus
                returnKeyType="next"
                onSubmitEditing={() => canProceed() && goNext()}
              />
              <TextInput
                style={[styles.bigInput, { marginTop: 12 }]}
                value={birthYear}
                onChangeText={setBirthYear}
                placeholder="Geburtsjahr (optional)"
                placeholderTextColor="#9ca3af"
                keyboardType="number-pad"
                maxLength={4}
              />
            </View>
          )}

          {/* ── Gender ── */}
          {currentStep === 'gender' && (
            <View style={styles.stepContent}>
              <Text style={styles.stepEmoji}>⚧</Text>
              <Text style={styles.stepTitle}>Biologisches Geschlecht</Text>
              <Text style={styles.stepSubtitle}>
                Wichtig für die korrekten Referenzwerte — z.B. unterscheiden sich Hämoglobin-Werte zwischen Männern und Frauen.
              </Text>
              <View style={styles.genderOptions}>
                {[
                  { id: 'male', emoji: '♂', label: 'Männlich', desc: 'Männliche Referenzwerte' },
                  { id: 'female', emoji: '♀', label: 'Weiblich', desc: 'Weibliche Referenzwerte + Zyklus' },
                  { id: 'diverse', emoji: '⚧', label: 'Divers', desc: 'Allgemeine Referenzwerte' },
                ].map(g => (
                  <TouchableOpacity
                    key={g.id}
                    style={[styles.genderCard, gender === g.id && styles.genderCardActive]}
                    onPress={() => setGender(g.id as Gender)}
                  >
                    <Text style={styles.genderEmoji}>{g.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.genderLabel, gender === g.id && styles.genderLabelActive]}>{g.label}</Text>
                      <Text style={styles.genderDesc}>{g.desc}</Text>
                    </View>
                    <View style={[styles.radio, gender === g.id && styles.radioActive]}>
                      {gender === g.id && <View style={styles.radioDot} />}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* ── Cycle ── */}
          {currentStep === 'cycle' && (
            <View style={styles.stepContent}>
              <Text style={styles.stepEmoji}>🌙</Text>
              <Text style={styles.stepTitle}>Zyklusphase</Text>
              <Text style={styles.stepSubtitle}>
                Hormone wie Östrogen, Progesteron, LH und FSH variieren je nach Zyklusphase stark. So zeigen wir dir die passenden Referenzwerte.
              </Text>
              {CYCLE_PHASES.map(phase => (
                <TouchableOpacity
                  key={phase.id}
                  style={[styles.phaseRow, cyclePhase === phase.id && styles.phaseRowActive]}
                  onPress={() => setCyclePhase(phase.id)}
                >
                  <Text style={[styles.phaseLabel, cyclePhase === phase.id && styles.phaseLabelActive]}>
                    {phase.label}
                  </Text>
                  {phase.days ? <Text style={styles.phaseDays}>{phase.days}</Text> : null}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* ── Done ── */}
          {currentStep === 'done' && (
            <View style={styles.centerContent}>
              <Text style={styles.bigEmoji}>🎉</Text>
              <Text style={styles.welcomeTitle}>Alles bereit,{'\n'}{name}!</Text>
              <Text style={styles.welcomeSubtitle}>
                Dein Profil ist eingerichtet. Du kannst jetzt Blutwerte eintragen, deine Ernährung tracken und KI-gestützte Analysen erhalten.
              </Text>

              <View style={styles.summaryBox}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Name</Text>
                  <Text style={styles.summaryValue}>{name}</Text>
                </View>
                {birthYear ? (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Jahrgang</Text>
                    <Text style={styles.summaryValue}>{birthYear}</Text>
                  </View>
                ) : null}
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Geschlecht</Text>
                  <Text style={styles.summaryValue}>
                    {gender === 'male' ? '♂ Männlich' : gender === 'female' ? '♀ Weiblich' : '⚧ Divers'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity style={styles.primaryBtn} onPress={handleFinish}>
                <Text style={styles.primaryBtnText}>App starten 🚀</Text>
              </TouchableOpacity>
            </View>
          )}

        </Animated.View>

        {/* Next Button */}
        {currentStep !== 'welcome' && currentStep !== 'done' && (
          <TouchableOpacity
            style={[styles.primaryBtn, !canProceed() && styles.primaryBtnDisabled]}
            onPress={canProceed() ? goNext : undefined}
            activeOpacity={canProceed() ? 0.85 : 1}
          >
            <Text style={styles.primaryBtnText}>
              {currentStep === effectiveSteps[effectiveSteps.length - 2] ? 'Fertig ✓' : 'Weiter →'}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f8fc' },
  content: { flexGrow: 1, padding: 24, paddingBottom: 48 },

  progressContainer: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 32 },
  progressTrack: { flex: 1, height: 4, backgroundColor: '#e5e7eb', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: BRAND, borderRadius: 2 },
  progressText: { fontSize: 13, color: '#9ca3af', fontWeight: '600' },

  centerContent: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  bigEmoji: { fontSize: 72, marginBottom: 24 },
  welcomeTitle: { fontSize: 32, fontWeight: '800', color: '#1a1a2e', textAlign: 'center', lineHeight: 40, marginBottom: 16 },
  welcomeSubtitle: { fontSize: 16, color: '#6b7280', textAlign: 'center', lineHeight: 24, marginBottom: 40 },

  stepContent: { flex: 1, paddingTop: 8 },
  stepEmoji: { fontSize: 48, marginBottom: 16 },
  stepTitle: { fontSize: 26, fontWeight: '800', color: '#1a1a2e', marginBottom: 10 },
  stepSubtitle: { fontSize: 15, color: '#6b7280', lineHeight: 22, marginBottom: 28 },

  bigInput: { backgroundColor: '#fff', borderRadius: 14, padding: 16, fontSize: 18, color: '#1a1a2e', borderWidth: 1.5, borderColor: '#e5e7eb', shadowColor: '#84a7ff', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },

  genderOptions: { gap: 12 },
  genderCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 16, gap: 14, borderWidth: 1.5, borderColor: '#e5e7eb' },
  genderCardActive: { borderColor: BRAND, backgroundColor: BRAND_LIGHT },
  genderEmoji: { fontSize: 24, width: 32, textAlign: 'center' },
  genderLabel: { fontSize: 16, fontWeight: '700', color: '#1a1a2e' },
  genderLabelActive: { color: BRAND_DARK },
  genderDesc: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#d1d5db', alignItems: 'center', justifyContent: 'center' },
  radioActive: { borderColor: BRAND },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: BRAND },

  phaseRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1.5, borderColor: '#e5e7eb' },
  phaseRowActive: { borderColor: BRAND, backgroundColor: BRAND_LIGHT },
  phaseLabel: { fontSize: 15, color: '#6b7280', fontWeight: '500' },
  phaseLabelActive: { color: BRAND_DARK, fontWeight: '700' },
  phaseDays: { fontSize: 12, color: '#9ca3af' },

  summaryBox: { width: '100%', backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 32, gap: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { fontSize: 14, color: '#9ca3af', fontWeight: '500' },
  summaryValue: { fontSize: 14, color: '#1a1a2e', fontWeight: '700' },

  primaryBtn: { backgroundColor: BRAND, padding: 18, borderRadius: 16, alignItems: 'center', marginTop: 16, shadowColor: BRAND, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 6 },
  primaryBtnDisabled: { backgroundColor: '#d1d5db', shadowOpacity: 0 },
  primaryBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
})