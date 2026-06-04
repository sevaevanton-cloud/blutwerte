# Blutwerte-App

Eine mobile Gesundheits-App zur Erfassung und KI-gestützten Analyse von Blutwerten, Ernährung, Supplements und Training. Entwickelt mit React Native (Expo) und Firebase.

## Features

- **Blutwerte erfassen** – manuell oder per KI-gestütztem Foto-Scan (Gemini Vision)
- **Ernährung tracken** – Mahlzeiten mit Makronährstoffen und Kalorienring
- **Supplements & Training** – tägliche Einnahme und Trainingseinheiten dokumentieren
- **KI-Analyse** – Gemini analysiert alle Gesundheitsdaten und gibt personalisierte Empfehlungen
- **Verlauf & Charts** – Blutwerte im Zeitverlauf mit Referenzbereichen visualisieren
- **DSGVO-konform** – Einwilligungsscreen, anonymes Login, Datenspeicherung nur in eigenem Firebase-Projekt

## Tech Stack

| Bereich | Technologie |
|---|---|
| Framework | React Native + Expo (SDK 55) |
| Routing | Expo Router (file-based) |
| Backend | Firebase (Auth, Firestore) |
| KI | Google Gemini 2.5 Flash via Firebase Cloud Functions |
| Sprache | TypeScript |

## Voraussetzungen

- Node.js 18+
- Expo CLI (`npm install -g expo`)
- Firebase-Projekt mit aktivierter Anonymous Authentication und Firestore
- Google Gemini API Key

## Setup

### 1. Repository klonen und Dependencies installieren

```bash
git clone <repo-url>
cd blutwerte-main
npm install
```

### 2. Umgebungsvariablen setzen

```bash
cp .env.example .env
```

Dann in `.env` den echten Firebase API Key eintragen:

```
EXPO_PUBLIC_FIREBASE_API_KEY=dein-firebase-api-key
```

Den Key findest du in der Firebase Console unter **Projekteinstellungen → Allgemein → Web-Apps**.

### 3. Firebase Cloud Functions deployen

```bash
cd functions
npm install
cd ..
```

Gemini API Key als Firebase Secret hinterlegen:

```bash
firebase functions:secrets:set GEMINI_API_KEY
# Eingabeaufforderung: deinen Gemini API Key eingeben
```

Functions deployen:

```bash
firebase deploy --only functions
```

### 4. App starten

```bash
npx expo start
```

Dann im Terminal `w` für Web, `i` für iOS Simulator oder `a` für Android.

## Projektstruktur

```
src/
├── app/                  # Screens (Expo Router)
│   ├── _layout.tsx       # Root-Layout mit Auth/Consent/Profile-Providern
│   ├── index.tsx         # Routing-Logik (Consent → Onboarding → Home)
│   ├── consent.tsx       # DSGVO-Einwilligungsscreen
│   ├── onboarding.tsx    # Ersteinrichtung (Name, Geschlecht, Geburtsjahr)
│   └── (tabs)/           # Haupt-Navigation
│       ├── home.tsx      # Dashboard mit Kalorien und heutigen Einträgen
│       ├── add.tsx       # Einträge hinzufügen
│       ├── history.tsx   # Verlauf und Charts
│       ├── analysis.tsx  # KI-Gesundheitsanalyse
│       └── profile.tsx   # Profil und Account-Verwaltung
├── components/           # Wiederverwendbare UI-Komponenten
├── context/              # React Contexts (Auth, Profile, Consent)
├── services/             # Gemini API-Aufrufe (Scan + Analyse)
├── constants/            # Blutwerte-Definitionen, Theme, Lebensmitteldatenbank
└── utils/                # TDEE-Berechnung, Hilfsfunktionen
functions/
└── src/index.ts          # Firebase Cloud Functions (scanBloodDocument, analyzeHealthData)
```

## Hinweise

- **Google-Login** ist nur in der Web-Version verfügbar. Auf iOS/Android steht E-Mail + Passwort zur Verfügung.
- **Anonymes Login**: Die App erstellt beim ersten Start automatisch einen anonymen Firebase-Account. Daten bleiben erhalten wenn der Account per E-Mail gesichert wird.
- **Consent**: Ohne Einwilligung kann die App nicht genutzt werden (DSGVO-Anforderung). Der Consent wird lokal in AsyncStorage gespeichert.