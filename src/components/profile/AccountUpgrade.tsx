// src/components/profile/AccountUpgrade.tsx
import React, { useState } from 'react'
import {
  ActivityIndicator, Alert, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from 'react-native'
import { BRAND } from '../../constants/theme'
import { useAuth } from '../../context/AuthContext'

type Method = 'email' | 'google' | null

export default function AccountUpgrade() {
  const { upgradeWithEmail, upgradeWithGoogle } = useAuth()
  const [method, setMethod] = useState<Method>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)

  const handleEmailUpgrade = async () => {
    if (!email.trim()) { Alert.alert('Bitte E-Mail eingeben.'); return }
    if (password.length < 6) { Alert.alert('Passwort muss mindestens 6 Zeichen haben.'); return }
    if (password !== confirm) { Alert.alert('Passwörter stimmen nicht überein.'); return }

    setLoading(true)
    try {
      await upgradeWithEmail(email.trim(), password)
      Alert.alert('✅ Account gesichert!', `Du bist jetzt mit ${email} registriert. Deine Daten bleiben erhalten.`)
      setMethod(null)
    } catch (e: any) {
      if (e.code === 'auth/email-already-in-use') {
        Alert.alert('E-Mail bereits vergeben', 'Diese E-Mail-Adresse ist bereits mit einem anderen Account verknüpft.')
      } else if (e.code === 'auth/invalid-email') {
        Alert.alert('Ungültige E-Mail', 'Bitte überprüfe deine E-Mail-Adresse.')
      } else {
        Alert.alert('Fehler', e.message ?? 'Unbekannter Fehler.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleUpgrade = async () => {
    setLoading(true)
    try {
      await upgradeWithGoogle()
      Alert.alert('✅ Account gesichert!', 'Dein Google-Account wurde verknüpft. Deine Daten bleiben erhalten.')
    } catch (e: any) {
      if (e.code === 'auth/credential-already-in-use') {
        Alert.alert('Google-Account bereits vergeben', 'Dieser Google-Account ist bereits mit einem anderen Account verknüpft.')
      } else if (e.message?.includes('Web-Version')) {
        // Klarer Hinweis wenn auf Native aufgerufen
        Alert.alert('Nicht verfügbar', e.message)
      } else {
        Alert.alert('Fehler', e.message ?? 'Unbekannter Fehler.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      {/* Banner */}
      <View style={styles.banner}>
        <Text style={styles.bannerIcon}>⚠️</Text>
        <View style={styles.bannerText}>
          <Text style={styles.bannerTitle}>Daten sichern</Text>
          <Text style={styles.bannerSub}>Du bist anonym eingeloggt. Bei Neuinstallation gehen alle Daten verloren.</Text>
        </View>
      </View>

      {/* Methoden-Auswahl */}
      {!method && (
        <View style={styles.methods}>
          <TouchableOpacity style={styles.methodBtn} onPress={() => setMethod('email')}>
            <Text style={styles.methodIcon}>✉️</Text>
            <View>
              <Text style={styles.methodLabel}>E-Mail & Passwort</Text>
              <Text style={styles.methodSub}>Account erstellen</Text>
            </View>
            <Text style={styles.methodArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.methodBtn, { opacity: loading ? 0.7 : 1 }]}
            onPress={handleGoogleUpgrade}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color={BRAND} /> : <Text style={styles.methodIcon}>🔵</Text>}
            <View>
              <Text style={styles.methodLabel}>Mit Google verknüpfen</Text>
              <Text style={styles.methodSub}>Google-Account nutzen</Text>
            </View>
            <Text style={styles.methodArrow}>›</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* E-Mail Formular */}
      {method === 'email' && (
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="E-Mail"
            placeholderTextColor="#9ca3af"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Passwort (min. 6 Zeichen)"
            placeholderTextColor="#9ca3af"
            secureTextEntry
          />
          <TextInput
            style={styles.input}
            value={confirm}
            onChangeText={setConfirm}
            placeholder="Passwort bestätigen"
            placeholderTextColor="#9ca3af"
            secureTextEntry
          />

          <View style={styles.formActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setMethod(null)}>
              <Text style={styles.cancelBtnText}>Abbrechen</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, loading && { opacity: 0.7 }]}
              onPress={handleEmailUpgrade}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.saveBtnText}>Account sichern</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { marginBottom: 12 },

  banner: { flexDirection: 'row', backgroundColor: '#fffbeb', borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: '#fde68a', gap: 10, marginBottom: 10, alignItems: 'flex-start' },
  bannerIcon: { fontSize: 20 },
  bannerText: { flex: 1 },
  bannerTitle: { fontSize: 14, fontWeight: '700', color: '#92400e' },
  bannerSub: { fontSize: 12, color: '#b45309', marginTop: 2, lineHeight: 17 },

  methods: { gap: 8 },
  methodBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 16, gap: 12, borderWidth: 1.5, borderColor: '#e5e7eb' },
  methodIcon: { fontSize: 22 },
  methodLabel: { fontSize: 15, fontWeight: '700', color: '#1a1a2e' },
  methodSub: { fontSize: 12, color: '#9ca3af', marginTop: 1 },
  methodArrow: { marginLeft: 'auto', fontSize: 20, color: '#9ca3af' },

  form: { gap: 10 },
  input: { backgroundColor: '#f7f8fc', color: '#1a1a2e', borderRadius: 10, padding: 14, fontSize: 16, borderWidth: 1.5, borderColor: '#e5e7eb' },

  formActions: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1.5, borderColor: '#e5e7eb' },
  cancelBtnText: { color: '#6b7280', fontSize: 15, fontWeight: '600' },
  saveBtn: { flex: 2, padding: 14, borderRadius: 12, alignItems: 'center', backgroundColor: BRAND },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
})