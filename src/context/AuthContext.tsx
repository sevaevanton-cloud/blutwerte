// src/context/AuthContext.tsx
import {
  EmailAuthProvider,
  GoogleAuthProvider,
  User,
  signOut as firebaseSignOut,
  linkWithCredential,
  linkWithPopup,
  onAuthStateChanged,
  signInAnonymously,
} from 'firebase/auth'
import React, { createContext, useContext, useEffect, useState } from 'react'
import { Platform } from 'react-native'
import { auth } from '../config/firebase'

interface AuthContextType {
  user: User | null
  uid: string | null
  isAuthReady: boolean
  isAnonymous: boolean
  upgradeWithEmail: (email: string, password: string) => Promise<void>
  upgradeWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  uid: null,
  isAuthReady: false,
  isAnonymous: true,
  upgradeWithEmail: async () => {},
  upgradeWithGoogle: async () => {},
  signOut: async () => {},
})

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isAuthReady, setIsAuthReady] = useState(false)

  useEffect(() => {
    if (!auth) {
      console.error('Firebase Auth nicht initialisiert')
      setIsAuthReady(true)
      return
    }
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser)
      } else {
        try {
          const result = await signInAnonymously(auth)
          setUser(result.user)
        } catch (e) {
          console.error('Anonymes Login fehlgeschlagen', e)
        }
      }
      setIsAuthReady(true)
    })
    return unsubscribe
  }, [])

  /** Anonymen Account mit E-Mail + Passwort verknüpfen */
  const upgradeWithEmail = async (email: string, password: string) => {
    if (!auth.currentUser) throw new Error('Kein Nutzer eingeloggt')
    const credential = EmailAuthProvider.credential(email, password)
    const result = await linkWithCredential(auth.currentUser, credential)
    setUser(result.user)
  }

  /** Anonymen Account mit Google verknüpfen
   *  – Web: linkWithPopup (Popup-Dialog)
   *  – Native (iOS/Android): wirft einen klaren Fehler mit Hinweis, da
   *    linkWithPopup dort nicht verfügbar ist. Für eine vollständige
   *    Native-Implementierung wäre @react-native-google-signin/google-signin nötig.
   */
  const upgradeWithGoogle = async () => {
    if (!auth.currentUser) throw new Error('Kein Nutzer eingeloggt')

    if (Platform.OS !== 'web') {
      throw new Error(
        'Google-Anmeldung ist im Moment nur in der Web-Version verfügbar. ' +
        'Bitte nutze E-Mail & Passwort oder öffne die App im Browser.'
      )
    }

    const provider = new GoogleAuthProvider()
    const result = await linkWithPopup(auth.currentUser, provider)
    setUser(result.user)
  }

  const signOut = async () => {
    await firebaseSignOut(auth)
  }

  return (
    <AuthContext.Provider value={{
      user,
      uid: user?.uid ?? null,
      isAuthReady,
      isAnonymous: user?.isAnonymous ?? true,
      upgradeWithEmail,
      upgradeWithGoogle,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)