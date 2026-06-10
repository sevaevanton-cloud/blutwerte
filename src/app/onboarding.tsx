// src/app/onboarding.tsx
import DateTimePicker from '@react-native-community/datetimepicker'
import { router } from 'expo-router'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import React, { useRef, useState } from 'react'
import {
  Animated, KeyboardAvoidingView, PanResponder, Platform,
  ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native'
import { db } from '../config/firebase'
import { BRAND, BRAND_DARK, BRAND_LIGHT } from '../constants/theme'
import { useAuth } from '../context/AuthContext'
import { ActivityLevel, FitnessGoal, Gender, useProfile } from '../context/ProfileContext'
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

// ─── Supplement-Einheiten ─────────────────────────────────────────────────────
const SUPP_UNITS = ['mg', 'g', 'μg', 'ml', 'IE', 'Kapseln', 'Tabletten']
const SUPP_TIMES = [
  { id: 'morning', label: '🌅 Morgens' },
  { id: 'midday',  label: '☀️ Mittags' },
  { id: 'evening', label: '🌆 Abends' },
  { id: 'night',   label: '🌙 Nachts' },
]

interface OnboardingSupplement {
  name: string
  dose: string
  unit: string
  time: string
}

// ─── KFA-Hilfsfunktionen ──────────────────────────────────────────────────────
const THUMB_W = 28

function getKfaCategory(kfa: number, gender: 'male' | 'female') {
  if (gender === 'male') {
    if (kfa <= 8)  return { label: 'Wettkampf-Form', color: '#93c5fd', desc: 'Extrem definiert, Venen sichtbar' }
    if (kfa <= 13) return { label: 'Athletisch',     color: '#34d399', desc: 'Stark definiert, klare Muskeln' }
    if (kfa <= 17) return { label: 'Fit & Schlank',  color: '#4ade80', desc: 'Deutliche Muskeln, kein sichtbares Fett' }
    if (kfa <= 24) return { label: 'Normalbereich',  color: '#a3e635', desc: 'Gesunder Bereich, leichte Definition' }
    if (kfa <= 30) return { label: 'Erhöht',         color: '#fbbf24', desc: 'Kaum Muskeldefinition sichtbar' }
    return               { label: 'Hoch',            color: '#f87171', desc: 'Kein Muskelrelief sichtbar' }
  } else {
    if (kfa <= 17) return { label: 'Wettkampf-Form', color: '#93c5fd', desc: 'Extrem definiert, sehr schlank' }
    if (kfa <= 22) return { label: 'Athletisch',     color: '#34d399', desc: 'Definiert, sportliche Figur' }
    if (kfa <= 28) return { label: 'Fit & Schlank',  color: '#4ade80', desc: 'Gesunder Bereich, gute Form' }
    if (kfa <= 35) return { label: 'Normalbereich',  color: '#a3e635', desc: 'Gesunder Bereich' }
    if (kfa <= 40) return { label: 'Erhöht',         color: '#fbbf24', desc: 'Erhöhter Körperfettanteil' }
    return               { label: 'Hoch',            color: '#f87171', desc: 'Hoher Körperfettanteil' }
  }
}

// ─── KFA Slider-Komponente ────────────────────────────────────────────────────
function KFASlider({
  kfa, onChange, gender,
}: { kfa: number; onChange: (v: number) => void; gender: 'male' | 'female' }) {
  const min = gender === 'male' ? 4 : 13
  const max = gender === 'male' ? 36 : 44

  const trackWidthRef = useRef(300)
  const onChangeRef   = useRef(onChange)
  onChangeRef.current = onChange

  const getVal = (x: number) => {
    const tw = trackWidthRef.current
    const clamped = Math.max(0, Math.min(x, tw))
    return Math.round(min + (clamped / tw) * (max - min))
  }

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  () => true,
      onPanResponderGrant: (e) => onChangeRef.current(getVal(e.nativeEvent.locationX)),
      onPanResponderMove:  (e) => onChangeRef.current(getVal(e.nativeEvent.locationX)),
    })
  ).current

  const cat = getKfaCategory(kfa, gender)
  const fillRatio = Math.max(0, Math.min(1, (kfa - min) / (max - min)))

  // KFA-Referenzbereiche als Markierungen
  const ranges = gender === 'male'
    ? [
        { pct: 0,    label: `${min}%` },
        { pct: (13-min)/(max-min), label: '13%' },
        { pct: (17-min)/(max-min), label: '17%' },
        { pct: (24-min)/(max-min), label: '24%' },
        { pct: 1,    label: `${max}%` },
      ]
    : [
        { pct: 0,    label: `${min}%` },
        { pct: (22-min)/(max-min), label: '22%' },
        { pct: (28-min)/(max-min), label: '28%' },
        { pct: (35-min)/(max-min), label: '35%' },
        { pct: 1,    label: `${max}%` },
      ]

  return (
    <View style={kfaStyles.wrapper}>
      {/* KFA-Anzeige */}
      <View style={kfaStyles.header}>
        <View>
          <Text style={[kfaStyles.kfaValue, { color: cat.color }]}>{kfa}%<Text style={kfaStyles.kfaUnit}> KFA</Text></Text>
          <Text style={kfaStyles.desc}>{cat.desc}</Text>
        </View>
        <View style={[kfaStyles.badge, { backgroundColor: cat.color + '20', borderColor: cat.color + '60' }]}>
          <Text style={[kfaStyles.badgeText, { color: cat.color }]}>{cat.label}</Text>
        </View>
      </View>

      {/* Slider-Track */}
      <View style={kfaStyles.sliderContainer}>
        <View
          style={kfaStyles.track}
          onLayout={e => { trackWidthRef.current = e.nativeEvent.layout.width }}
          {...panResponder.panHandlers}
        >
          {/* Hintergrund-Gradient (simuliert durch farbige Bereiche) */}
          <View style={[kfaStyles.trackBg, { backgroundColor: cat.color + '30' }]} />
          {/* Fill */}
          <View style={[kfaStyles.fill, {
            width: `${Math.max(2, fillRatio * 100)}%` as any,
            backgroundColor: cat.color,
          }]} />
          {/* Thumb */}
          <View style={[kfaStyles.thumb, {
            left: `${Math.max(0, Math.min(fillRatio * 100, 94))}%` as any,
            borderColor: cat.color,
          }]} />
        </View>

        {/* Labels */}
        <View style={kfaStyles.labelRow}>
          {ranges.map((r, i) => (
            <Text
              key={i}
              style={[kfaStyles.rangeLabel, { left: `${r.pct * 100}%` as any }]}
              numberOfLines={1}
            >
              {r.label}
            </Text>
          ))}
        </View>
      </View>

      {/* ± Feinsteuerung */}
      <View style={kfaStyles.fineRow}>
        <TouchableOpacity
          style={kfaStyles.fineBtn}
          onPress={() => onChange(Math.max(min, kfa - 1))}
        >
          <Text style={kfaStyles.fineBtnText}>−</Text>
        </TouchableOpacity>
        <Text style={kfaStyles.fineHint}>Tippe auf den Balken oder nutze − / + zum Feintuning</Text>
        <TouchableOpacity
          style={kfaStyles.fineBtn}
          onPress={() => onChange(Math.min(max, kfa + 1))}
        >
          <Text style={kfaStyles.fineBtnText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const kfaStyles = StyleSheet.create({
  wrapper: { gap: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  kfaValue: { fontSize: 36, fontWeight: '800', letterSpacing: -1 },
  kfaUnit: { fontSize: 18, fontWeight: '600' },
  desc: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  badge: {
    borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6,
  },
  badgeText: { fontSize: 13, fontWeight: '700' },

  sliderContainer: { gap: 8 },
  track: {
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e5e7eb',
    overflow: 'hidden',
    justifyContent: 'center',
    position: 'relative',
  },
  trackBg: {
    position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
  },
  fill: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    borderRadius: 18,
  },
  thumb: {
    position: 'absolute',
    width: THUMB_W, height: THUMB_W,
    borderRadius: THUMB_W / 2,
    backgroundColor: '#fff',
    borderWidth: 2.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
    top: 4,
  },
  labelRow: { position: 'relative', height: 16 },
  rangeLabel: { position: 'absolute', fontSize: 10, color: '#9ca3af', fontWeight: '600' },

  fineRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  fineBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e5e7eb',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  fineBtnText: { fontSize: 22, color: '#1a1a2e', fontWeight: '300', lineHeight: 26 },
  fineHint: { flex: 1, fontSize: 11, color: '#9ca3af', textAlign: 'center', lineHeight: 15 },
})

// ─── Features Step ────────────────────────────────────────────────────────────
function FeaturesStep() {
  const trackers = [
    { emoji: '🥗', label: 'Ernährung',   desc: 'Nährstoffmangel erkennen',   color: '#34d399' },
    { emoji: '💊', label: 'Supplements', desc: 'Einfluss auf Blutwerte',      color: '#fbbf24' },
    { emoji: '🏋️', label: 'Training',    desc: 'Sport & Laborwerte',          color: '#f87171' },
  ]
  return (
    <View style={styles.stepContent}>
      <View style={featureStyles.hero}>
        <Text style={featureStyles.heroEmoji}>🧬</Text>
        <Text style={featureStyles.heroTitle}>KI-Analyse deiner Blutwerte</Text>
        <Text style={featureStyles.heroSubtitle}>
          Blutwerte sind oft schwer zu verstehen – Ärzte haben selten Zeit,
          jeden Wert einzeln zu erklären. Blutwerte löst genau das.
        </Text>
      </View>
      <View style={featureStyles.problemBox}>
        <View style={featureStyles.problemRow}>
          <Text style={featureStyles.problemIcon}>😕</Text>
          <Text style={featureStyles.problemText}>
            „Mein Eisenwert ist leicht erhöht – aber was bedeutet das für mich?"
          </Text>
        </View>
        <View style={featureStyles.arrow}>
          <Text style={featureStyles.arrowText}>↓ KI-Analyse</Text>
        </View>
        <View style={featureStyles.solutionRow}>
          <Text style={featureStyles.solutionIcon}>✅</Text>
          <Text style={featureStyles.solutionText}>
            Klare Erklärung, mögliche Ursachen und konkrete Handlungsempfehlungen –
            auf dich persönlich zugeschnitten.
          </Text>
        </View>
      </View>
      <View style={featureStyles.synergyHeader}>
        <Text style={featureStyles.synergyTitle}>🔗 Noch bessere Ergebnisse</Text>
        <Text style={featureStyles.synergySubtitle}>
          Je mehr Daten du pflegst, desto präziser wird die Analyse.
          Die KI bezieht alle Tracker mit ein:
        </Text>
      </View>
      <View style={featureStyles.trackerRow}>
        {trackers.map(t => (
          <View key={t.label} style={[featureStyles.trackerCard, { borderColor: t.color + '40' }]}>
            <View style={[featureStyles.trackerDot, { backgroundColor: t.color + '20' }]}>
              <Text style={featureStyles.trackerEmoji}>{t.emoji}</Text>
            </View>
            <Text style={featureStyles.trackerLabel}>{t.label}</Text>
            <Text style={featureStyles.trackerDesc}>{t.desc}</Text>
          </View>
        ))}
      </View>
      <Text style={featureStyles.hint}>
        Du kannst direkt loslegen – die Tracker sind optional, aber empfohlen.
      </Text>
    </View>
  )
}

const featureStyles = StyleSheet.create({
  hero: {
    backgroundColor: BRAND_LIGHT, borderRadius: 20, padding: 20,
    alignItems: 'center', marginBottom: 16, borderWidth: 1.5, borderColor: BRAND + '40',
  },
  heroEmoji: { fontSize: 44, marginBottom: 10 },
  heroTitle: { fontSize: 20, fontWeight: '800', color: '#1a1a2e', textAlign: 'center', marginBottom: 8, lineHeight: 26 },
  heroSubtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 20 },
  problemBox: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  problemRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  problemIcon: { fontSize: 20 },
  problemText: { flex: 1, fontSize: 13, color: '#6b7280', lineHeight: 19, fontStyle: 'italic' },
  arrow: { alignItems: 'center', marginBottom: 10 },
  arrowText: { fontSize: 13, fontWeight: '700', color: BRAND },
  solutionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  solutionIcon: { fontSize: 18 },
  solutionText: { flex: 1, fontSize: 13, color: '#1a1a2e', lineHeight: 19, fontWeight: '500' },
  synergyHeader: { marginBottom: 12 },
  synergyTitle: { fontSize: 16, fontWeight: '800', color: '#1a1a2e', marginBottom: 4 },
  synergySubtitle: { fontSize: 13, color: '#6b7280', lineHeight: 19 },
  trackerRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  trackerCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 12,
    alignItems: 'center', borderWidth: 1.5,
  },
  trackerDot: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  trackerEmoji: { fontSize: 20 },
  trackerLabel: { fontSize: 12, fontWeight: '700', color: '#1a1a2e', marginBottom: 2, textAlign: 'center' },
  trackerDesc: { fontSize: 10, color: '#9ca3af', textAlign: 'center', lineHeight: 14 },
  hint: { fontSize: 12, color: '#9ca3af', textAlign: 'center', lineHeight: 17 },
})

// ─── Steps Definition ─────────────────────────────────────────────────────────
const ALL_STEPS = [
  'welcome', 'goal', 'features',
  'name', 'birthyear', 'gender', 'cycle', 'body_stats', 'activity', 'body_status',
  'supplements_onboarding', 'done',
]
// Schritte, die NICHT im Fortschrittsbalken zählen
const HIDDEN_STEPS = new Set(['welcome', 'goal', 'features', 'done'])

// ─── Hauptkomponente ──────────────────────────────────────────────────────────
export default function Onboarding() {
  const { updateProfile } = useProfile()
  const { uid } = useAuth()

  const [step, setStep]             = useState(0)
  const [fitnessGoal, setFitnessGoal] = useState<FitnessGoal | null>(null)
  const [name, setName]             = useState('')
  const [gender, setGender]         = useState<Gender | null>(null)
  const [birthDate, setBirthDate]   = useState<Date>(DEFAULT_BIRTH_DATE)
  const [cyclePhase, setCyclePhase] = useState<string>('unknown')
  const [height, setHeight]         = useState('')
  const [weight, setWeight]         = useState('')
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | null>(null)
  const [kfa, setKfa]               = useState(18) // KFA in %

  // Supplement-Onboarding
  const [suppName, setSuppName]     = useState('')
  const [suppDose, setSuppDose]     = useState('')
  const [suppUnit, setSuppUnit]     = useState('mg')
  const [suppTime, setSuppTime]     = useState('morning')
  const [supplements, setSupplements] = useState<OnboardingSupplement[]>([])

  const fadeAnim  = useRef(new Animated.Value(1)).current
  const slideAnim = useRef(new Animated.Value(0)).current

  const effectiveSteps = gender === 'female'
    ? ALL_STEPS
    : ALL_STEPS.filter(s => s !== 'cycle')

  const genderKey: 'male' | 'female' = gender === 'female' ? 'female' : 'male'

  // Fortschritt: nur Profil-Schritte zählen
  const profileSteps = effectiveSteps.filter(s => !HIDDEN_STEPS.has(s))
  const currentStep  = effectiveSteps[step]
  const profileStepIndex = profileSteps.indexOf(currentStep)
  const progress = profileSteps.length > 0 ? (profileStepIndex + 1) / profileSteps.length : 0

  const animate = (cb: () => void) => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 0,   duration: 180, useNativeDriver: true }),
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

  const addSupplement = () => {
    if (!suppName.trim()) return
    setSupplements(prev => [...prev, {
      name: suppName.trim(),
      dose: suppDose.trim(),
      unit: suppUnit,
      time: suppTime,
    }])
    setSuppName('')
    setSuppDose('')
  }

  const removeSupplement = (index: number) => {
    setSupplements(prev => prev.filter((_, i) => i !== index))
  }

  const handleFinish = async () => {
    // Profil speichern
    await updateProfile({
      name: name.trim(),
      gender,
      birthYear: birthDate.getFullYear(),
      cyclePhase: gender === 'female' ? (cyclePhase as any) : 'unknown',
      height: height ? parseFloat(height.replace(',', '.')) : null,
      weight: weight ? parseFloat(weight.replace(',', '.')) : null,
      activityLevel,
      bodyStatus: kfa,
      bodyGoal: null,
      fitnessGoal,
    })

    // Supplements in Firestore speichern
    if (uid && supplements.length > 0) {
      const timeLabel = { morning: 'Morgens', midday: 'Mittags', evening: 'Abends', night: 'Nachts' }
      await Promise.all(
        supplements.map(s =>
          addDoc(collection(db, 'users', uid, 'supplements'), {
            name: s.name,
            dose: s.dose ? parseFloat(s.dose.replace(',', '.')) : null,
            unit: s.unit,
            time: timeLabel[s.time as keyof typeof timeLabel] ?? s.time,
            createdAt: serverTimestamp(),
          })
        )
      )
    }

    router.replace('/(tabs)/home')
  }

  const previewTDEE = calculateTDEE({
    gender,
    birthYear: birthDate.getFullYear(),
    height: height ? parseFloat(height.replace(',', '.')) : null,
    weight: weight ? parseFloat(weight.replace(',', '.')) : null,
    activityLevel,
  })

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 'goal':       return fitnessGoal !== null
      case 'name':       return name.trim().length >= 2
      case 'birthyear':  return true
      case 'gender':     return gender !== null
      case 'body_stats': return height.trim().length > 0 && weight.trim().length > 0
      case 'activity':   return activityLevel !== null
      default:           return true
    }
  }

  const isLastBeforeDone = currentStep === effectiveSteps[effectiveSteps.length - 2]

  // Fitness-Ziele
  const GOALS: { id: FitnessGoal; emoji: string; title: string; desc: string; color: string }[] = [
    { id: 'lose_fat',          emoji: '🔥', title: 'Körperfett verlieren',   desc: 'Gesund abnehmen & Fett reduzieren',         color: '#f87171' },
    { id: 'build_muscle',      emoji: '💪', title: 'Muskeln aufbauen',        desc: 'Muskelmasse & Kraft steigern',               color: '#84a7ff' },
    { id: 'improve_health',    emoji: '❤️', title: 'Gesundheit verbessern',   desc: 'Blutwerte & Vitalwerte optimieren',          color: '#34d399' },
    { id: 'boost_performance', emoji: '⚡', title: 'Leistung steigern',       desc: 'Sport- & Alltagsperformance maximieren',     color: '#fbbf24' },
    { id: 'maintain',          emoji: '⚖️', title: 'Gewicht & Gesundheit halten', desc: 'Aktuellen Stand erhalten & festigen',   color: '#a78bfa' },
  ]

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Fortschrittsbalken – nur für Profil-Schritte */}
        {!HIDDEN_STEPS.has(currentStep) && (
          <View style={styles.progressContainer}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
            </View>
            <Text style={styles.progressText}>
              {profileStepIndex + 1} / {profileSteps.length}
            </Text>
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

          {/* ── Ziel ── */}
          {currentStep === 'goal' && (
            <View style={styles.stepContent}>
              <Text style={styles.stepEmoji}>🎯</Text>
              <Text style={styles.stepTitle}>Was ist dein Ziel?</Text>
              <Text style={styles.stepSubtitle}>
                Dein Hauptziel hilft uns, die KI-Analyse und Empfehlungen gezielt auf dich anzupassen.
              </Text>
              <View style={goalStyles.grid}>
                {GOALS.map(g => (
                  <TouchableOpacity
                    key={g.id}
                    style={[
                      goalStyles.card,
                      fitnessGoal === g.id && { borderColor: g.color, backgroundColor: g.color + '12' },
                    ]}
                    onPress={() => setFitnessGoal(g.id)}
                    activeOpacity={0.8}
                  >
                    <View style={[goalStyles.iconWrap, { backgroundColor: g.color + '20' }]}>
                      <Text style={goalStyles.icon}>{g.emoji}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[goalStyles.title, fitnessGoal === g.id && { color: g.color }]}>
                        {g.title}
                      </Text>
                      <Text style={goalStyles.desc}>{g.desc}</Text>
                    </View>
                    <View style={[styles.radio, fitnessGoal === g.id && { borderColor: g.color }]}>
                      {fitnessGoal === g.id && <View style={[styles.radioDot, { backgroundColor: g.color }]} />}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* ── Features ── */}
          {currentStep === 'features' && <FeaturesStep />}

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
                    onPress={() => {
                      setGender(g.id as Gender)
                      // KFA-Standardwert je Geschlecht setzen
                      setKfa(g.id === 'female' ? 25 : 18)
                    }}
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

          {/* ── Körperdaten (ohne BMI) ── */}
          {currentStep === 'body_stats' && (
            <View style={styles.stepContent}>
              <Text style={styles.stepEmoji}>📏</Text>
              <Text style={styles.stepTitle}>Körpermaße</Text>
              <Text style={styles.stepSubtitle}>
                Größe und Gewicht werden für dein Kalorienziel und die Analyse benötigt.
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

          {/* ── Körperfettanteil (KFA-Slider) ── */}
          {currentStep === 'body_status' && (
            <View style={styles.stepContent}>
              <Text style={styles.stepEmoji}>🪞</Text>
              <Text style={styles.stepTitle}>Körperfettanteil</Text>
              <Text style={styles.stepSubtitle}>
                Schätze deinen aktuellen KFA ein. Das ist aussagekräftiger als der BMI
                und wird direkt in der KI-Analyse berücksichtigt.
              </Text>

              <View style={kfaStepStyles.card}>
                <KFASlider
                  kfa={kfa}
                  onChange={setKfa}
                  gender={genderKey}
                />
              </View>

              {/* Referenz-Tabelle */}
              <View style={kfaStepStyles.refBox}>
                <Text style={kfaStepStyles.refTitle}>
                  Referenzwerte ({genderKey === 'male' ? 'Männer' : 'Frauen'})
                </Text>
                {(genderKey === 'male'
                  ? [
                      { range: '4–8%',   label: 'Wettkampf-Form', color: '#93c5fd' },
                      { range: '9–13%',  label: 'Athletisch',     color: '#34d399' },
                      { range: '14–17%', label: 'Fit & Schlank',  color: '#4ade80' },
                      { range: '18–24%', label: 'Normalbereich',  color: '#a3e635' },
                      { range: '25–30%', label: 'Erhöht',         color: '#fbbf24' },
                      { range: '> 30%',  label: 'Hoch',           color: '#f87171' },
                    ]
                  : [
                      { range: '13–17%', label: 'Wettkampf-Form', color: '#93c5fd' },
                      { range: '18–22%', label: 'Athletisch',     color: '#34d399' },
                      { range: '23–28%', label: 'Fit & Schlank',  color: '#4ade80' },
                      { range: '29–35%', label: 'Normalbereich',  color: '#a3e635' },
                      { range: '36–40%', label: 'Erhöht',         color: '#fbbf24' },
                      { range: '> 40%',  label: 'Hoch',           color: '#f87171' },
                    ]
                ).map(r => (
                  <View key={r.range} style={kfaStepStyles.refRow}>
                    <View style={[kfaStepStyles.refDot, { backgroundColor: r.color }]} />
                    <Text style={kfaStepStyles.refRange}>{r.range}</Text>
                    <Text style={kfaStepStyles.refLabel}>{r.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* ── Supplements Onboarding ── */}
          {currentStep === 'supplements_onboarding' && (
            <View style={styles.stepContent}>
              <Text style={styles.stepEmoji}>💊</Text>
              <Text style={styles.stepTitle}>Aktuelle Supplements</Text>
              <Text style={styles.stepSubtitle}>
                Trägst du Supplements direkt ein, werden sie heute noch in der KI-Analyse berücksichtigt
                und erscheinen im täglichen Tracker zum Abhaken.
              </Text>

              {/* Eingabe */}
              <View style={suppStyles.formCard}>
                <Text style={suppStyles.formLabel}>SUPPLEMENT HINZUFÜGEN</Text>
                <TextInput
                  style={styles.bigInput}
                  value={suppName}
                  onChangeText={setSuppName}
                  placeholder="Name (z.B. Vitamin D3, Magnesium, …)"
                  placeholderTextColor="#9ca3af"
                  returnKeyType="next"
                />
                <View style={suppStyles.doseRow}>
                  <TextInput
                    style={[styles.bigInput, { flex: 1 }]}
                    value={suppDose}
                    onChangeText={setSuppDose}
                    placeholder="Dosierung"
                    placeholderTextColor="#9ca3af"
                    keyboardType="decimal-pad"
                    maxLength={8}
                  />
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={suppStyles.unitScroll}>
                    <View style={suppStyles.unitRow}>
                      {SUPP_UNITS.map(u => (
                        <TouchableOpacity
                          key={u}
                          style={[suppStyles.unitChip, suppUnit === u && suppStyles.unitChipActive]}
                          onPress={() => setSuppUnit(u)}
                        >
                          <Text style={[suppStyles.unitChipText, suppUnit === u && suppStyles.unitChipTextActive]}>
                            {u}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </View>

                {/* Zeitauswahl */}
                <View style={suppStyles.timeRow}>
                  {SUPP_TIMES.map(t => (
                    <TouchableOpacity
                      key={t.id}
                      style={[suppStyles.timeChip, suppTime === t.id && suppStyles.timeChipActive]}
                      onPress={() => setSuppTime(t.id)}
                    >
                      <Text style={[suppStyles.timeChipText, suppTime === t.id && suppStyles.timeChipTextActive]}>
                        {t.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity
                  style={[suppStyles.addBtn, !suppName.trim() && suppStyles.addBtnDisabled]}
                  onPress={addSupplement}
                  disabled={!suppName.trim()}
                >
                  <Text style={suppStyles.addBtnText}>+ Hinzufügen</Text>
                </TouchableOpacity>
              </View>

              {/* Liste hinzugefügter Supplements */}
              {supplements.length > 0 && (
                <View style={suppStyles.list}>
                  {supplements.map((s, i) => (
                    <View key={i} style={suppStyles.listItem}>
                      <View style={suppStyles.listDot} />
                      <View style={{ flex: 1 }}>
                        <Text style={suppStyles.listName}>{s.name}</Text>
                        <Text style={suppStyles.listDetail}>
                          {s.dose ? `${s.dose} ${s.unit} · ` : ''}
                          {SUPP_TIMES.find(t => t.id === s.time)?.label ?? s.time}
                        </Text>
                      </View>
                      <TouchableOpacity onPress={() => removeSupplement(i)} style={suppStyles.removeBtn}>
                        <Text style={suppStyles.removeBtnText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {supplements.length === 0 && (
                <Text style={suppStyles.emptyHint}>
                  Keine Supplements? Einfach überspringen – du kannst sie jederzeit in der App nachtragen.
                </Text>
              )}
            </View>
          )}

          {/* ── Fertig ── */}
          {currentStep === 'done' && (
            <View style={styles.centerContent}>
              <Text style={styles.bigEmoji}>🎉</Text>
              <Text style={styles.welcomeTitle}>Alles bereit,{'\n'}{name}!</Text>
              <Text style={styles.welcomeSubtitle}>
                Dein Profil ist eingerichtet. Du kannst jetzt Blutwerte eintragen und
                deine erste KI-Analyse starten.
              </Text>
              <View style={styles.summaryBox}>
                {[
                  ['🎯 Ziel', GOALS.find(g => g.id === fitnessGoal)?.title ?? '–'],
                  ['👤 Name', name],
                  ['🎂 Jahrgang', String(birthDate.getFullYear())],
                  ['⚧ Geschlecht', gender === 'male' ? '♂ Männlich' : gender === 'female' ? '♀ Weiblich' : '⚧ Divers'],
                  previewTDEE ? ['🔥 Kalorienbedarf', `${previewTDEE.toLocaleString('de-DE')} kcal`] : null,
                  ['🪞 KFA', `${kfa}% – ${getKfaCategory(kfa, genderKey).label}`],
                  supplements.length > 0 ? ['💊 Supplements', `${supplements.length} eingetragen`] : null,
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
          <View>
            <TouchableOpacity
              style={[styles.primaryBtn, !canProceed() && styles.primaryBtnDisabled]}
              onPress={canProceed() ? goNext : undefined}
              activeOpacity={canProceed() ? 0.85 : 1}
            >
              <Text style={styles.primaryBtnText}>
                {isLastBeforeDone ? 'Fertig ✓' : 'Weiter →'}
              </Text>
            </TouchableOpacity>
            {/* Überspringen für optionale Schritte */}
            {(currentStep === 'supplements_onboarding' || currentStep === 'features') && (
              <TouchableOpacity onPress={goNext} style={styles.skipBtn}>
                <Text style={styles.skipBtnText}>Überspringen</Text>
              </TouchableOpacity>
            )}
          </View>
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
  stepSubtitle: { fontSize: 15, color: '#6b7280', lineHeight: 22, marginBottom: 24 },

  bigInput: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    fontSize: 18, color: '#1a1a2e', borderWidth: 1.5, borderColor: '#e5e7eb',
    shadowColor: BRAND, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },

  pickerCard: {
    backgroundColor: '#fff', borderRadius: 20, paddingTop: 20, paddingBottom: 12,
    paddingHorizontal: 16, borderWidth: 1.5, borderColor: BRAND,
    shadowColor: BRAND, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 4,
    alignItems: 'center',
  },
  pickerLabel: { fontSize: 11, fontWeight: '700', color: BRAND, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4 },
  datePicker: { width: '100%', height: 160 },
  pickerHint: { fontSize: 12, color: '#9ca3af', textAlign: 'center', marginTop: 8, lineHeight: 17 },

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
  phaseDays: { fontSize: 12, color: '#9ca3af', marginTop: 2 },

  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statsCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: '#e5e7eb' },
  statsCardLabel: { fontSize: 10, fontWeight: '700', color: '#9ca3af', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 },
  statsInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  unitLabel: { fontSize: 16, fontWeight: '700', color: '#9ca3af', width: 28 },

  tdeePreview: { backgroundColor: BRAND_LIGHT, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8 },
  tdeePreviewLabel: { fontSize: 12, color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 },
  tdeePreviewValue: { fontSize: 22, fontWeight: '800', color: BRAND, marginTop: 4 },

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

  skipBtn: { alignItems: 'center', paddingTop: 14, paddingBottom: 4 },
  skipBtnText: { fontSize: 14, color: '#9ca3af', fontWeight: '600' },
})

const goalStyles = StyleSheet.create({
  grid: { gap: 10 },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 16, padding: 16, gap: 14, borderWidth: 1.5, borderColor: '#e5e7eb',
  },
  iconWrap: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 24 },
  title: { fontSize: 15, fontWeight: '700', color: '#1a1a2e', marginBottom: 2 },
  desc: { fontSize: 12, color: '#9ca3af', lineHeight: 17 },
})

const bodyStatsStyles = StyleSheet.create({
  hint: {
    flexDirection: 'row', backgroundColor: '#f0f9ff', borderRadius: 12,
    padding: 12, gap: 8, borderWidth: 1, borderColor: '#bae6fd', alignItems: 'flex-start',
  },
  hintIcon: { fontSize: 14 },
  hintText: { flex: 1, fontSize: 12, color: '#0369a1', lineHeight: 18 },
})

const kfaStepStyles = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: 20, padding: 20,
    borderWidth: 1.5, borderColor: '#e5e7eb', marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  refBox: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#e5e7eb', gap: 8,
  },
  refTitle: { fontSize: 12, fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  refRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  refDot: { width: 10, height: 10, borderRadius: 5 },
  refRange: { fontSize: 13, fontWeight: '700', color: '#1a1a2e', width: 60 },
  refLabel: { fontSize: 13, color: '#6b7280' },
})

const suppStyles = StyleSheet.create({
  formCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    borderWidth: 1.5, borderColor: '#e5e7eb', gap: 12, marginBottom: 16,
  },
  formLabel: { fontSize: 11, fontWeight: '700', color: '#9ca3af', letterSpacing: 1.2, textTransform: 'uppercase' },
  doseRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  unitScroll: { flex: 1 },
  unitRow: { flexDirection: 'row', gap: 6, paddingRight: 4 },
  unitChip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb',
  },
  unitChipActive: { backgroundColor: BRAND_LIGHT, borderColor: BRAND },
  unitChipText: { fontSize: 13, color: '#6b7280', fontWeight: '600' },
  unitChipTextActive: { color: BRAND_DARK },

  timeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timeChip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb',
  },
  timeChipActive: { backgroundColor: BRAND_LIGHT, borderColor: BRAND },
  timeChipText: { fontSize: 13, color: '#6b7280', fontWeight: '600' },
  timeChipTextActive: { color: BRAND_DARK, fontWeight: '700' },

  addBtn: {
    backgroundColor: BRAND, borderRadius: 12, padding: 14,
    alignItems: 'center',
  },
  addBtnDisabled: { backgroundColor: '#e5e7eb' },
  addBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  list: {
    backgroundColor: '#fff', borderRadius: 16, borderWidth: 1.5, borderColor: '#e5e7eb',
    overflow: 'hidden', marginBottom: 8,
  },
  listItem: {
    flexDirection: 'row', alignItems: 'center', padding: 14,
    borderBottomWidth: 1, borderBottomColor: '#f9fafb', gap: 10,
  },
  listDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: BRAND },
  listName: { fontSize: 14, fontWeight: '600', color: '#1a1a2e' },
  listDetail: { fontSize: 12, color: '#9ca3af', marginTop: 1 },
  removeBtn: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: '#fef2f2',
    alignItems: 'center', justifyContent: 'center',
  },
  removeBtnText: { fontSize: 12, color: '#f87171', fontWeight: '700' },

  emptyHint: { fontSize: 13, color: '#9ca3af', textAlign: 'center', lineHeight: 19, paddingVertical: 8 },
})
