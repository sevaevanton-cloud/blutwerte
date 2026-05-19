// src/app/(tabs)/home.tsx
import { router } from 'expo-router'
import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore'
import React, { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Svg, { Circle } from 'react-native-svg'
import AddBloodValues from '../../components/add/AddBloodValues'
import AddNutrition from '../../components/add/AddNutrition'
import AddSupplement from '../../components/add/AddSupplement'
import AddTraining from '../../components/add/AddTraining'
import { db } from '../../config/firebase'
import { BLOOD_VALUES } from '../../constants/bloodValues'
import { BRAND, BRAND_LIGHT } from '../../constants/theme'
import { useAuth } from '../../context/AuthContext'
import { useProfile } from '../../context/ProfileContext'

type ModalType = 'blood' | 'nutrition' | 'supplement' | 'training' | null

const MODAL_TITLES: Record<NonNullable<ModalType>, { icon: string; title: string; subtitle: string }> = {
  blood:      { icon: '🩸', title: 'Blutwerte',  subtitle: 'Laborwerte eintragen' },
  nutrition:  { icon: '🥗', title: 'Ernährung',  subtitle: 'Mahlzeit tracken' },
  supplement: { icon: '💊', title: 'Supplement', subtitle: 'Einnahme eintragen' },
  training:   { icon: '🏋️', title: 'Training',   subtitle: 'Einheit erfassen' },
}

const { width } = Dimensions.get('window')

// ── Circular Progress Ring ────────────────────────────────────────
function RingProgress({ value, max, size = 90, stroke = 8, color = BRAND, label, sublabel }: {
  value: number; max: number; size?: number; stroke?: number
  color?: string; label: string; sublabel?: string
}) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const dash = Math.min(value / max, 1) * circ
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <Circle cx={size/2} cy={size/2} r={r} stroke="#f0f0f0" strokeWidth={stroke} fill="none" />
          <Circle cx={size/2} cy={size/2} r={r} stroke={color} strokeWidth={stroke} fill="none"
            strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
            rotation="-90" origin={`${size/2}, ${size/2}`} />
        </Svg>
        <View style={styles.ringCenter}>
          <Text style={[styles.ringValue, { color }]}>{value}</Text>
          {sublabel && <Text style={styles.ringSublabel}>{sublabel}</Text>}
        </View>
      </View>
      <Text style={styles.ringLabel}>{label}</Text>
    </View>
  )
}

// ── Supplement Check Item ─────────────────────────────────────────
function SupplementItem({ name, dose, checked, onToggle }: {
  name: string; dose: string; checked: boolean; onToggle: () => void
}) {
  return (
    <TouchableOpacity style={styles.supplementRow} onPress={onToggle}>
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked && <Text style={styles.checkmark}>✓</Text>}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.supplementName, checked && styles.supplementNameDone]}>{name}</Text>
        <Text style={styles.supplementDose}>{dose}</Text>
      </View>
    </TouchableOpacity>
  )
}

// ── Macro Bar ─────────────────────────────────────────────────────
function MacroBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.min((value / max) * 100, 100)
  return (
    <View style={styles.macroItem}>
      <View style={styles.macroHeader}>
        <Text style={styles.macroLabel}>{label}</Text>
        <Text style={styles.macroValue}>{value}<Text style={styles.macroMax}>/{max}g</Text></Text>
      </View>
      <View style={styles.macroTrack}>
        <View style={[styles.macroFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    </View>
  )
}

// ── Helpers ───────────────────────────────────────────────────────
function countAbnormalValues(values: Record<string, { value: number; unit: string }>, gender: string) {
  let count = 0
  for (const [id, entry] of Object.entries(values)) {
    const def = BLOOD_VALUES.find(b => b.id === id)
    if (!def?.referenceRanges) continue
    const range = def.referenceRanges[gender as 'male' | 'female'] ?? def.referenceRanges.all
    if (!range) continue
    if (entry.value < range.min || entry.value > range.max) count++
  }
  return count
}

// ── Main Component ────────────────────────────────────────────────
export default function Home() {
  const profileContext = useProfile()
  const profile = profileContext.profile
  const { uid } = useAuth()

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeModal, setActiveModal] = useState<ModalType>(null)

  // Data state
  const [lastBloodTest, setLastBloodTest] = useState<{ date: string; abnormal: number; total: number } | null>(null)
  const [supplements, setSupplements] = useState<{ id: string; name: string; dose: string; unit: string; checked: boolean }[]>([])
  const [todayTraining, setTodayTraining] = useState<{ id: string; label: string; duration: number; intensity: string }[]>([])
  const [todayNutrition, setTodayNutrition] = useState<{ calories: number; protein: number; carbs: number; fat: number; fiber: number } | null>(null)

  const today = new Date().toISOString().split('T')[0]

  const loadData = useCallback(async () => {
    if (!uid) return
    try {
      // 1. Letzter Bluttest
      const bloodSnap = await getDocs(
        query(collection(db, 'users', uid, 'bloodTests'), orderBy('createdAt', 'desc'), limit(1))
      )
      if (!bloodSnap.empty) {
        const doc = bloodSnap.docs[0].data()
        const total = Object.keys(doc.values || {}).length
        const abnormal = countAbnormalValues(doc.values || {}, profile.gender ?? 'male')
        setLastBloodTest({ date: doc.date, abnormal, total })
      } else {
        setLastBloodTest(null)
      }

      // 2. Supplements
      const suppSnap = await getDocs(
        query(collection(db, 'users', uid, 'supplements'), orderBy('createdAt', 'desc'))
      )
      setSupplements(prev => {
        const checkedMap = Object.fromEntries(prev.map(s => [s.id, s.checked]))
        return suppSnap.docs.map(d => ({
          id: d.id,
          name: d.data().name,
          dose: `${d.data().dose ?? ''} ${d.data().unit ?? ''}`.trim(),
          unit: d.data().unit ?? '',
          checked: checkedMap[d.id] ?? false,
        }))
      })

      // 3. Heutiges Training
      const trainSnap = await getDocs(
        query(collection(db, 'users', uid, 'training'), where('date', '==', today))
      )
      setTodayTraining(trainSnap.docs.map(d => ({
        id: d.id,
        label: d.data().label,
        duration: d.data().duration,
        intensity: d.data().intensity,
      })))

      // 4. Heutige Ernährung
      const nutritionSnap = await getDocs(
        query(collection(db, 'users', uid, 'nutrition'), where('date', '==', today))
      )
      if (!nutritionSnap.empty) {
        const totals = nutritionSnap.docs.reduce((acc, d) => {
          const data = d.data()
          return {
            calories: acc.calories + (data.calories ?? data.kcal ?? 0),
            protein:  acc.protein  + (data.protein  ?? 0),
            carbs:    acc.carbs    + (data.carbs     ?? 0),
            fat:      acc.fat      + (data.fat       ?? 0),
            fiber:    acc.fiber    + (data.fiber      ?? 0),
          }
        }, { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 })
        setTodayNutrition(totals)
      } else {
        setTodayNutrition(null)
      }
    } catch (e) {
      console.error('Fehler beim Laden:', e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [uid, profile.gender, today])

  useEffect(() => { loadData() }, [loadData])

  const onRefresh = () => { setRefreshing(true); loadData() }
  const toggleSupplement = (id: string) =>
    setSupplements(prev => prev.map(s => s.id === id ? { ...s, checked: !s.checked } : s))

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Guten Morgen'
    if (h < 18) return 'Guten Tag'
    return 'Guten Abend'
  }

  const dateStr = new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })
  const supplementsDone = supplements.filter(s => s.checked).length
  const calorieGoal = profileContext.calorieGoal
  const { protein: proteinGoal, carbs: carbsGoal, fat: fatGoal, fiber: fiberGoal } = profileContext.macroGoals

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={BRAND} />
      </View>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f7f8fc' }} edges={['top']}>
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND} />}
    >
      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{greeting()}{profile.name ? `, ${profile.name}` : ''} 👋</Text>
          <Text style={styles.date}>{dateStr}</Text>
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{profile.name ? profile.name[0].toUpperCase() : '?'}</Text>
        </View>
      </View>

      {/* ── Bluttest Banner ── */}
      {lastBloodTest ? (
        <TouchableOpacity style={styles.bloodCard} activeOpacity={0.85} onPress={() => router.push('/(tabs)/analysis')}>
          <View style={styles.bloodCardLeft}>
            <Text style={styles.bloodCardLabel}>Letzter Bluttest</Text>
            <Text style={styles.bloodCardDate}>{lastBloodTest.date}</Text>
            {lastBloodTest.abnormal > 0 ? (
              <View style={styles.bloodCardBadge}>
                <Text style={styles.bloodCardBadgeText}>
                  ⚠️  {lastBloodTest.abnormal} von {lastBloodTest.total} Werten auffällig
                </Text>
              </View>
            ) : (
              <View style={[styles.bloodCardBadge, { backgroundColor: 'rgba(52,211,153,0.25)' }]}>
                <Text style={styles.bloodCardBadgeText}>✅ Alle {lastBloodTest.total} Werte im Normbereich</Text>
              </View>
            )}
          </View>
          <Text style={styles.bloodCardArrow}>KI-Analyse →</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={[styles.bloodCard, { backgroundColor: '#f3f4f6' }]} activeOpacity={0.85} onPress={() => setActiveModal('blood')}>
          <View style={styles.bloodCardLeft}>
            <Text style={[styles.bloodCardLabel, { color: '#9ca3af' }]}>Noch kein Bluttest</Text>
            <Text style={[styles.bloodCardDate, { color: '#6b7280' }]}>Jetzt eintragen</Text>
          </View>
          <Text style={[styles.bloodCardArrow, { color: BRAND }]}>+ Hinzufügen →</Text>
        </TouchableOpacity>
      )}

      {/* ── Ernährung ── */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>🥗 Ernährung heute</Text>
          <TouchableOpacity onPress={() => setActiveModal('nutrition')}><Text style={styles.cardAction}>+ Eintragen</Text></TouchableOpacity>
        </View>

        {/* Kalorienkreis + Makros – immer sichtbar */}
        <View style={styles.nutritionMain}>
          <View style={styles.ringWrapper}>
            <RingProgress
              value={todayNutrition?.calories ?? 0}
              max={calorieGoal}
              size={130}
              stroke={13}
              color={BRAND}
              label="kcal"
              sublabel={`/${calorieGoal}`}
            />
          </View>
          <View style={styles.macros}>
            <MacroBar label="Protein"       value={todayNutrition?.protein ?? 0} max={proteinGoal} color="#f87171" />
            <MacroBar label="Kohlenhydrate" value={todayNutrition?.carbs   ?? 0} max={carbsGoal}   color="#fbbf24" />
            <MacroBar label="Fett"          value={todayNutrition?.fat     ?? 0} max={fatGoal}     color="#34d399" />
            <MacroBar label="Ballaststoffe" value={todayNutrition?.fiber   ?? 0} max={fiberGoal}   color="#a78bfa" />
          </View>
        </View>

        {/* Kalorien-Footer – immer sichtbar */}
        <View style={styles.calorieFooter}>
          <View style={styles.calorieInfo}>
            <Text style={styles.calorieInfoValue}>
              {Math.round(todayNutrition?.calories ?? 0).toLocaleString('de-DE')}
            </Text>
            <Text style={styles.calorieInfoLabel}>gegessen</Text>
          </View>
          <View style={styles.calorieDivider} />
          <View style={styles.calorieInfo}>
            <Text style={[styles.calorieInfoValue, { color: BRAND }]}>
              {Math.max(calorieGoal - (todayNutrition?.calories ?? 0), 0).toLocaleString('de-DE')}
            </Text>
            <Text style={styles.calorieInfoLabel}>verbleibend</Text>
          </View>
          <View style={styles.calorieDivider} />
          <View style={styles.calorieInfo}>
            <Text style={styles.calorieInfoValue}>{calorieGoal.toLocaleString('de-DE')}</Text>
            <Text style={styles.calorieInfoLabel}>Ziel</Text>
          </View>
        </View>

        {!todayNutrition && (
          <Text style={styles.emptyStateSub}>Noch keine Mahlzeiten heute – tippe + Eintragen</Text>
        )}
      </View>

      {/* ── Supplements ── */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>💊 Supplements</Text>
          <Text style={styles.cardSubtitle}>{supplementsDone}/{supplements.length} heute</Text>
        </View>
        {supplements.length > 0 ? (
          <>
            <View style={styles.suppProgressTrack}>
              <View style={[styles.suppProgressFill,
                { width: supplements.length > 0 ? `${(supplementsDone / supplements.length) * 100}%` : '0%' }]} />
            </View>
            <View style={styles.supplementList}>
              {supplements.map(s => (
                <SupplementItem key={s.id} name={s.name} dose={s.dose}
                  checked={s.checked} onToggle={() => toggleSupplement(s.id)} />
              ))}
            </View>
          </>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>Keine Supplements eingetragen</Text>
            <Text style={styles.emptyStateSub}>Füge deine Supplements unter + hinzu</Text>
          </View>
        )}
      </View>

      {/* ── Training ── */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>🏋️ Training heute</Text>
          <TouchableOpacity onPress={() => setActiveModal('training')}><Text style={styles.cardAction}>+ Eintragen</Text></TouchableOpacity>
        </View>
        {todayTraining.length > 0 ? (
          <View style={{ gap: 8 }}>
            {todayTraining.map(t => (
              <View key={t.id} style={styles.trainingItem}>
                <View style={styles.trainingItemLeft}>
                  <Text style={styles.trainingItemLabel}>{t.label}</Text>
                  <Text style={styles.trainingItemSub}>{t.intensity}</Text>
                </View>
                <Text style={styles.trainingItemDuration}>{t.duration} Min.</Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>Noch kein Training heute</Text>
            <Text style={styles.emptyStateSub}>Tippe + Eintragen um dein Training hinzuzufügen</Text>
          </View>
        )}
      </View>

      {/* ── Schnellzugriff ── */}
      <View style={styles.quickActions}>
        {([
          { icon: '🩸', label: 'Blutwerte',  modal: 'blood'      },
          { icon: '🥗', label: 'Mahlzeit',   modal: 'nutrition'  },
          { icon: '🏋️', label: 'Training',   modal: 'training'   },
          { icon: '💊', label: 'Supplement', modal: 'supplement' },
        ] as const).map(btn => (
          <TouchableOpacity key={btn.label} style={styles.quickBtn} onPress={() => setActiveModal(btn.modal)}>
            <Text style={styles.quickBtnIcon}>{btn.icon}</Text>
            <Text style={styles.quickBtnLabel}>{btn.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>

    {/* ── Add-Modals ── */}
    <Modal
      visible={!!activeModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setActiveModal(null)}
    >
      <View style={styles.modal}>
        <View style={styles.modalHeader}>
          <View>
            <Text style={styles.modalTitle}>
              {activeModal && `${MODAL_TITLES[activeModal].icon} ${MODAL_TITLES[activeModal].title}`}
            </Text>
            <Text style={styles.modalSubtitle}>
              {activeModal && MODAL_TITLES[activeModal].subtitle}
            </Text>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={() => setActiveModal(null)}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>
        {activeModal === 'blood'      && <AddBloodValues  onClose={() => { setActiveModal(null); loadData() }} />}
        {activeModal === 'nutrition'  && <AddNutrition    onClose={() => { setActiveModal(null); loadData() }} />}
        {activeModal === 'supplement' && <AddSupplement   onClose={() => { setActiveModal(null); loadData() }} />}
        {activeModal === 'training'   && <AddTraining     onClose={() => { setActiveModal(null); loadData() }} />}
      </View>
    </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f8fc' },
  content: { padding: 20, paddingBottom: 100 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f7f8fc' },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, marginTop: 8 },
  greeting: { fontSize: 22, fontWeight: '800', color: '#1a1a2e', letterSpacing: -0.5 },
  date: { fontSize: 13, color: '#9ca3af', marginTop: 2, fontWeight: '500' },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: BRAND, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },

  bloodCard: { backgroundColor: BRAND, borderRadius: 16, padding: 18, marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: BRAND, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 14, elevation: 8 },
  bloodCardLeft: { flex: 1 },
  bloodCardLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  bloodCardDate: { fontSize: 20, color: '#fff', fontWeight: '800', marginTop: 2, marginBottom: 8 },
  bloodCardBadge: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, alignSelf: 'flex-start' },
  bloodCardBadgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  bloodCardArrow: { color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: '700' },

  card: { backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 16, shadowColor: BRAND, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a2e' },
  cardSubtitle: { fontSize: 13, color: '#9ca3af', fontWeight: '500' },
  cardAction: { fontSize: 13, color: BRAND, fontWeight: '700' },

  nutritionMain: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
  ringWrapper: { alignItems: 'center', justifyContent: 'center' },
  ringCenter: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  ringValue: { fontSize: 18, fontWeight: '800' },
  ringSublabel: { fontSize: 10, color: '#9ca3af', fontWeight: '500' },
  ringLabel: { fontSize: 12, color: '#9ca3af', marginTop: 4, fontWeight: '500' },
  macros: { flex: 1, gap: 10 },
  macroItem: {},
  macroHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  macroLabel: { fontSize: 12, color: '#6b7280', fontWeight: '500' },
  macroValue: { fontSize: 12, color: '#1a1a2e', fontWeight: '700' },
  macroMax: { color: '#9ca3af', fontWeight: '400' },
  macroTrack: { height: 5, backgroundColor: '#f3f4f6', borderRadius: 3, overflow: 'hidden' },
  macroFill: { height: '100%', borderRadius: 3 },
  calorieFooter: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 14, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  calorieInfo: { alignItems: 'center' },
  calorieInfoValue: { fontSize: 18, fontWeight: '800', color: '#1a1a2e' },
  calorieInfoLabel: { fontSize: 11, color: '#9ca3af', fontWeight: '500', marginTop: 2 },
  calorieDivider: { width: 1, height: '100%', backgroundColor: '#f3f4f6' },

  suppProgressTrack: { height: 5, backgroundColor: '#f3f4f6', borderRadius: 3, marginBottom: 14, overflow: 'hidden' },
  suppProgressFill: { height: '100%', backgroundColor: BRAND, borderRadius: 3 },
  supplementList: { gap: 2 },
  supplementRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12, borderBottomWidth: 1, borderBottomColor: '#f9f9f9' },
  checkbox: { width: 24, height: 24, borderRadius: 8, borderWidth: 2, borderColor: '#d1d5db', alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: BRAND, borderColor: BRAND },
  checkmark: { color: '#fff', fontSize: 13, fontWeight: '800' },
  supplementName: { fontSize: 14, fontWeight: '600', color: '#1a1a2e' },
  supplementNameDone: { color: '#9ca3af', textDecorationLine: 'line-through' },
  supplementDose: { fontSize: 12, color: '#9ca3af', marginTop: 1 },

  trainingItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: BRAND_LIGHT, borderRadius: 12, padding: 14 },
  trainingItemLeft: {},
  trainingItemLabel: { fontSize: 14, fontWeight: '700', color: '#1a1a2e' },
  trainingItemSub: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  trainingItemDuration: { fontSize: 16, fontWeight: '800', color: BRAND },

  emptyState: { alignItems: 'center', paddingVertical: 20 },
  emptyStateText: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  emptyStateSub: { fontSize: 12, color: '#9ca3af', marginTop: 4 },

  quickActions: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  quickBtn: { flex: 1, backgroundColor: '#fff', borderRadius: 14, paddingVertical: 14, alignItems: 'center', shadowColor: BRAND, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 },
  quickBtnIcon: { fontSize: 22 },
  quickBtnLabel: { fontSize: 11, color: '#6b7280', fontWeight: '600', marginTop: 4 },

  modal: { flex: 1, backgroundColor: '#f7f8fc' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 24, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#1a1a2e' },
  modalSubtitle: { fontSize: 13, color: '#9ca3af', marginTop: 2 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { fontSize: 14, color: '#6b7280', fontWeight: '700' },
})
