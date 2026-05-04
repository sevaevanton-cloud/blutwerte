// src/app/(tabs)/analysis.tsx
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore'
import React, { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { db } from '../../config/firebase'
import { useAuth } from '../../context/AuthContext'
import { useProfile } from '../../context/ProfileContext'
import { AnalysisResult, analyzeHealthData } from '../../services/geminiAnalysis'

const BRAND = '#84a7ff'

function ScoreRing({ score }: { score: number }) {
  const color = score >= 70 ? '#34d399' : score >= 40 ? '#fbbf24' : '#f87171'
  return (
    <View style={[styles.scoreRing, { borderColor: color }]}>
      <Text style={[styles.scoreNumber, { color }]}>{score}</Text>
      <Text style={styles.scoreLabel}>/ 100</Text>
    </View>
  )
}

export default function Analysis() {
  const { profile } = useProfile()
  const { uid } = useAuth()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [lastAnalyzed, setLastAnalyzed] = useState<string | null>(null)

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const fetchData = async () => {
    const [bloodSnap, nutritionSnap, supplementSnap, trainingSnap] = await Promise.all([
      getDocs(query(collection(db, 'users', uid!, 'bloodTests'), orderBy('createdAt', 'desc'), limit(3))),
      getDocs(query(collection(db, 'users', uid!, 'nutrition'), orderBy('createdAt', 'desc'), limit(20))),
      getDocs(query(collection(db, 'users', uid!, 'supplements'), orderBy('createdAt', 'desc'), limit(20))),
      getDocs(query(collection(db, 'users', uid!, 'training'), orderBy('createdAt', 'desc'), limit(10))),
    ])

    return {
      bloodTests: bloodSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
      nutrition: nutritionSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
      supplements: supplementSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
      training: trainingSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    }
  }

  const handleAnalyze = async () => {
    setLoading(true)
    try {
      const data = await fetchData()

      if (data.bloodTests.length === 0) {
        Alert.alert(
          'Keine Blutwerte',
          'Bitte trage zuerst deine Blutwerte ein damit die KI sie analysieren kann.'
        )
        return
      }

      const analysisResult = await analyzeHealthData({
        ...data,
        profile: {
          name: profile.name,
          gender: profile.gender,
          birthYear: profile.birthYear,
          cyclePhase: profile.cyclePhase,
        },
      })

      setResult(analysisResult)
      setLastAnalyzed(new Date().toLocaleString('de-DE'))
    } catch (e: any) {
      Alert.alert('Fehler', `Analyse fehlgeschlagen: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
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
      {!result && !loading && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🔬</Text>
          <Text style={styles.emptyTitle}>Bereit für deine Analyse</Text>
          <Text style={styles.emptyText}>
            Tippe auf „Analyse starten" um eine KI-gestützte Auswertung deiner Gesundheitsdaten zu erhalten.
          </Text>
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f8fc' },
  content: { padding: 20, paddingBottom: 100 },
  title: { fontSize: 28, fontWeight: '800', color: '#1a1a2e', letterSpacing: -0.5, marginBottom: 4, marginTop: 8 },
  subtitle: { fontSize: 14, color: '#9ca3af', fontWeight: '500', marginBottom: 20 },

  analyzeBtn: {
    backgroundColor: BRAND,
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  loadingRow: { flexDirection: 'row', alignItems: 'center' },
  analyzeBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  lastAnalyzed: { fontSize: 12, color: '#9ca3af', textAlign: 'center', marginTop: 8 },

  disclaimer: {
    backgroundColor: '#fff7e7',
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#fbbf24',
  },
  disclaimerText: { fontSize: 12, color: '#92400e', lineHeight: 18 },

  results: { marginTop: 20, gap: 14 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a2e', marginBottom: 10 },
  cardText: { fontSize: 14, color: '#4b5563', lineHeight: 22 },

  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  scoreRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreNumber: { fontSize: 24, fontWeight: '800' },
  scoreLabel: { fontSize: 11, color: '#9ca3af' },
  summary: { fontSize: 14, color: '#4b5563', lineHeight: 22 },

  abnormalItem: {
    backgroundColor: '#fff5f5',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#f87171',
  },
  abnormalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  abnormalName: { fontSize: 14, fontWeight: '700', color: '#1a1a2e' },
  abnormalValue: { fontSize: 14, fontWeight: '700', color: '#f87171' },
  abnormalAssessment: { fontSize: 13, color: '#6b7280', lineHeight: 20 },

  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 },
  tipNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  tipNumberText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  tipText: { flex: 1, fontSize: 14, color: '#4b5563', lineHeight: 22 },

  emptyState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 20 },
  emptyEmoji: { fontSize: 60, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#1a1a2e', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#9ca3af', textAlign: 'center', lineHeight: 22 },
})
