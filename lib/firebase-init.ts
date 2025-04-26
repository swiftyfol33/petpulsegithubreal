// lib/firebase-init.ts
// Add more detailed logging at the beginning of the file
console.log("Starting Firebase initialization process")

import { initializeApp, getApps } from "firebase/app"
import { getAuth, connectAuthEmulator } from "firebase/auth"
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore"
import { getStorage, connectStorageEmulator } from "firebase/storage"

// Get Firebase config from window.ENV first, then fallback to process.env, then hardcoded defaults
// This ensures consistent behavior between development and production
const getFirebaseConfig = () => {
  // Check if window.ENV is available (client-side only)
  if (typeof window !== "undefined" && window.ENV) {
    console.log("Using window.ENV for Firebase config")
    return {
      apiKey: window.ENV.FIREBASE_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyAJCuaWjV4Mh5TuppTOYnC8Ai3agO1jVmo",
      authDomain: window.ENV.FIREBASE_AUTH_DOMAIN || process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "petpulse-95c5f.firebaseapp.com",
      projectId: window.ENV.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "petpulse-95c5f",
      storageBucket: window.ENV.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "petpulse-95c5f.appspot.com",
      messagingSenderId: window.ENV.FIREBASE_MESSAGING_SENDER_ID || process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "970470884362",
      appId: window.ENV.FIREBASE_APP_ID || process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:970470884362:web:4125c525822c263251cbf3",
    }
  }
  
  // Fallback to process.env (could be server-side or client-side)
  console.log("Using process.env for Firebase config")
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyAJCuaWjV4Mh5TuppTOYnC8Ai3agO1jVmo",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "petpulse-95c5f.firebaseapp.com",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "petpulse-95c5f",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "petpulse-95c5f.appspot.com",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "970470884362",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:970470884362:web:4125c525822c263251cbf3",
  }
}

// Initialize the Firebase config
const firebaseConfig = getFirebaseConfig()

// Ensure we have a valid API key
if (!firebaseConfig.apiKey) {
  console.error("Firebase API key is missing after all fallbacks. Using hardcoded value.")
  firebaseConfig.apiKey = "AIzaSyAJCuaWjV4Mh5TuppTOYnC8Ai3agO1jVmo"
}

// Add more detailed logging in the initializeFirebase function
function initializeFirebase() {
  console.log("initializeFirebase called, window:", typeof window !== "undefined" ? "available" : "not available")

  if (typeof window === "undefined") {
    console.log("Server-side rendering detected, returning empty objects")
    // Server-side - return empty objects that will be replaced on client
    return {
      app: null,
      auth: null,
      db: null,
      storage: null,
    }
  }

  try {
    // Log the complete Firebase config for debugging
    console.log("Full Firebase config:", {
      apiKey: firebaseConfig.apiKey ? "Set (starts with " + firebaseConfig.apiKey.substring(0, 3) + "...)" : "Not set",
      authDomain: firebaseConfig.authDomain ? "Set" : "Not set",
      projectId: firebaseConfig.projectId ? "Set" : "Not set",
      storageBucket: firebaseConfig.storageBucket ? "Set" : "Not set",
      messagingSenderId: firebaseConfig.messagingSenderId ? "Set" : "Not set",
      appId: firebaseConfig.appId ? "Set" : "Not set",
    })

    // Check if any config values are missing
    const missingConfigValues = Object.entries(firebaseConfig)
      .filter(([_, value]) => !value)
      .map(([key]) => key)

    if (missingConfigValues.length > 0) {
      console.warn("Missing Firebase config values:", missingConfigValues)
    }

    console.log("Checking existing Firebase apps:", getApps().length)

    // Initialize Firebase app if it doesn't exist or get the existing one
    let app
    if (!getApps().length) {
      console.log("No existing Firebase app, initializing new one")
      app = initializeApp(firebaseConfig)
      console.log("Firebase app initialized:", app ? "success" : "failed")
    } else {
      console.log("Using existing Firebase app")
      app = getApps()[0]
    }

    // Initialize services with detailed logging
    console.log("Initializing Firebase Auth")
    const auth = getAuth(app)
    console.log("Auth initialized:", auth ? "success" : "failed")

    console.log("Initializing Firestore")
    const db = getFirestore(app)
    console.log("Firestore initialized:", db ? "success" : "failed")

    console.log("Initializing Storage")
    const storage = getStorage(app)
    console.log("Storage initialized:", storage ? "success" : "failed")

    // Connect to emulators if in development mode
    if (process.env.NODE_ENV === "development") {
      try {
        console.log("Connecting to Firebase emulators")
        connectAuthEmulator(auth, "http://localhost:9099")
        connectFirestoreEmulator(db, "localhost", 8080)
        connectStorageEmulator(storage, "localhost", 9199)
        console.log("Connected to Firebase emulators")
      } catch (e) {
        console.warn("Failed to connect to Firebase emulators:", e)
      }
    }

    console.log("Firebase initialization complete")

    return { app, auth, db, storage }
  } catch (error) {
    console.error("Error initializing Firebase:", error)
    // Log more details about the error
    if (error instanceof Error) {
      console.error("Error name:", error.name)
      console.error("Error message:", error.message)
      console.error("Error stack:", error.stack)
    }
    throw error
  }
}

// Export a singleton instance
export const firebase = initializeFirebase()

// Export individual services for convenience
export const { app, auth, db, storage } = firebase
