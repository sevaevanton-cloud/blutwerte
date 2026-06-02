// src/app/(tabs)/history.tsx
import { collection, deleteDoc, doc, getDocs, orderBy, query } from 'firebase/firestore'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  ScrollView, StyleSheet, Text,
  TouchableOpacity, View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from 'react-native-svg'
import AddBloodValues from '../../components/add/AddBloodValues'
import ModalHeader, { modalSharedStyles } from '../../components/ui/ModalHeader'
import { db } from '../../config/firebase'
import { BLOOD_VALUES } from '../../constants/bloodValues'
import { BRAND } from '../../constants/theme'
import { useAuth } from '../../context/AuthContext'
import { useProfile } from '../../context/ProfileContext'

const { width } = Dimensions.get('window')
const CHART_WIDTH = width - 40
const CHART_HEIGHT = 200
const PAD = { top: 16, right: 16, bottom: 32, left: 48 }

interface BloodTest {
  id: string
  date: string
  values: Record<string, { value: number; unit: string }>
  note?: string
}

// ── Mini Line Chart ───────────────────────────────────────────────
function LineChart({ points, refMin, refMax, unit }: {
  points: { date: string; value: number }[]
  refMin?: number
  refMax?: number
  unit: string
}) {
  if (points.length === 0) return null

  const innerW = CHART_WIDTH - PAD.left - PAD.right
  const innerH = CHART_HEIGHT - PAD.top - PAD.bottom

  const values = points.map(p => p.value)
  const allValues = [...values, refMin ?? Infinity, refMax ?? -Infinity].filter(isFinite)
  const rawMin = Math.min(...allValues)
  const rawMax = Math.max(...allValues)
  const padding = (rawMax - rawMin) * 0.2 || 1
  const yMin = rawMin - padding
  const yMax = rawMax + padding

  const toX = (i: number) =>
    PAD.left + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW)
  const toY = (v: number) =>
    PAD.top + innerH - ((v - yMin) / (yMax - yMin)) * innerH

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(p.value).toFixed(1)}`)
    .join(' ')

  const tickCount = 4
  const ticks = Array.from({ length: tickCount }, (_, i) =>
    yMin + (i / (tickCount - 1)) * (yMax - yMin)
  )

  return (
    <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
      {refMin !== undefined && refMax !== undefined && (
        <Rect x={PAD.left} y={toY(refMax)} width={innerW}
          height={toY(refMin) - toY(refMax)} fill="#34d399" opacity={0.12} />
      )}
      {refMin !== undefined && (
        <Line x1={PAD.left} y1={toY(refMin)} x2={PAD.left + innerW} y2={toY(refMin)}
          stroke="#34d399" strokeWidth={1} strokeDasharray="4 3" />
      )}
      {refMax !== undefined && (
        <Line x1={PAD.left} y1={toY(refMax)} x2={PAD.left + innerW} y2={toY(refMax)}
          stroke="#34d399" strokeWidth={1} strokeDasharray="4 3" />
      )}
      {ticks.map((t, i) => (
        <SvgText key={i} x={PAD.left - 6} y={toY(t) + 4}
          fontSize={10} fill="#9ca3af" textAnchor="end">
          {t.toFixed(1)}
        </SvgText>
      ))}
      {points.map((p, i) => {
        if (points.length > 5 && i % 2 !== 0) return null
        const parts = p.date.split('-')
        const label = parts.length === 3 ? `${parts[2]}.${parts[1]}` : p.date
        return (
          <SvgText key={i} x={toX(i)} y={CHART_HEIGHT - 4}
            fontSize={10} fill="#9ca3af" textAnchor="middle">
            {label}
          </SvgText>
        )
      })}
      {points.length > 1 && (
        <Path d={pathD} fill="none" stroke={BRAND} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      )}
      {points.map((p, i) => {
        const isAbnormal = (refMin !== undefined && p.value < refMin) || (refMax !== undefined && p.value > refMax)
        return (
          <Circle key={i} cx={toX(i)} cy={toY(p.value)} r={5}
            fill={isAbnormal ? '#f87171' : BRAND} stroke="#fff" strokeWidth={2} />
        )
      })}
    </Svg>
  )
}

// ── Main Screen ───────────────────────────────────────────────────
export default function History() {
  const { uid } = useAuth()
  const { profile } = useProfile()
  const gender = profile.gender ?? 'male'

  const [loading, setLoading] = useState(true)
  const [bloodTests, setBloodTests] = useState<BloodTest[]>([])
  const [selectedId, setSelectedId] = useState<string>('hemoglobin')
  const [editingTest, setEditingTest] = useState<BloodTest | null>(null)

  const load = useCallback(async () => {
    if (!uid) return
    try {
      const snap = await getDocs(
        query(collection(db, 'users', uid, 'bloodTests'), orderBy('date', 'asc'))
      )
      setBloodTests(snap.docs.map(d => ({
        id: d.id,
        date: d.data().date,
        values: d.data().values ?? {},
        note: d.data().note ?? '',
      })))
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [uid])

  useEffect(() => { load() }, [load])

  const handleDeleteTest = (testId: string, dateLabel: string) => {
    Alert.alert(
      'Bluttest löschen?',
      `Der Test vom ${dateLabel} und alle zugehörigen Werte werden dauerhaft gelöscht.`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Löschen', style: 'destructive', onPress: async () => {
            if (!uid) return
            try {
              await deleteDoc(doc(db, 'users', uid, 'bloodTests', testId))
              load()
            } catch {
              Alert.alert('Fehler', 'Löschen fehlgeschlagen.')
            }
          }
        },
      ]
    )
  }

  const availableValues = useMemo(() => {
    const ids = new Set<string>()
    bloodTests.forEach(t => Object.keys(t.values).forEach(id => ids.add(id)))
    return BLOOD_VALUES.filter(bv => ids.has(bv.id))
  }, [bloodTests])

  const chartPoints = useMemo(() =>
    bloodTests
      .filter(t => t.values[selectedId] !== undefined)
      .map(t => ({ date: t.date, value: t.values[selectedId].value })),
    [bloodTests, selectedId]
  )

  const selectedDef = BLOOD_VALUES.find(b => b.id === selectedId)
  const refRange = selectedDef?.referenceRanges?.[gender as 'male' | 'female'] ?? selectedDef?.referenceRanges?.all
  const unit = chartPoints[0] ? bloodTests.find(t => t.values[selectedId])?.values[selectedId]?.unit ?? selectedDef?.defaultUnit : selectedDef?.defaultUnit

  const latestPoint = chartPoints[chartPoints.length - 1]
  const isAbnormal = latestPoint && refRange
    ? latestPoint.value < refRange.min || latestPoint.value > refRange.max
    : false

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={BRAND} />
      </View>
    )
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#f7f8fc' }}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>📈 Verlauf</Text>
        <Text style={styles.subtitle}>Deine Blutwerte über Zeit</Text>

        {bloodTests.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>🩸</Text>
            <Text style={styles.emptyTitle}>Noch keine Blutwerte</Text>
            <Text style={styles.emptySub}>Trage deinen ersten Bluttest unter + ein um den Verlauf zu sehen.</Text>
          </View>
        ) : (
          <>
            {availableValues.length > 0 && (
              <View style={styles.selectorBox}>
                <Text style={styles.selectorLabel}>Wert auswählen</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pills}>
                  {availableValues.map(bv => (
                    <TouchableOpacity
                      key={bv.id}
                      style={[styles.pill, selectedId === bv.id && styles.pillActive]}
                      onPress={() => setSelectedId(bv.id)}
                    >
                      <Text style={[styles.pillText, selectedId === bv.id && styles.pillTextActive]}>
                        {bv.shortName ?? bv.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={styles.card}>
              <View style={styles.chartHeader}>
                <View>
                  <Text style={styles.chartTitle}>{selectedDef?.name}</Text>
                  {latestPoint && (
                    <Text style={[styles.chartLatest, { color: isAbnormal ? '#f87171' : '#34d399' }]}>
                      Aktuell: {latestPoint.value} {unit} {isAbnormal ? '⚠️' : '✓'}
                    </Text>
                  )}
                </View>
                {refRange && (
                  <View style={styles.refBox}>
                    <Text style={styles.refLabel}>Normbereich</Text>
                    <Text style={styles.refValue}>{refRange.min}–{refRange.max} {unit}</Text>
                  </View>
                )}
              </View>

              {chartPoints.length >= 1 ? (
                <LineChart points={chartPoints} refMin={refRange?.min} refMax={refRange?.max} unit={unit ?? ''} />
              ) : (
                <View style={styles.noDataBox}>
                  <Text style={styles.noDataText}>Kein Messwert für {selectedDef?.shortName ?? selectedDef?.name}</Text>
                </View>
              )}

              <View style={styles.legend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: BRAND }]} />
                  <Text style={styles.legendText}>Messwert</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#f87171' }]} />
                  <Text style={styles.legendText}>Auffällig</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#34d399', opacity: 0.5 }]} />
                  <Text style={styles.legendText}>Normbereich</Text>
                </View>
              </View>
            </View>

            {/* History List */}
            <View style={styles.card}>
              <Text style={styles.listTitle}>Alle Messungen</Text>
              {[...bloodTests].reverse().map(test => {
                const entry = test.values[selectedId]
                if (!entry) return null
                const abnormal = refRange
                  ? entry.value < refRange.min || entry.value > refRange.max
                  : false
                const parts = test.date.split('-')
                const dateLabel = parts.length === 3
                  ? `${parts[2]}.${parts[1]}.${parts[0]}`
                  : test.date
                return (
                  <View key={test.id} style={styles.listRow}>
                    <Text style={styles.listDate}>{dateLabel}</Text>
                    <Text style={[styles.listValue, { color: abnormal ? '#f87171' : '#34d399' }]}>
                      {entry.value} {entry.unit}
                    </Text>
                    {refRange && (
                      <Text style={styles.listStatus}>{abnormal ? '⚠️' : '✓'}</Text>
                    )}
                    <View style={styles.rowActions}>
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => setEditingTest(test)}
                      >
                        <Text style={styles.actionBtnText}>✏️</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => handleDeleteTest(test.id, dateLabel)}
                      >
                        <Text style={styles.actionBtnText}>🗑️</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )
              })}
            </View>
          </>
        )}
      </ScrollView>

      {/* Edit Modal */}
      <Modal
        visible={!!editingTest}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditingTest(null)}
      >
        <View style={styles.modal}>
          <ModalHeader
            title="🩸 Blutwerte bearbeiten"
            subtitle={editingTest?.date}
            onClose={() => setEditingTest(null)}
          />
          {editingTest && (
            <AddBloodValues
              onClose={() => { setEditingTest(null); load() }}
              docId={editingTest.id}
              initialValues={editingTest.values}
              initialDate={editingTest.date}
              initialNote={editingTest.note}
            />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f8fc' },
  content: { padding: 20, paddingBottom: 100 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  title: { fontSize: 26, fontWeight: '800', color: '#1a1a2e', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: '#9ca3af', marginTop: 2, marginBottom: 20 },

  emptyBox: { backgroundColor: '#fff', borderRadius: 20, padding: 40, alignItems: 'center', marginTop: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a2e', marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#9ca3af', textAlign: 'center', lineHeight: 20 },

  selectorBox: { marginBottom: 16 },
  selectorLabel: { fontSize: 13, fontWeight: '600', color: '#6b7280', marginBottom: 8 },
  pills: { flexDirection: 'row' },
  pill: { backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, marginRight: 8, borderWidth: 1.5, borderColor: '#e5e7eb' },
  pillActive: { backgroundColor: BRAND, borderColor: BRAND },
  pillText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  pillTextActive: { color: '#fff' },

  card: { backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 16, shadowColor: BRAND, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },

  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  chartTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a2e' },
  chartLatest: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  refBox: { alignItems: 'flex-end' },
  refLabel: { fontSize: 11, color: '#9ca3af', fontWeight: '500' },
  refValue: { fontSize: 13, fontWeight: '700', color: '#34d399' },

  noDataBox: { height: 80, justifyContent: 'center', alignItems: 'center' },
  noDataText: { fontSize: 14, color: '#9ca3af' },

  legend: { flexDirection: 'row', gap: 16, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, color: '#6b7280', fontWeight: '500' },

  listTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a2e', marginBottom: 12 },
  listRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', gap: 4 },
  listDate: { fontSize: 14, color: '#6b7280', fontWeight: '500', flex: 1 },
  listValue: { fontSize: 15, fontWeight: '700', flex: 1, textAlign: 'center' },
  listStatus: { fontSize: 13, flex: 0 },
  rowActions: { flexDirection: 'row', gap: 4 },
  actionBtn: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: '#f3f4f6' },
  actionBtnText: { fontSize: 13 },

  modal: modalSharedStyles.modal,
})
