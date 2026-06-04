// src/app/onboarding.tsx
import DateTimePicker from '@react-native-community/datetimepicker'
import { router } from 'expo-router'
import React, { useRef, useState } from 'react'
import {
  Animated, KeyboardAvoidingView, Platform,
  ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native'
import { BRAND, BRAND_DARK, BRAND_LIGHT } from '../constants/theme'
import { ActivityLevel, Gender, useProfile } from '../context/ProfileContext'
import { ACTIVITY_LEVELS, calculateTDEE } from '../utils/nutrition'

// ─── Geburtsjahr-Grenzen ──────────────────────────────────────────────────────
const MIN_BIRTH_DATE = new Date(new Date().getFullYear() - 100, 0, 1)
const MAX_BIRTH_DATE = new Date(new Date().getFullYear() - 14, 11, 31)
const DEFAULT_BIRTH_DATE = new Date(1990, 0, 1)

// ─── Zyklusoptionen ───────────────────────────────────────────────────────────
const CYCLE_PHASES = [
  { id: 'menstruation', label: '🔴 Menstruation', days: 'Tag 1–5' },
  { id: 'follicular',   label: '🌱 Follikelphase', days: 'Tag 6–13' },
  { id: 'ovulation',    label: '🌟 Eisprung',       days: 'Tag 14' },
  { id: 'luteal',       label: '🌙 Lutealphase',    days: 'Tag 15–28' },
  { id: 'unknown',      label: '❓ Unbekannt',       days: '' },
]

// ─── Körperstatus-Konfiguration ───────────────────────────────────────────────
// Visuelles Modell: 5 Stufen mit unterschiedlicher Schulter-/Hüftbreite
const BODY_PARAMS: Record<'male' | 'female', Array<{
  label: string; bmi: string; kf: string; torsoW: number; hipW: number; legW: number
}>> = {
  male: [
    { label: 'Sehr dünn',          bmi: '< 18.5', kf: '< 8% KF',   torsoW: 13, hipW: 12, legW: 5 },
    { label: 'Schlank',            bmi: '18–23',  kf: '8–15% KF',  torsoW: 17, hipW: 16, legW: 7 },
    { label: 'Normal',             bmi: '23–25',  kf: '15–20% KF', torsoW: 22, hipW: 20, legW: 9 },
    { label: 'Übergewichtig',      bmi: '25–30',  kf: '20–28% KF', torsoW: 28, hipW: 25, legW: 12 },
    { label: 'Stark\nübergewichtig', bmi: '> 30', kf: '> 28% KF',  torsoW: 34, hipW: 31, legW: 15 },
  ],
  female: [
    { label: 'Sehr dünn',          bmi: '< 18.5', kf: '< 15% KF',  torsoW: 11, hipW: 13, legW: 5 },
    { label: 'Schlank',            bmi: '18–23',  kf: '15–22% KF', torsoW: 14, hipW: 19, legW: 7 },
    { label: 'Normal',             bmi: '23–25',  kf: '22–28% KF', torsoW: 17, hipW: 23, legW: 9 },
    { label: 'Übergewichtig',      bmi: '25–30',  kf: '28–35% KF', torsoW: 22, hipW: 28, legW: 12 },
    { label: 'Stark\nübergewichtig', bmi: '> 30', kf: '> 35% KF',  torsoW: 28, hipW: 33, legW: 15 },
  ],
}

const LEVEL_COLORS = ['#93c5fd', '#6ee7b7', '#4ade80', '#fbbf24', '#f87171']

// ─── Body-Silhouette Komponente ───────────────────────────────────────────────
function BodyFigure({
  level, gender, active,
}: { level: number; gender: 'male' | 'female'; active: boolean }) {
  const p = BODY_PARAMS[gender][level - 1]
  const col = active ? BRAND : '#d1d5db'

  return (
    <View style={{ alignItems: 'center', height: 96 }}>
      {/* Kopf */}
      <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: col, marginBottom: 2 }} />
      {/* Hals */}
      <View style={{ width: 6, height: 5, backgroundColor: col }} />
      {/* Schultern / Torso */}
      <View style={{
        width: p.torsoW, height: 28, backgroundColor: col,
        borderRadius: gender === 'female' ? 6 : 4, marginBottom: 1,
      }} />
      {/* Taille → Hüfte (bei Frau breiter) */}
      <View style={{
        width: p.hipW, height: 14, backgroundColor: col,
        borderTopLeftRadius: 3, borderTopRightRadius: 3,
        borderBottomLeftRadius: gender === 'female' ? 10 : 4,
        borderBottomRightRadius: gender === 'female' ? 10 : 4,
        marginBottom: 2,
      }} />
      {/* Beine */}
      <View style={{ flexDirection: 'row', gap: 3 }}>
        <View style={{ width: p.legW, height: 22, backgroundColor: col, borderRadius: 4 }} />
        <View style={{ width: p.legW, height: 22, backgroundColor: col, borderRadius: 4 }} />
      </View>
    </View>
  )
}

// ─── Body-Auswahl Step ────────────────────────────────────────────────────────
function BodySelectStep({
  title, emoji, subtitle,
  gender, selected, onSelect,
}: {
  title: string; emoji: string; subtitle: string
  gender: 'male' | 'female'; selected: number | null
  onSelect: (level: number) => void
}) {
  const params = BODY_PARAMS[gender]

  return (
    <View style={{ flex: 1, paddingTop: 8 }}>
      <Text style={styles.stepEmoji}>{emoji}</Text>
      <Text style={styles.stepTitle}>{title}</Text>
      <Text style={styles.stepSubtitle}>{subtitle}</Text>

      <View style={styles.bodyRow}>
        {[1, 2, 3, 4, 5].map(level => {
          const active = selected === level
          const p = params[level - 1]
          return (
            <TouchableOpacity
              key={level}
              style={[styles.bodyCard, active && styles.bodyCardActive]}
              onPress={() => onSelect(level)}
              activeOpacity={0.75}
            >
              {/* Farbstreifen oben */}
              <View style={{
                height: 4, width: '100%', borderRadius: 2,
                backgroundColor: active ? BRAND : LEVEL_COLORS[level - 1],
                marginBottom: 8,
              }} />

              <BodyFigure level={level} gender={gender} active={active} />

              <Text style={[styles.bodyLabel, active && { color: BRAND }]} numberOfLines={2}>
                {p.label}
              </Text>
              <Text style={styles.bodyBmi}>BMI {p.bmi}</Text>
            </TouchableOpacity>
          )
        })}
      </View>

      {selected !== null && (
        <View style={styles.bodyInfoBox}>
          <Text style={styles.bodyInfoText}>
            {params[selected - 1].kf} · BMI {params[selected - 1].bmi}
          </Text>
        </View>
      )}
    </View>
  )
}

// ─── Steps Definition ─────────────────────────────────────────────────────────
const ALL_STEPS = ['welcome', 'name', 'birthyear', 'gender', 'cycle', 'body_stats', 'activity', 'body_status', 'body_goal', 'done']

// ─── Hauptkomponente ──────────────────────────────────────────────────────────
export default function Onboarding() {
  const { updateProfile } = useProfile()

  const [step, setStep]           = useState(0)
  const [name, setName]           = useState('')
  const [gender, setGender]       = useState<Gender | null>(null)
  const [birthDate, setBirthDate] = useState<Date>(DEFAULT_BIRTH_DATE)
  const [cyclePhase, setCyclePhase] = useState<string>('unknown')
  const [height, setHeight]       = useState('')
  const [weight, setWeight]       = useState('')
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | null>(null)
  const [bodyStatus, setBodyStatus] = useState<number | null>(null)
  const [bodyGoal, setBodyGoal]   = useState<number | null>(null)

  const fadeAnim  = useRef(new Animated.Value(1)).current
  const slideAnim = useRef(new Animated.Value(0)).current

  const effectiveSteps = gender === 'female'
    ? ALL_STEPS
    : ALL_STEPS.filter(s => s !== 'cycle')

  const genderKey: 'male' | 'female' = gender === 'female' ? 'female' : 'male'

  const animate = (cb: () => void) => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 0,  duration: 180, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -30, duration: 180, useNativeDriver: true }),
    ]).start(() => {
      cb()
      slideAnim.setValue(30)
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start()
    })
  }

  const goNext = () => animate(() => setStep(s => s + 1))

  const handleFinish = async () => {
    await updateProfile({
      name: name.trim(),
      gender,
      birthYear: birthDate.getFullYear(),
      cyclePhase: gender === 'female' ? (cyclePhase as any) : 'unknown',
      height: height ? parseFloat(height.replace(',', '.')) : null,
      weight: weight ? parseFloat(weight.replace(',', '.')) : null,
      activityLevel,
      bodyStatus,
      bodyGoal,
    })
    router.replace('/(tabs)/home')
  }

  const currentStep = effectiveSteps[step]
  const progress = step / (effectiveSteps.length - 1)

  // Vorschau TDEE für die Done-Zusammenfassung
  const previewTDEE = calculateTDEE({
    gender,
    birthYear: birthDate.getFullYear(),
    height: height ? parseFloat(height.replace(',', '.')) : null,
    weight: weight ? parseFloat(weight.replace(',', '.')) : null,
    activityLevel,
  })

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 'name':        return name.trim().length >= 2
      case 'birthyear':   return true
      case 'gender':      return gender !== null
      case 'body_stats':  return height.trim().length > 0 && weight.trim().length > 0
      case 'activity':    return activityLevel !== null
      case 'body_status': return bodyStatus !== null
      case 'body_goal':   return bodyGoal !== null
      default:            return true
    }
  }

  const isLastBeforeDone = currentStep === effectiveSteps[effectiveSteps.length - 2]

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Fortschrittsbalken */}
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
            </View>
          )}

          {/* ── Geburtsjahr ── */}
          {currentStep === 'birthyear' && (
            <View style={styles.stepContent}>
              <Text style={styles.stepEmoji}>🎂</Text>
              <Text style={styles.stepTitle}>Geburtsjahr</Text>
              <Text style={styles.stepSubtitle}>
                Wird für altersabhängige Referenzwerte und deine Kalorienberechnung benötigt.
                {'\n'}Drehe das Rad auf dein Geburtsjahr.
              </Text>
              <View style={styles.pickerCard}>
                <Text style={styles.pickerLabel}>GEBURTSJAHR</Text>
                <Text style={styles.pickerYear}>{birthDate.getFullYear()}</Text>
                <DateTimePicker
                  value={birthDate}
                  mode="date"
                  display="spinner"
                  onChange={(_, d) => { if (d) setBirthDate(d) }}
                  minimumDate={MIN_BIRTH_DATE}
                  maximumDate={MAX_BIRTH_DATE}
                  locale="de-DE"
                  style={styles.datePicker}
                  textColor="#1a1a2e"
                />
                <Text style={styles.pickerHint}>
                  Nur das Jahr wird gespeichert – Tag und Monat sind irrelevant.
                </Text>
              </View>
            </View>
          )}

          {/* ── Geschlecht ── */}
          {currentStep === 'gender' && (
            <View style={styles.stepContent}>
              <Text style={styles.stepEmoji}>⚧</Text>
              <Text style={styles.stepTitle}>Biologisches Geschlecht</Text>
              <Text style={styles.stepSubtitle}>
                Wichtig für korrekte Referenzwerte – z.B. unterscheiden sich Hämoglobin-Werte zwischen Männern und Frauen.
              </Text>
              <View style={styles.genderOptions}>
                {[
                  { id: 'male',    emoji: '♂', label: 'Männlich', desc: 'Männliche Referenzwerte' },
                  { id: 'female',  emoji: '♀', label: 'Weiblich', desc: 'Weibliche Referenzwerte + Zyklus' },
                  { id: 'diverse', emoji: '⚧', label: 'Divers',   desc: 'Allgemeine Referenzwerte' },
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

          {/* ── Zyklus (nur weiblich) ── */}
          {currentStep === 'cycle' && (
            <View style={styles.stepContent}>
              <Text style={styles.stepEmoji}>🌙</Text>
              <Text style={styles.stepTitle}>Zyklusphase</Text>
              <Text style={styles.stepSubtitle}>
                Hormone wie Östrogen, Progesteron, LH und FSH variieren je nach Zyklusphase stark.
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

          {/* ── Körperdaten ── */}
          {currentStep === 'body_stats' && (
            <View style={styles.stepContent}>
              <Text style={styles.stepEmoji}>📏</Text>
              <Text style={styles.stepTitle}>Körpermaße</Text>
              <Text style={styles.stepSubtitle}>
                Größe und Gewicht werden für dein Kalorienziel, deinen BMI und die Auswertung benötigt.
              </Text>
              <View style={styles.statsRow}>
                <View style={[styles.statsCard, { flex: 1 }]}>
                  <Text style={styles.statsCardLabel}>KÖRPERGRÖSSE</Text>
                  <View style={styles.statsInputRow}>
                    <TextInput
                      style={[styles.bigInput, { flex: 1, textAlign: 'center' }]}
                      value={height}
                      onChangeText={setHeight}
                      placeholder="175"
                      placeholderTextColor="#9ca3af"
                      keyboardType="decimal-pad"
                      maxLength={5}
                    />
                    <Text style={styles.unitLabel}>cm</Text>
                  </View>
                </View>
                <View style={[styles.statsCard, { flex: 1 }]}>
                  <Text style={styles.statsCardLabel}>KÖRPERGEWICHT</Text>
                  <View style={styles.statsInputRow}>
                    <TextInput
                      style={[styles.bigInput, { flex: 1, textAlign: 'center' }]}
                      value={weight}
                      onChangeText={setWeight}
                      placeholder="75"
                      placeholderTextColor="#9ca3af"
                      keyboardType="decimal-pad"
                      maxLength={5}
                    />
                    <Text style={styles.unitLabel}>kg</Text>
                  </View>
                </View>
              </View>
              {/* Live-BMI Vorschau */}
              {height && weight ? (() => {
                const h = parseFloat(height.replace(',', '.'))
                const w = parseFloat(weight.replace(',', '.'))
                if (!h || !w) return null
                const bmi = (w / Math.pow(h / 100, 2)).toFixed(1)
                const bmiNum = parseFloat(bmi)
                const bmiLabel = bmiNum < 18.5 ? 'Untergewicht' : bmiNum < 25 ? 'Normalgewicht' : bmiNum < 30 ? 'Übergewicht' : 'Adipositas'
                const bmiColor = bmiNum < 18.5 ? '#93c5fd' : bmiNum < 25 ? '#4ade80' : bmiNum < 30 ? '#fbbf24' : '#f87171'
                return (
                  <View style={[styles.bmiBox, { borderColor: bmiColor }]}>
                    <Text style={styles.bmiLabel}>BMI</Text>
                    <Text style={[styles.bmiValue, { color: bmiColor }]}>{bmi}</Text>
                    <Text style={[styles.bmiCategory, { color: bmiColor }]}>{bmiLabel}</Text>
                  </View>
                )
              })() : null}
            </View>
          )}

          {/* ── Aktivität ── */}
          {currentStep === 'activity' && (
            <View style={styles.stepContent}>
              <Text style={styles.stepEmoji}>🏃</Text>
              <Text style={styles.stepTitle}>Aktivitätslevel</Text>
              <Text style={styles.stepSubtitle}>
                Wie aktiv bist du im Alltag? Das bestimmt deinen täglichen Kalorienbedarf.
              </Text>
              {ACTIVITY_LEVELS.map(level => (
                <TouchableOpacity
                  key={level.id}
                  style={[styles.phaseRow, activityLevel === level.id && styles.phaseRowActive]}
                  onPress={() => setActivityLevel(level.id)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.phaseLabel, activityLevel === level.id && styles.phaseLabelActive]}>
                      {level.label}
                    </Text>
                    <Text style={styles.phaseDays}>{level.desc}</Text>
                  </View>
                  {activityLevel === level.id && <Text style={{ color: BRAND, fontWeight: '800' }}>✓</Text>}
                </TouchableOpacity>
              ))}
              {activityLevel && previewTDEE && (
                <View style={styles.tdeePreview}>
                  <Text style={styles.tdeePreviewLabel}>Geschätzter Kalorienbedarf</Text>
                  <Text style={styles.tdeePreviewValue}>{previewTDEE.toLocaleString('de-DE')} kcal / Tag</Text>
                </View>
              )}
            </View>
          )}

          {/* ── Aktueller Körper ── */}
          {currentStep === 'body_status' && (
            <BodySelectStep
              title="Dein aktueller Körper"
              emoji="🪞"
              subtitle={`Wähle aus, was deiner aktuellen Körperform am nächsten kommt.${gender === 'female' ? ' Weibliche Silhouette.' : ' Männliche Silhouette.'}`}
              gender={genderKey}
              selected={bodyStatus}
              onSelect={setBodyStatus}
            />
          )}

          {/* ── Zielkörper ── */}
          {currentStep === 'body_goal' && (
            <BodySelectStep
              title="Dein Zielkörper"
              emoji="🎯"
              subtitle="Welche Körperform möchtest du erreichen? Das hilft uns bei der Einschätzung deiner Ziele."
              gender={genderKey}
              selected={bodyGoal}
              onSelect={setBodyGoal}
            />
          )}

          {/* ── Fertig ── */}
          {currentStep === 'done' && (
            <View style={styles.centerContent}>
              <Text style={styles.bigEmoji}>🎉</Text>
              <Text style={styles.welcomeTitle}>Alles bereit,{'\n'}{name}!</Text>
              <Text style={styles.welcomeSubtitle}>
                Dein Profil ist eingerichtet. Du kannst jetzt Blutwerte eintragen, deine Ernährung tracken und KI-gestützte Analysen erhalten.
              </Text>
              <View style={styles.summaryBox}>
                {[
                  ['👤 Name',       name],
                  ['🎂 Jahrgang',   String(birthDate.getFullYear())],
                  ['⚧ Geschlecht',  gender === 'male' ? '♂ Männlich' : gender === 'female' ? '♀ Weiblich' : '⚧ Divers'],
                  height && weight ? ['📏 BMI', (() => {
                    const h = parseFloat(height.replace(',', '.')), w = parseFloat(weight.replace(',', '.'))
                    return (w / Math.pow(h / 100, 2)).toFixed(1)
                  })()] : null,
                  previewTDEE ? ['🔥 Kalorienbedarf', `${previewTDEE.toLocaleString('de-DE')} kcal`] : null,
                  bodyStatus ? ['🪞 Aktueller Status', BODY_PARAMS[genderKey][bodyStatus - 1].label] : null,
                  bodyGoal   ? ['🎯 Ziel',             BODY_PARAMS[genderKey][bodyGoal - 1].label]   : null,
                ].filter((item): item is [string, string] => item !== null).map(([label, value]) => (
                  <View key={label as string} style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>{label as string}</Text>
                    <Text style={styles.summaryValue}>{value as string}</Text>
                  </View>
                ))}
              </View>
              <TouchableOpacity style={styles.primaryBtn} onPress={handleFinish}>
                <Text style={styles.primaryBtnText}>App starten 🚀</Text>
              </TouchableOpacity>
            </View>
          )}

        </Animated.View>

        {/* Weiter-Button */}
        {currentStep !== 'welcome' && currentStep !== 'done' && (
          <TouchableOpacity
            style={[styles.primaryBtn, !canProceed() && styles.primaryBtnDisabled]}
            onPress={canProceed() ? goNext : undefined}
            activeOpacity={canProceed() ? 0.85 : 1}
          >
            <Text style={styles.primaryBtnText}>
              {isLastBeforeDone ? 'Fertig ✓' : 'Weiter →'}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
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

  bigInput: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    fontSize: 18, color: '#1a1a2e', borderWidth: 1.5, borderColor: '#e5e7eb',
    shadowColor: BRAND, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },

  // Geburtsjahr Picker
  pickerCard: {
    backgroundColor: '#fff', borderRadius: 20, paddingTop: 20, paddingBottom: 12,
    paddingHorizontal: 16, borderWidth: 1.5, borderColor: BRAND,
    shadowColor: BRAND, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 4,
    alignItems: 'center',
  },
  pickerLabel: { fontSize: 11, fontWeight: '700', color: BRAND, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4 },
  pickerYear: { fontSize: 42, fontWeight: '800', color: '#1a1a2e', letterSpacing: -1, marginBottom: 4 },
  datePicker: { width: '100%', height: 160 },
  pickerHint: { fontSize: 12, color: '#9ca3af', textAlign: 'center', marginTop: 8, lineHeight: 17 },

  // Geschlecht
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

  // Zyklus / Aktivität
  phaseRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1.5, borderColor: '#e5e7eb' },
  phaseRowActive: { borderColor: BRAND, backgroundColor: BRAND_LIGHT },
  phaseLabel: { fontSize: 15, color: '#6b7280', fontWeight: '500' },
  phaseLabelActive: { color: BRAND_DARK, fontWeight: '700' },
  phaseDays: { fontSize: 12, color: '#9ca3af', marginTop: 2 },

  // Körpermaße
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statsCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: '#e5e7eb' },
  statsCardLabel: { fontSize: 10, fontWeight: '700', color: '#9ca3af', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 },
  statsInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  unitLabel: { fontSize: 16, fontWeight: '700', color: '#9ca3af', width: 28 },

  bmiBox: { borderWidth: 2, borderRadius: 16, padding: 16, alignItems: 'center', backgroundColor: '#fff' },
  bmiLabel: { fontSize: 11, fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1 },
  bmiValue: { fontSize: 40, fontWeight: '800', letterSpacing: -1 },
  bmiCategory: { fontSize: 14, fontWeight: '700', marginTop: 2 },

  // Aktivität
  tdeePreview: { backgroundColor: BRAND_LIGHT, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8 },
  tdeePreviewLabel: { fontSize: 12, color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 },
  tdeePreviewValue: { fontSize: 22, fontWeight: '800', color: BRAND, marginTop: 4 },

  // Body-Auswahl
  bodyRow: { flexDirection: 'row', gap: 6 },
  bodyCard: {
    flex: 1, alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, paddingVertical: 10,
    paddingHorizontal: 2, borderWidth: 1.5, borderColor: '#e5e7eb',
  },
  bodyCardActive: { borderColor: BRAND, backgroundColor: BRAND_LIGHT },
  bodyLabel: { fontSize: 9, color: '#6b7280', fontWeight: '600', textAlign: 'center', marginTop: 6, lineHeight: 13 },
  bodyBmi: { fontSize: 8, color: '#9ca3af', textAlign: 'center', marginTop: 2 },
  bodyInfoBox: { marginTop: 16, backgroundColor: BRAND_LIGHT, borderRadius: 12, padding: 12, alignItems: 'center' },
  bodyInfoText: { fontSize: 13, color: BRAND_DARK, fontWeight: '700' },

  // Zusammenfassung
  summaryBox: { width: '100%', backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 32, gap: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 13, color: '#9ca3af', fontWeight: '500' },
  summaryValue: { fontSize: 13, color: '#1a1a2e', fontWeight: '700', maxWidth: '55%', textAlign: 'right' },

  primaryBtn: {
    backgroundColor: BRAND, padding: 18, borderRadius: 16, alignItems: 'center', marginTop: 16,
    shadowColor: BRAND, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
  },
  primaryBtnDisabled: { backgroundColor: '#d1d5db', shadowOpacity: 0 },
  primaryBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
})