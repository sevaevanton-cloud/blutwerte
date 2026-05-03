import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyC0797C5mvQigWkkqVcnFlCaIOqG1RfQzQ",
  authDomain: "blutwerte-app.firebaseapp.com",
  projectId: "blutwerte-app",
  storageBucket: "blutwerte-app.firebasestorage.app",
  messagingSenderId: "449625142980",
  appId: "1:449625142980:web:55ffe90df20a680677fb91"
}

const app = initializeApp(firebaseConfig)

export const db = getFirestore(app)