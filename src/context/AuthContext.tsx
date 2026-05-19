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

  /** Anonymen Account mit Google verknüpfen (Web-Popup) */
  const upgradeWithGoogle = async () => {
    if (!auth.currentUser) throw new Error('Kein Nutzer eingeloggt')
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