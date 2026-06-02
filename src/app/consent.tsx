// src/app/consent.tsx
import { router } from 'expo-router'
import React, { useState } from 'react'
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useConsent } from '../context/ConsentContext'

const BRAND = '#84a7ff'

export default function ConsentScreen() {
  const { giveConsent } = useConsent()
  const [loading, setLoading] = useState(false)

  const handleAccept = async () => {
    setLoading(true)
    await giveConsent()
    router.replace('/')
  }

  const handleDecline = () => {
    Alert.alert(
      'Einwilligung erforderlich',
      'Ohne deine Einwilligung kann die App keine Gesundheitsdaten speichern und verarbeiten. Die App kann daher nicht genutzt werden.',
      [{ text: 'Verstanden', style: 'default' }]
    )
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.emoji}>🔒</Text>
          <Text style={styles.title}>Datenschutz &{'\n'}Einwilligung</Text>
          <Text style={styles.subtitle}>
            Bitte lies die folgenden Informationen sorgfältig durch und stimme zu, bevor du die App nutzt.
          </Text>
        </View>

        {/* Was wird gespeichert */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📋 Welche Daten werden gespeichert?</Text>

          <DataRow icon="🩸" label="Blutwerte" desc="Alle eingetragenen Laborwerte mit Datum" />
          <DataRow icon="🥗" label="Ernährung" desc="Mahlzeiten und Nährstoffangaben" />
          <DataRow icon="💊" label="Supplements" desc="Eingenommene Nahrungsergänzungsmittel" />
          <DataRow icon="🏋️" label="Training" desc="Trainingseinheiten und Dauer" />
          <DataRow icon="👤" label="Profil" desc="Name, Geschlecht, Geburtsjahr, Zyklusphase" />
        </View>

        {/* Wo werden Daten gespeichert */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🗄️ Wo werden Daten gespeichert?</Text>
          <Text style={styles.cardText}>
            Deine Gesundheitsdaten werden in <Text style={styles.bold}>Google Firebase (Cloud Firestore)</Text> auf
            Servern in der EU gespeichert. Profildaten werden zusätzlich lokal auf deinem Gerät gesichert.
          </Text>
          <Text style={styles.cardText}>
            Die Übertragung erfolgt verschlüsselt (HTTPS/TLS).
          </Text>
        </View>

        {/* KI Analyse */}
        <View style={[styles.card, styles.highlightCard]}>
          <Text style={styles.cardTitle}>🤖 KI-Analyse (wichtig!)</Text>
          <Text style={styles.cardText}>
            Wenn du die KI-Analyse nutzt, werden deine <Text style={styles.bold}>Blutwerte, Ernährung, Supplements, Training sowie Alter und Geschlecht</Text> an die{' '}
            <Text style={styles.bold}>Google Gemini API</Text> übermittelt und dort verarbeitet.
          </Text>
          <Text style={styles.cardText}>
            Google verarbeitet diese Daten gemäß der{' '}
            <Text
              style={styles.link}
              onPress={() => Linking.openURL('https://policies.google.com/privacy')}
            >Google Cloud Datenschutzrichtlinie</Text>.
            Die KI-Analyse ist freiwillig und kann jederzeit weggelassen werden.
          </Text>
        </View>

        {/* Rechtsgrundlage */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>⚖️ Rechtsgrundlage</Text>
          <Text style={styles.cardText}>
            Die Verarbeitung deiner Gesundheitsdaten erfolgt auf Basis deiner{' '}
            <Text style={styles.bold}>ausdrücklichen Einwilligung</Text> gemäß{' '}
            <Text style={styles.bold}>DSGVO Art. 6 Abs. 1 lit. a</Text> und{' '}
            <Text style={styles.bold}>Art. 9 Abs. 2 lit. a</Text>.
          </Text>
        </View>

        {/* Deine Rechte */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>✅ Deine Rechte</Text>
          <RightRow text="Einwilligung jederzeit widerrufen (Profil → Einstellungen)" />
          <RightRow text="Alle Daten löschen (Profil → Daten löschen)" />
          <RightRow text="Auskunft über gespeicherte Daten" />
          <RightRow text="Datenübertragbarkeit" />
        </View>

        {/* Hinweis */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            ⚕️ Diese App ersetzt keine ärztliche Beratung oder Diagnose.
          </Text>
        </View>

      </ScrollView>

      {/* Buttons – außerhalb des ScrollView damit sie immer sichtbar sind */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.acceptBtn, loading && { opacity: 0.7 }]}
          onPress={handleAccept}
          disabled={loading}
        >
          <Text style={styles.acceptBtnText}>
            ✓ Ich habe die Datenschutzinformationen gelesen und stimme zu
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.declineBtn} onPress={handleDecline}>
          <Text style={styles.declineBtnText}>Ablehnen</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

function DataRow({ icon, label, desc }: { icon: string; label: string; desc: string }) {
  return (
    <View style={styles.dataRow}>
      <Text style={styles.dataIcon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.dataLabel}>{label}</Text>
        <Text style={styles.dataDesc}>{desc}</Text>
      </View>
    </View>
  )
}

function RightRow({ text }: { text: string }) {
  return (
    <View style={styles.rightRow}>
      <Text style={styles.rightCheck}>✓</Text>
      <Text style={styles.rightText}>{text}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f8fc' },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 20 },

  header: { alignItems: 'center', paddingVertical: 24 },
  emoji: { fontSize: 48, marginBottom: 12 },
  title: { fontSize: 28, fontWeight: '800', color: '#1a1a2e', textAlign: 'center', lineHeight: 34, marginBottom: 10 },
  subtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 22, paddingHorizontal: 10 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  highlightCard: {
    borderLeftWidth: 3,
    borderLeftColor: '#84a7ff',
    backgroundColor: '#f5f7ff',
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a2e', marginBottom: 10 },
  cardText: { fontSize: 13, color: '#4b5563', lineHeight: 20, marginBottom: 6 },
  bold: { fontWeight: '700', color: '#1a1a2e' },
  link: { color: '#84a7ff', textDecorationLine: 'underline' },

  dataRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  dataIcon: { fontSize: 18, width: 24 },
  dataLabel: { fontSize: 13, fontWeight: '600', color: '#1a1a2e' },
  dataDesc: { fontSize: 12, color: '#6b7280', marginTop: 1 },

  rightRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  rightCheck: { fontSize: 13, color: '#34d399', fontWeight: '700', marginTop: 1 },
  rightText: { flex: 1, fontSize: 13, color: '#4b5563', lineHeight: 19 },

  disclaimer: {
    backgroundColor: '#fff7e7',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#fbbf24',
  },
  disclaimerText: { fontSize: 12, color: '#92400e', lineHeight: 18 },

  footer: {
    padding: 16,
    paddingBottom: 32,
    backgroundColor: '#f7f8fc',
    borderTopWidth: 0.5,
    borderTopColor: '#e5e7eb',
    gap: 10,
  },
  acceptBtn: {
    backgroundColor: BRAND,
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  acceptBtnText: { color: '#fff', fontSize: 14, fontWeight: '700', textAlign: 'center', lineHeight: 20 },
  declineBtn: { padding: 12, alignItems: 'center' },
  declineBtnText: { fontSize: 14, color: '#9ca3af', fontWeight: '500' },
})
