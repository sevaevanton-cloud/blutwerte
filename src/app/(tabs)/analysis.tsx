// src/app/(tabs)/analysis.tsx
import { useLocalSearchParams } from 'expo-router'
import { collection, doc, getDoc, getDocs, limit, orderBy, query, setDoc } from 'firebase/firestore'
import React, { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { db } from '../../config/firebase'
import { BRAND } from '../../constants/theme'
import { useAuth } from '../../context/AuthContext'
import { useProfile } from '../../context/ProfileContext'
import { AnalysisResult, analyzeHealthData } from '../../services/geminiAnalysis'


function ScoreRing({ score }: { score: number }) {
  const color =
    score >= 95 ? '#34d399' :   // Optimal
    score >= 90 ? '#4ade80' :   // Gut
    score >= 80 ? '#a3e635' :   // OK
    score >= 70 ? '#fbbf24' :   // Grenzwertig
    score >= 60 ? '#f97316' :   // Bedenklich
    '#f87171'                   // Kritisch

  const label =
    score >= 95 ? 'Optimal' :
    score >= 90 ? 'Gut' :
    score >= 80 ? 'OK' :
    score >= 70 ? 'Grenzwertig' :
    score >= 60 ? 'Bedenklich' : 'Kritisch'

  return (
    <View style={[styles.scoreRing, { borderColor: color }]}>
      <Text style={[styles.scoreNumber, { color }]}>{score}</Text>
      <Text style={[styles.scoreLabel, { color: color + 'cc' }]}>{label}</Text>
    </View>
  )
}

export default function Analysis() {
  const { profile }   = useProfile()
  const { uid }       = useAuth()
  // autoStart-Parameter aus der Navigation (gesetzt von home.tsx Banner)
  const { autoStart } = useLocalSearchParams<{ autoStart?: string }>()

  const [loading, setLoading]           = useState(false)
  const [cacheLoading, setCacheLoading] = useState(true)
  const [result, setResult]             = useState<AnalysisResult | null>(null)
  const [lastAnalyzed, setLastAnalyzed] = useState<string | null>(null)

  // Verhindert doppelten Auto-Start bei Re-Renders
  const hasAutoStarted = useRef(false)

  // Cache beim Öffnen laden
  useEffect(() => {
    if (!uid) return
    const loadCache = async () => {
      try {
        const snap = await getDoc(doc(db, 'users', uid, 'analysisCache', 'latest'))
        if (snap.exists()) {
          const data = snap.data()
          setResult(data.result as AnalysisResult)
          setLastAnalyzed(data.analyzedAt ?? null)
        }
      } catch {
        // Cache nicht verfügbar – kein Problem
      } finally {
        setCacheLoading(false)
      }
    }
    loadCache()
  }, [uid])

  const fetchData = async () => {
    if (!uid) throw new Error('Nicht eingeloggt.')
    const [bloodSnap, nutritionSnap, supplementSnap, trainingSnap] = await Promise.all([
      getDocs(query(collection(db, 'users', uid, 'bloodTests'),  orderBy('createdAt', 'desc'), limit(3))),
      getDocs(query(collection(db, 'users', uid, 'nutrition'),   orderBy('createdAt', 'desc'), limit(20))),
      getDocs(query(collection(db, 'users', uid, 'supplements'), orderBy('createdAt', 'desc'), limit(20))),
      getDocs(query(collection(db, 'users', uid, 'training'),    orderBy('createdAt', 'desc'), limit(10))),
    ])

    return {
      bloodTests:  bloodSnap.docs.map(d   => ({ id: d.id, ...d.data() })),
      nutrition:   nutritionSnap.docs.map(d => ({ id: d.id, ...d.data() })),
      supplements: supplementSnap.docs.map(d => ({ id: d.id, ...d.data() })),
      training:    trainingSnap.docs.map(d  => ({ id: d.id, ...d.data() })),
    }
  }

  const runAnalysis = async () => {
    setLoading(true)
    try {
      const data = await fetchData()

      if (data.bloodTests.length === 0) {
        Alert.alert(
          'Keine Blutwerte',
          'Bitte trage zuerst deine Blutwerte ein, damit die KI sie analysieren kann.'
        )
        return
      }

      const analysisResult = await analyzeHealthData({
        ...data,
        profile: {
          gender:     profile.gender,
          birthYear:  profile.birthYear,
          cyclePhase: profile.cyclePhase,
        },
      })

      const analyzedAt = new Date().toLocaleString('de-DE')
      setResult(analysisResult)
      setLastAnalyzed(analyzedAt)

      if (uid) {
        await setDoc(doc(db, 'users', uid, 'analysisCache', 'latest'), {
          result: analysisResult,
          analyzedAt,
        })
      }
    } catch (e: any) {
      Alert.alert('Fehler', `Analyse fehlgeschlagen: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  // DSGVO-Bestätigungs-Dialog (für manuelle Starts über Button)
  const handleAnalyze = () => {
    Alert.alert(
      '🤖 Daten an Google Gemini senden?',
      'Für die KI-Analyse werden folgende Daten an die Google Gemini API übertragen:\n\n' +
      '• Deine Blutwerte (letzte 3 Einträge)\n' +
      '• Ernährungseinträge (letzte 20)\n' +
      '• Supplements (letzte 20)\n' +
      '• Training (letzte 10 Einträge)\n' +
      '• Alter, Geschlecht & Zyklusphase\n\n' +
      'Dein Name wird NICHT übertragen (Pseudonymisierung).\n\n' +
      'Google verarbeitet diese Daten gemäß der Google Cloud Datenschutzrichtlinie.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        { text: 'Analyse starten', style: 'default', onPress: runAnalysis },
      ]
    )
  }

  // ── Auto-Start: wenn aus Home-Banner mit bestätigtem Dialog navigiert ──
  // Der DSGVO-Dialog wurde bereits in home.tsx gezeigt → direkt starten
  useEffect(() => {
    if (autoStart === '1' && !hasAutoStarted.current && uid) {
      hasAutoStarted.current = true
      runAnalysis()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, uid])

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f7f8fc' }} edges={['top']}>
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>🤖 KI-Analyse</Text>
      <Text style={styles.subtitle}>
        Die KI analysiert deine Blutwerte, Ernährung, Supplements und Training.
      </Text>

      {/* Analyse starten */}
      <TouchableOpacity
        style={[styles.analyzeBtn, loading && { opacity: 0.7 }]}
        onPress={handleAnalyze}
        disabled={loading}
      >
        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color="#fff" />
            <Text style={styles.analyzeBtnText}>  Analysiere deine Daten...</Text>
          </View>
        ) : (
          <Text style={styles.analyzeBtnText}>
            {result ? '🔄 Neue Analyse starten' : '✨ Analyse starten'}
          </Text>
        )}
      </TouchableOpacity>

      {lastAnalyzed && (
        <Text style={styles.lastAnalyzed}>Zuletzt analysiert: {lastAnalyzed}</Text>
      )}

      {/* Disclaimer */}
      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>
          ⚕️ Diese Analyse ersetzt keine ärztliche Diagnose. Besprich auffällige Werte immer mit einem Arzt.
        </Text>
      </View>

      {/* Ergebnisse */}
      {result && (
        <View style={styles.results}>

          {/* Score */}
          <View style={styles.card}>
            <View style={styles.scoreRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Gesundheitsscore</Text>
                <Text style={styles.summary}>{result.summary}</Text>
              </View>
              <ScoreRing score={result.overallScore} />
            </View>
            {/* Score-Legende */}
            <View style={styles.scoreLegend}>
              {[
                { range: '95–100', label: 'Optimal',     color: '#34d399' },
                { range: '90–94',  label: 'Gut',         color: '#4ade80' },
                { range: '80–89',  label: 'OK',          color: '#a3e635' },
                { range: '70–79',  label: 'Grenzwertig', color: '#fbbf24' },
                { range: '60–69',  label: 'Bedenklich',  color: '#f97316' },
                { range: '< 60',   label: 'Kritisch',    color: '#f87171' },
              ].map(l => (
                <View key={l.range} style={styles.legendRow}>
                  <View style={[styles.legendDot, { backgroundColor: l.color }]} />
                  <Text style={styles.legendRange}>{l.range}</Text>
                  <Text style={styles.legendLabel}>{l.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Auffällige Werte */}
          {result.abnormalValues && result.abnormalValues.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>⚠️ Auffällige Werte</Text>
              {result.abnormalValues.map((item, i) => (
                <View key={i} style={styles.abnormalItem}>
                  <View style={styles.abnormalHeader}>
                    <Text style={styles.abnormalName}>{item.name}</Text>
                    <Text style={styles.abnormalValue}>{item.value}</Text>
                  </View>
                  <Text style={styles.abnormalAssessment}>{item.assessment}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Ernährung */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🥗 Ernährungsanalyse</Text>
            <Text style={styles.cardText}>{result.nutritionInsights}</Text>
          </View>

          {/* Supplements */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>💊 Supplement-Empfehlungen</Text>
            <Text style={styles.cardText}>{result.supplementRecommendations}</Text>
          </View>

          {/* Training */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🏋️ Training</Text>
            <Text style={styles.cardText}>{result.trainingInsights}</Text>
          </View>

          {/* Konkrete Ratschläge */}
          {result.advice && result.advice.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>💡 Deine nächsten Schritte</Text>
              {result.advice.map((tip, i) => (
                <View key={i} style={styles.tipRow}>
                  <View style={styles.tipNumber}>
                    <Text style={styles.tipNumberText}>{i + 1}</Text>
                  </View>
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Leerer Zustand */}
      {!result && !loading && !cacheLoading && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🔬</Text>
          <Text style={styles.emptyTitle}>Bereit für deine Analyse</Text>
          <Text style={styles.emptyText}>
            Tippe auf „Analyse starten" um eine KI-gestützte Auswertung deiner Gesundheitsdaten zu erhalten.
          </Text>
        </View>
      )}

      {/* Cache wird geladen */}
      {cacheLoading && (
        <View style={styles.emptyState}>
          <ActivityIndicator color={BRAND} size="large" />
          <Text style={[styles.emptyText, { marginTop: 12 }]}>Letzte Analyse wird geladen...</Text>
        </View>
      )}
    </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f8fc' },
  content: { padding: 20, paddingBottom: 100 },
  title: { fontSize: 28, fontWeight: '800', color: '#1a1a2e', letterSpacing: -0.5, marginBottom: 4, marginTop: 8 },
  subtitle: { fontSize: 14, color: '#9ca3af', fontWeight: '500', marginBottom: 20 },

  analyzeBtn: {
    backgroundColor: BRAND, padding: 18, borderRadius: 16, alignItems: 'center',
    shadowColor: BRAND, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 14, elevation: 8,
  },
  loadingRow: { flexDirection: 'row', alignItems: 'center' },
  analyzeBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  lastAnalyzed: { fontSize: 12, color: '#9ca3af', textAlign: 'center', marginTop: 8 },

  disclaimer: {
    backgroundColor: '#fff7e7', borderRadius: 12, padding: 12, marginTop: 16,
    borderLeftWidth: 3, borderLeftColor: '#fbbf24',
  },
  disclaimerText: { fontSize: 12, color: '#92400e', lineHeight: 18 },

  results: { marginTop: 20, gap: 14 },

  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 18,
    shadowColor: BRAND, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a2e', marginBottom: 10 },
  cardText: { fontSize: 14, color: '#4b5563', lineHeight: 22 },

  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
  scoreRing: {
    width: 84, height: 84, borderRadius: 42, borderWidth: 6,
    alignItems: 'center', justifyContent: 'center',
  },
  scoreNumber: { fontSize: 26, fontWeight: '800' },
  scoreLabel: { fontSize: 10, fontWeight: '700', marginTop: -2 },
  summary: { fontSize: 14, color: '#4b5563', lineHeight: 22 },

  // Score-Legende
  scoreLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginRight: 8 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendRange: { fontSize: 10, color: '#6b7280', fontWeight: '700' },
  legendLabel: { fontSize: 10, color: '#9ca3af' },

  abnormalItem: {
    backgroundColor: '#fff5f5', borderRadius: 10, padding: 12, marginBottom: 8,
    borderLeftWidth: 3, borderLeftColor: '#f87171',
  },
  abnormalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  abnormalName: { fontSize: 14, fontWeight: '700', color: '#1a1a2e' },
  abnormalValue: { fontSize: 14, fontWeight: '700', color: '#f87171' },
  abnormalAssessment: { fontSize: 13, color: '#6b7280', lineHeight: 20 },

  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 },
  tipNumber: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: BRAND,
    alignItems: 'center', justifyContent: 'center', marginTop: 1,
  },
  tipNumberText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  tipText: { flex: 1, fontSize: 14, color: '#4b5563', lineHeight: 22 },

  emptyState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 20 },
  emptyEmoji: { fontSize: 60, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#1a1a2e', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#9ca3af', textAlign: 'center', lineHeight: 22 },
})
