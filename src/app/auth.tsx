// src/app/auth.tsx
import { router } from 'expo-router'
import React, { useState } from 'react'
import {
  ActivityIndicator, KeyboardAvoidingView, Platform,
  ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native'
import { BRAND } from '../constants/theme'
import { useAuth } from '../context/AuthContext'

const ERROR_MAP: Record<string, string> = {
  'auth/email-already-in-use':   'Diese E-Mail ist bereits registriert.',
  'auth/weak-password':          'Passwort zu schwach – mindestens 6 Zeichen.',
  'auth/user-not-found':         'Kein Konto mit dieser E-Mail gefunden.',
  'auth/wrong-password':         'Falsches Passwort.',
  'auth/invalid-email':          'Ungültige E-Mail-Adresse.',
  'auth/invalid-credential':     'E-Mail oder Passwort falsch.',
  'auth/too-many-requests':      'Zu viele Versuche – bitte kurz warten.',
  'auth/network-request-failed': 'Keine Internetverbindung.',
}

export default function AuthScreen() {
  const { signIn, register } = useAuth()

  const [mode, setMode]         = useState<'login' | 'register'>('login')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  const switchMode = (m: 'login' | 'register') => {
    setMode(m)
    setError(null)
    setConfirm('')
  }

  const handleSubmit = async () => {
    setError(null)

    if (!email.trim() || !password) {
      setError('Bitte E-Mail und Passwort eingeben.')
      return
    }

    if (mode === 'register') {
      if (password.length < 6) {
        setError('Passwort muss mindestens 6 Zeichen haben.')
        return
      }
      if (password !== confirm) {
        setError('Passwörter stimmen nicht überein.')
        return
      }
    }

    setLoading(true)
    try {
      if (mode === 'login') {
        await signIn(email.trim(), password)
      } else {
        await register(email.trim(), password)
      }
      router.replace('/')
    } catch (e: any) {
      setError(ERROR_MAP[e?.code] ?? `Fehler: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={styles.header}>
          <Text style={styles.logo}>🩸</Text>
          <Text style={styles.appName}>Blutwerte</Text>
          <Text style={styles.appSub}>Blutwerte, Ernährung & Gesundheitsanalyse</Text>
        </View>

        {/* Toggle Anmelden / Registrieren */}
        <View style={styles.toggle}>
          {(['login', 'register'] as const).map(m => (
            <TouchableOpacity
              key={m}
              style={[styles.toggleBtn, mode === m && styles.toggleBtnActive]}
              onPress={() => switchMode(m)}
            >
              <Text style={[styles.toggleText, mode === m && styles.toggleTextActive]}>
                {m === 'login' ? 'Anmelden' : 'Registrieren'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Formular */}
        <View style={styles.form}>
          <Text style={styles.fieldLabel}>E-MAIL</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="deine@email.de"
            placeholderTextColor="#9ca3af"
            keyboardType="email-address"
            textContentType="emailAddress"
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            returnKeyType="next"
          />

          <Text style={[styles.fieldLabel, { marginTop: 16 }]}>PASSWORT</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Mindestens 6 Zeichen"
            placeholderTextColor="#9ca3af"
            secureTextEntry
            textContentType={mode === 'register' ? 'newPassword' : 'password'}
            returnKeyType={mode === 'register' ? 'next' : 'done'}
            onSubmitEditing={() => mode === 'login' && handleSubmit()}
          />

          {mode === 'register' && (
            <>
              <Text style={[styles.fieldLabel, { marginTop: 16 }]}>PASSWORT BESTÄTIGEN</Text>
              <TextInput
                style={styles.input}
                value={confirm}
                onChangeText={setConfirm}
                placeholder="Passwort wiederholen"
                placeholderTextColor="#9ca3af"
                secureTextEntry
                textContentType="newPassword"
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
              />
            </>
          )}

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️  {error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.submitBtn, loading && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>
                {mode === 'login' ? 'Anmelden →' : 'Konto erstellen →'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Datenschutz-Hinweis */}
        <Text style={styles.hint}>
          🔒 Deine Daten werden verschlüsselt in Google Firebase gespeichert und sind nur für dich zugänglich.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f8fc' },
  content: { flexGrow: 1, padding: 28, justifyContent: 'center', paddingVertical: 60 },

  header: { alignItems: 'center', marginBottom: 40 },
  logo: { fontSize: 68, marginBottom: 12 },
  appName: { fontSize: 34, fontWeight: '800', color: '#1a1a2e', letterSpacing: -1.5 },
  appSub: { fontSize: 14, color: '#9ca3af', marginTop: 6, textAlign: 'center' },

  toggle: {
    flexDirection: 'row',
    backgroundColor: '#e5e7eb',
    borderRadius: 14,
    padding: 4,
    marginBottom: 28,
  },
  toggleBtn: { flex: 1, paddingVertical: 13, borderRadius: 11, alignItems: 'center' },
  toggleBtnActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleText: { fontSize: 15, fontWeight: '600', color: '#9ca3af' },
  toggleTextActive: { color: '#1a1a2e' },

  form: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  fieldLabel: {
    fontSize: 11, fontWeight: '700', color: '#9ca3af',
    letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8,
  },
  input: {
    backgroundColor: '#f7f8fc', borderRadius: 12, padding: 15,
    fontSize: 16, color: '#1a1a2e', borderWidth: 1.5, borderColor: '#e5e7eb',
  },

  errorBox: {
    backgroundColor: '#fef2f2',
    borderRadius: 10,
    padding: 12,
    marginTop: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#f87171',
  },
  errorText: { fontSize: 13, color: '#dc2626', lineHeight: 19 },

  submitBtn: {
    backgroundColor: BRAND,
    padding: 17,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  hint: { fontSize: 12, color: '#9ca3af', textAlign: 'center', lineHeight: 19 },
})
