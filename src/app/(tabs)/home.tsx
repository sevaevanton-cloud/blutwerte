// src/app/(tabs)/home.tsx
import React, { useState } from 'react'
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import Svg, { Circle } from 'react-native-svg'
import { useProfile } from '../../context/ProfileContext'

const { width } = Dimensions.get('window')
const BRAND = '#84a7ff'
const BRAND_LIGHT = '#eef1ff'
const BRAND_DARK = '#5b7ef7'

// ── Circular Progress Ring ────────────────────────────────────────
function RingProgress({
  value,
  max,
  size = 90,
  stroke = 8,
  color = BRAND,
  label,
  sublabel,
}: {
  value: number
  max: number
  size?: number
  stroke?: number
  color?: string
  label: string
  sublabel?: string
}) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const pct = Math.min(value / max, 1)
  const dash = pct * circ

  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          {/* Track */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke="#f0f0f0"
            strokeWidth={stroke}
            fill="none"
          />
          {/* Progress */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={color}
            strokeWidth={stroke}
            fill="none"
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
            rotation="-90"
            origin={`${size / 2}, ${size / 2}`}
          />
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
function SupplementItem({
  name,
  dose,
  checked,
  onToggle,
}: {
  name: string
  dose: string
  checked: boolean
  onToggle: () => void
}) {
  return (
    <TouchableOpacity style={styles.supplementRow} onPress={onToggle}>
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked && <Text style={styles.checkmark}>✓</Text>}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.supplementName, checked && styles.supplementNameDone]}>
          {name}
        </Text>
        <Text style={styles.supplementDose}>{dose}</Text>
      </View>
    </TouchableOpacity>
  )
}

// ── Macro Bar ─────────────────────────────────────────────────────
function MacroBar({
  label,
  value,
  max,
  color,
}: {
  label: string
  value: number
  max: number
  color: string
}) {
  const pct = Math.min((value / max) * 100, 100)
  return (
    <View style={styles.macroItem}>
      <View style={styles.macroHeader}>
        <Text style={styles.macroLabel}>{label}</Text>
        <Text style={styles.macroValue}>
          {value}
          <Text style={styles.macroMax}>/{max}g</Text>
        </Text>
      </View>
      <View style={styles.macroTrack}>
        <View style={[styles.macroFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    </View>
  )
}

// ── Main Component ────────────────────────────────────────────────
export default function Home() {
  const { profile } = useProfile()

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Guten Morgen'
    if (h < 18) return 'Guten Tag'
    return 'Guten Abend'
  }

  const dateStr = new Date().toLocaleDateString('de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  // Beispiel-Daten (später aus Firebase)
  const [supplements, setSupplements] = useState([
    { id: '1', name: 'Vitamin D3', dose: '4.000 IE', checked: false },
    { id: '2', name: 'Omega-3', dose: '2g EPA/DHA', checked: true },
    { id: '3', name: 'Magnesium', dose: '300mg', checked: false },
    { id: '4', name: 'Zink', dose: '15mg', checked: false },
  ])

  const toggleSupplement = (id: string) => {
    setSupplements((prev) =>
      prev.map((s) => (s.id === id ? { ...s, checked: !s.checked } : s))
    )
  }

  const supplementsDone = supplements.filter((s) => s.checked).length

  const nutrition = {
    calories: { current: 1840, goal: 2500 },
    protein: { current: 120, goal: 180 },
    carbs: { current: 210, goal: 280 },
    fat: { current: 55, goal: 80 },
  }

  const lastBloodTest = {
    date: '29.04.2026',
    abnormal: 3,
    total: 12,
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>
            {greeting()}{profile.name ? `, ${profile.name}` : ''} 👋
          </Text>
          <Text style={styles.date}>{dateStr}</Text>
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {profile.name ? profile.name[0].toUpperCase() : '?'}
          </Text>
        </View>
      </View>

      {/* ── Bluttest Banner ── */}
      <TouchableOpacity style={styles.bloodCard} activeOpacity={0.85}>
        <View style={styles.bloodCardLeft}>
          <Text style={styles.bloodCardLabel}>Letzter Bluttest</Text>
          <Text style={styles.bloodCardDate}>{lastBloodTest.date}</Text>
          <View style={styles.bloodCardBadge}>
            <Text style={styles.bloodCardBadgeText}>
              ⚠️  {lastBloodTest.abnormal} von {lastBloodTest.total} Werten auffällig
            </Text>
          </View>
        </View>
        <View style={styles.bloodCardRight}>
          <Text style={styles.bloodCardArrow}>KI-Analyse →</Text>
        </View>
      </TouchableOpacity>

      {/* ── Ernährung ── */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>🥗 Ernährung heute</Text>
          <TouchableOpacity>
            <Text style={styles.cardAction}>+ Eintragen</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.calorieRow}>
          <RingProgress
            value={nutrition.calories.current}
            max={nutrition.calories.goal}
            size={110}
            stroke={10}
            color={BRAND}
            label="kcal"
            sublabel={`/${nutrition.calories.goal}`}
          />
          <View style={styles.macros}>
            <MacroBar
              label="Protein"
              value={nutrition.protein.current}
              max={nutrition.protein.goal}
              color="#f87171"
            />
            <MacroBar
              label="Kohlenhydrate"
              value={nutrition.carbs.current}
              max={nutrition.carbs.goal}
              color="#fbbf24"
            />
            <MacroBar
              label="Fett"
              value={nutrition.fat.current}
              max={nutrition.fat.goal}
              color="#34d399"
            />
          </View>
        </View>

        <View style={styles.calorieFooter}>
          <View style={styles.calorieInfo}>
            <Text style={styles.calorieInfoValue}>{nutrition.calories.current}</Text>
            <Text style={styles.calorieInfoLabel}>gegessen</Text>
          </View>
          <View style={styles.calorieDivider} />
          <View style={styles.calorieInfo}>
            <Text style={[styles.calorieInfoValue, { color: BRAND }]}>
              {nutrition.calories.goal - nutrition.calories.current}
            </Text>
            <Text style={styles.calorieInfoLabel}>verbleibend</Text>
          </View>
          <View style={styles.calorieDivider} />
          <View style={styles.calorieInfo}>
            <Text style={styles.calorieInfoValue}>{nutrition.calories.goal}</Text>
            <Text style={styles.calorieInfoLabel}>Ziel</Text>
          </View>
        </View>
      </View>

      {/* ── Supplements ── */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>💊 Supplements</Text>
          <Text style={styles.cardSubtitle}>
            {supplementsDone}/{supplements.length} heute
          </Text>
        </View>

        {/* Fortschrittsbalken */}
        <View style={styles.suppProgressTrack}>
          <View
            style={[
              styles.suppProgressFill,
              { width: `${(supplementsDone / supplements.length) * 100}%` },
            ]}
          />
        </View>

        <View style={styles.supplementList}>
          {supplements.map((s) => (
            <SupplementItem
              key={s.id}
              name={s.name}
              dose={s.dose}
              checked={s.checked}
              onToggle={() => toggleSupplement(s.id)}
            />
          ))}
        </View>
      </View>

      {/* ── Training ── */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>🏋️ Training heute</Text>
          <TouchableOpacity>
            <Text style={styles.cardAction}>+ Eintragen</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.trainingPlaceholder}>
          <Text style={styles.trainingPlaceholderText}>
            Noch kein Training eingetragen
          </Text>
          <Text style={styles.trainingPlaceholderSub}>
            Tippe hier um dein Training hinzuzufügen
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Schnellzugriff ── */}
      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.quickBtn}>
          <Text style={styles.quickBtnIcon}>🩸</Text>
          <Text style={styles.quickBtnLabel}>Blutwerte</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickBtn}>
          <Text style={styles.quickBtnIcon}>🥗</Text>
          <Text style={styles.quickBtnLabel}>Mahlzeit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickBtn}>
          <Text style={styles.quickBtnIcon}>🏋️</Text>
          <Text style={styles.quickBtnLabel}>Training</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickBtn}>
          <Text style={styles.quickBtnIcon}>💊</Text>
          <Text style={styles.quickBtnLabel}>Supplement</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f8fc',
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 8,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1a1a2e',
    letterSpacing: -0.5,
  },
  date: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 2,
    fontWeight: '500',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },

  // Blood card
  bloodCard: {
    backgroundColor: BRAND,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  bloodCardLeft: { flex: 1 },
  bloodCardLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  bloodCardDate: {
    fontSize: 20,
    color: '#fff',
    fontWeight: '800',
    marginTop: 2,
    marginBottom: 8,
  },
  bloodCardBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: 'flex-start',
  },
  bloodCardBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  bloodCardRight: {},
  bloodCardArrow: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontWeight: '700',
  },

  // Card
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#84a7ff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#9ca3af',
    fontWeight: '500',
  },
  cardAction: {
    fontSize: 13,
    color: BRAND,
    fontWeight: '700',
  },

  // Calories
  calorieRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginBottom: 16,
  },
  ringCenter: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringValue: {
    fontSize: 18,
    fontWeight: '800',
    color: BRAND,
  },
  ringSublabel: {
    fontSize: 10,
    color: '#9ca3af',
    fontWeight: '500',
  },
  ringLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
    fontWeight: '500',
  },
  macros: {
    flex: 1,
    gap: 10,
  },
  macroItem: {},
  macroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  macroLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  macroValue: {
    fontSize: 12,
    color: '#1a1a2e',
    fontWeight: '700',
  },
  macroMax: {
    color: '#9ca3af',
    fontWeight: '400',
  },
  macroTrack: {
    height: 5,
    backgroundColor: '#f3f4f6',
    borderRadius: 3,
    overflow: 'hidden',
  },
  macroFill: {
    height: '100%',
    borderRadius: 3,
  },
  calorieFooter: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  calorieInfo: { alignItems: 'center' },
  calorieInfoValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1a1a2e',
  },
  calorieInfoLabel: {
    fontSize: 11,
    color: '#9ca3af',
    fontWeight: '500',
    marginTop: 2,
  },
  calorieDivider: {
    width: 1,
    height: '100%',
    backgroundColor: '#f3f4f6',
  },

  // Supplements
  suppProgressTrack: {
    height: 5,
    backgroundColor: '#f3f4f6',
    borderRadius: 3,
    marginBottom: 14,
    overflow: 'hidden',
  },
  suppProgressFill: {
    height: '100%',
    backgroundColor: BRAND,
    borderRadius: 3,
  },
  supplementList: { gap: 2 },
  supplementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f9f9f9',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: BRAND,
    borderColor: BRAND,
  },
  checkmark: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  supplementName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a2e',
  },
  supplementNameDone: {
    color: '#9ca3af',
    textDecorationLine: 'line-through',
  },
  supplementDose: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 1,
  },

  // Training
  trainingPlaceholder: {
    backgroundColor: '#f7f8fc',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#eef1ff',
    borderStyle: 'dashed',
  },
  trainingPlaceholderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  trainingPlaceholderSub: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },

  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  quickBtn: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#84a7ff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  quickBtnIcon: { fontSize: 22 },
  quickBtnLabel: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '600',
    marginTop: 4,
  },
})
