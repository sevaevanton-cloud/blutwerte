import { signOut as firebaseSignOut, onAuthStateChanged, signInAnonymously, User } from 'firebase/auth'
import React, { createContext, useContext, useEffect, useState } from 'react'
import { auth } from '../config/firebase'

interface AuthContextType {
  user: User | null
  uid: string | null
  isAuthReady: boolean
  isAnonymous: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  uid: null,
  isAuthReady: false,
  isAnonymous: true,
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

  const signOut = async () => {
    await firebaseSignOut(auth)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{
      user,
      uid: user?.uid ?? null,
      isAuthReady,
      isAnonymous: user?.isAnonymous ?? true,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)