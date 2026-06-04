// src/context/AuthContext.tsx
import {
  User,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  signInWithEmailAndPassword,
} from 'firebase/auth'
import React, { createContext, useContext, useEffect, useState } from 'react'
import { auth } from '../config/firebase'

interface AuthContextType {
  user: User | null
  uid: string | null
  isAuthReady: boolean
  signIn: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  uid: null,
  isAuthReady: false,
  signIn: async () => {},
  register: async () => {},
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
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      // Kein anonymes Auto-Login mehr – nur echte User
      setUser(currentUser)
      setIsAuthReady(true)
    })
    return unsubscribe
  }, [])

  const signIn = async (email: string, password: string) => {
    const result = await signInWithEmailAndPassword(auth, email, password)
    setUser(result.user)
  }

  const register = async (email: string, password: string) => {
    const result = await createUserWithEmailAndPassword(auth, email, password)
    setUser(result.user)
  }

  const signOut = async () => {
    await firebaseSignOut(auth)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{
      user,
      uid: user?.uid ?? null,
      isAuthReady,
      signIn,
      register,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
