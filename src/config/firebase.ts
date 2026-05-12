import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage'
import { initializeApp } from 'firebase/app'
// @ts-ignore
import { Auth, getAuth, getReactNativePersistence, initializeAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? "AIzaSyC0797C5mvQigWkkqVcnFlCaIOqG1RfQzQ",
  authDomain: "blutwerte-app.firebaseapp.com",
  projectId: "blutwerte-app",
  storageBucket: "blutwerte-app.firebasestorage.app",
  messagingSenderId: "449625142980",
  appId: "1:449625142980:web:55ffe90df20a680677fb91",
}

export const app = initializeApp(firebaseConfig)

export const db = getFirestore(app)

function getFirebaseAuth(): Auth {
  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(ReactNativeAsyncStorage),
    })
  } catch {
    return getAuth(app)
  }
}

export const auth: Auth = getFirebaseAuth()
