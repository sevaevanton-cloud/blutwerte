// src/context/AuthContext.tsx
import { onAuthStateChanged, signInAnonymously, User } from 'firebase/auth'
import React, { createContext, useContext, useEffect, useState } from 'react'
import { auth } from '../config/firebase'

interface AuthContextType {
  user: User | null
  uid: string | null
  isAuthReady: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  uid: null,
  isAuthReady: false,
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

  return (
    <AuthContext.Provider value={{ user, uid: user?.uid ?? null, isAuthReady }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)