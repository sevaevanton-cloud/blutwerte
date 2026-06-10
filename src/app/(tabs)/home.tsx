// src/app/(tabs)/home.tsx
import { router } from 'expo-router'
import {
  collection,
  getDocs,
  orderBy,
  query,
  Timestamp,
  where,
} from 'firebase/firestore'
import React, { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
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
import ModalHeader, { modalSharedStyles } from '../../components/ui/ModalHeader'
import { db } from '../../config/firebase'
import { BRAND } from '../../constants/theme'
import { useAuth } from '../../context/AuthContext'
import { useProfile } from '../../context/ProfileContext'

// ── Types ──────────────────────────────────────────────────────────
interface NutritionEntry {
  id: string
  name: string
  meal: string
  macros: { kcal: number; protein: number; carbs: number; fat: number }
}

interface SupplementEntry {
  id: string
  name: string
  dose: number | null
  unit: string
  time: string
}

// ── AI Analysis Banner ─────────────────────────────────────────────
function AIAnalysisBanner() {
  return (
    <TouchableOpacity
      style={bannerStyles.container}
      onPress={() => router.push('/(tabs)/analysis')}
      activeOpacity={0.88}
    >
      {/* Decorative circles */}
      <View style={bannerStyles.circle1} />
      <View style={bannerStyles.circle2} />

      <View style={bannerStyles.inner}>
        <View style={bannerStyles.iconWrap}>
          <Text style={bannerStyles.icon}>🧬</Text>
        </View>
        <View style={bannerStyles.textBlock}>
          <Text style={bannerStyles.title}>KI-Analyse starten</Text>
          <Text style={bannerStyles.subtitle}>
            Blutwerte verstehen, Ursachen erkennen,{'\n'}personalisierte Empfehlungen erhalten.
          </Text>
        </View>
        <View style={bannerStyles.arrow}>
          <Text style={bannerStyles.arrowText}>→</Text>
        </View>
      </View>

    </TouchableOpacity>
  )
}

const bannerStyles = StyleSheet.create({
  container: {
    backgroundColor: BRAND,
    borderRadius: 22,
    padding: 20,
    marginBottom: 14,
    overflow: 'hidden',
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  // decorative background circles
  circle1: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.08)',
    top: -30,
    right: -20,
  },
  circle2: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.06)',
    bottom: -15,
    left: 60,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 28 },
  textBlock: { flex: 1 },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.80)',
    lineHeight: 17,
  },
  arrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: { color: '#fff', fontSize: 16, fontWeight: '800' },


})

// ── Calorie Ring ───────────────────────────────────────────────────
function CalorieRing({ consumed, goal }: { consumed: number; goal: number }) {
  const size = 120
  const strokeWidth = 10
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progress = Math.min(consumed / goal, 1)
  const dashOffset = circumference * (1 - progress)
  const color = consumed > goal ? '#f87171' : BRAND

  return (
    <View style={ringStyles.wrapper}>
      <Svg width={size} height={size}>
        {/* Background track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress arc */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          rotation="-90"
          originX={size / 2}
          originY={size / 2}
        />
      </Svg>
      <View style={ringStyles.center}>
        <Text style={[ringStyles.consumed, { color }]}>{Math.round(consumed)}</Text>
        <Text style={ringStyles.unit}>kcal</Text>
      </View>
    </View>
  )
}

const ringStyles = StyleSheet.create({
  wrapper: { width: 120, height: 120, alignItems: 'center', justifyContent: 'center' },
  center: { position: 'absolute', alignItems: 'center' },
  consumed: { fontSize: 22, fontWeight: '800' },
  unit: { fontSize: 11, color: '#9ca3af', fontWeight: '500' },
})

// ── Macro Pill ─────────────────────────────────────────────────────
function MacroPill({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color: string
}) {
  return (
    <View style={[macroStyles.pill, { backgroundColor: color + '18' }]}>
      <Text style={[macroStyles.value, { color }]}>{Math.round(value)}g</Text>
      <Text style={[macroStyles.label, { color }]}>{label}</Text>
    </View>
  )
}

const macroStyles = StyleSheet.create({
  pill: { flex: 1, alignItems: 'center', borderRadius: 12, paddingVertical: 10 },
  value: { fontSize: 16, fontWeight: '800' },
  label: { fontSize: 11, fontWeight: '600', marginTop: 2 },
})

// ── Main Component ─────────────────────────────────────────────────
export default function Home() {
  const { profile, calorieGoal } = useProfile()
  const { uid } = useAuth()

  const [nutrition, setNutrition] = useState<NutritionEntry[]>([])
  const [supplements, setSupplements] = useState<SupplementEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showBloodModal, setShowBloodModal] = useState(false)

  const today = new Date().toISOString().split('T')[0]

  const loadData = useCallback(async () => {
    if (!uid) return
    try {
      // Today's nutrition (filtered by date string)
      const nutritionSnap = await getDocs(
        query(
          collection(db, 'users', uid, 'nutrition'),
          where('date', '==', today)
        )
      )
      setNutrition(
        nutritionSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))
      )

      // Today's supplements (filtered by createdAt >= midnight today)
      const midnight = new Date()
      midnight.setHours(0, 0, 0, 0)
      const suppSnap = await getDocs(
        query(
          collection(db, 'users', uid, 'supplements'),
          where('createdAt', '>=', Timestamp.fromDate(midnight)),
          orderBy('createdAt', 'desc')
        )
      )
      setSupplements(
        suppSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))
      )
    } catch (e) {
      console.error('Home laden fehlgeschlagen', e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [uid, today])

  useEffect(() => {
    loadData()
  }, [loadData])

  const onRefresh = () => {
    setRefreshing(true)
    loadData()
  }

  // Totals
  const totalKcal = nutrition.reduce((s, e) => s + (e.macros?.kcal ?? 0), 0)
  const totalProtein = nutrition.reduce((s, e) => s + (e.macros?.protein ?? 0), 0)
  const totalCarbs = nutrition.reduce((s, e) => s + (e.macros?.carbs ?? 0), 0)
  const totalFat = nutrition.reduce((s, e) => s + (e.macros?.fat ?? 0), 0)
  const remaining = calorieGoal - totalKcal

  // Greeting
  const hour = new Date().getHours()
  const greeting =
    hour < 12 ? 'Guten Morgen' : hour < 18 ? 'Guten Tag' : 'Guten Abend'
  const dateLabel = new Date().toLocaleDateString('de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  if (loading) {
    return (
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#f7f8fc' }}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={BRAND} size="large" />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#f7f8fc' }}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND} />
        }
      >
        {/* ── Header ────────────────────────────────────────────── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              {greeting}{profile.name ? `, ${profile.name}` : ''} 👋
            </Text>
            <Text style={styles.dateLabel}>{dateLabel}</Text>
          </View>
        </View>

        {/* ── KI-Analyse Banner ─────────────────────────────────── */}
        <AIAnalysisBanner />

        {/* ── Kalorien-Karte ────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🔥 Kalorien heute</Text>
          <View style={styles.calorieRow}>
            <CalorieRing consumed={totalKcal} goal={calorieGoal} />
            <View style={styles.calorieStats}>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Gegessen</Text>
                <Text style={[styles.statValue, { color: BRAND }]}>
                  {Math.round(totalKcal)} kcal
                </Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Ziel</Text>
                <Text style={styles.statValue}>{calorieGoal} kcal</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>
                  {remaining >= 0 ? 'Verbleibend' : 'Überschuss'}
                </Text>
                <Text
                  style={[
                    styles.statValue,
                    { color: remaining >= 0 ? '#34d399' : '#f87171' },
                  ]}
                >
                  {Math.abs(Math.round(remaining))} kcal
                </Text>
              </View>
            </View>
          </View>

          {/* Makros */}
          <View style={styles.macroRow}>
            <MacroPill label="Protein" value={totalProtein} color="#84a7ff" />
            <MacroPill label="Kohlenhydrate" value={totalCarbs} color="#fbbf24" />
            <MacroPill label="Fett" value={totalFat} color="#f87171" />
          </View>

          {nutrition.length === 0 && (
            <Text style={styles.emptyHint}>
              Noch keine Mahlzeiten eingetragen. Tippe auf „+" um Ernährung zu tracken.
            </Text>
          )}
        </View>

        {/* ── Supplements heute ─────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>💊 Supplements heute</Text>

          {supplements.length === 0 ? (
            <Text style={styles.emptyHint}>
              Noch keine Supplements eingetragen.
            </Text>
          ) : (
            supplements.map((s) => (
              <View key={s.id} style={styles.supplementRow}>
                <View style={styles.supplementDot} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.supplementName}>{s.name}</Text>
                  {s.dose ? (
                    <Text style={styles.supplementDose}>
                      {s.dose} {s.unit} · {s.time}
                    </Text>
                  ) : (
                    <Text style={styles.supplementDose}>{s.time}</Text>
                  )}
                </View>
                <View style={styles.supplementBadge}>
                  <Text style={styles.supplementBadgeText}>✓</Text>
                </View>
              </View>
            ))
          )}
        </View>


      </ScrollView>

      {/* ── Modal: Blutwerte hinzufügen ───────────────────────────── */}
      <Modal visible={showBloodModal} animationType="slide" presentationStyle="pageSheet">
        <View style={modalSharedStyles.modal}>
          <ModalHeader
            title="Blutwerte eintragen"
            onClose={() => setShowBloodModal(false)}
          />
          <AddBloodValues onClose={() => { setShowBloodModal(false); loadData() }} />
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20, paddingBottom: 100 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1a1a2e',
    letterSpacing: -0.5,
  },
  dateLabel: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 3,
    fontWeight: '500',
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 14,
  },

  // Calories
  calorieRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginBottom: 14,
  },
  calorieStats: { flex: 1, gap: 6 },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: { fontSize: 13, color: '#9ca3af', fontWeight: '500' },
  statValue: { fontSize: 14, color: '#1a1a2e', fontWeight: '700' },
  divider: { height: 1, backgroundColor: '#f3f4f6' },

  macroRow: { flexDirection: 'row', gap: 8 },
  emptyHint: {
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'center',
    paddingVertical: 12,
    lineHeight: 20,
  },

  // Supplements
  supplementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f9fafb',
    gap: 10,
  },
  supplementDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: BRAND,
  },
  supplementName: { fontSize: 14, color: '#1a1a2e', fontWeight: '600' },
  supplementDose: { fontSize: 12, color: '#9ca3af', marginTop: 1 },
  supplementBadge: {
    backgroundColor: '#f0fdf4',
    borderRadius: 10,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  supplementBadgeText: { fontSize: 12, color: '#34d399', fontWeight: '800' },

  // Section label
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },

  // Scan button
  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    gap: 14,
    borderWidth: 1.5,
    borderColor: '#eef1ff',
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  scanBtnIcon: { fontSize: 26 },
  scanBtnTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a2e' },
  scanBtnSub: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  scanBtnArrow: { fontSize: 18, color: BRAND, fontWeight: '700' },
})
