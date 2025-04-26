"use client"

import { initializeApp, getApps } from "firebase/app"
import { getFirestore } from "firebase/firestore"

// This file is kept for backward compatibility
// Main Firebase initialization should use lib/firebase-init.ts

// Get Firebase config consistently across environments
const getFirebaseConfig = () => {
  // Try window.ENV first, then process.env, then defaults
  if (typeof window !== "undefined" && window.ENV) {
    console.log("firebase.tsx: Using window.ENV for config")
    return {
      apiKey: window.ENV.FIREBASE_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyAJCuaWjV4Mh5TuppTOYnC8Ai3agO1jVmo",
      authDomain: window.ENV.FIREBASE_AUTH_DOMAIN || process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "petpulse-95c5f.firebaseapp.com",
      projectId: window.ENV.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "petpulse-95c5f",
      storageBucket: window.ENV.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "petpulse-95c5f.appspot.com",
      messagingSenderId: window.ENV.FIREBASE_MESSAGING_SENDER_ID || process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "970470884362",
      appId: window.ENV.FIREBASE_APP_ID || process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:970470884362:web:4125c525822c263251cbf3",
    }
  }
  
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyAJCuaWjV4Mh5TuppTOYnC8Ai3agO1jVmo",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "petpulse-95c5f.firebaseapp.com",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "petpulse-95c5f",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "petpulse-95c5f.appspot.com",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "970470884362",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:970470884362:web:4125c525822c263251cbf3",
  }
}

const firebaseConfig = getFirebaseConfig()

// Initialize Firebase only on the client side
let app, db

if (typeof window !== "undefined") {
  try {
    console.log("firebase.tsx: Initializing Firebase with API key:",
      firebaseConfig.apiKey ? "Set (starts with " + firebaseConfig.apiKey.substring(0, 3) + "...)" : "Not set")
    
    if (!getApps().length) {
      app = initializeApp(firebaseConfig)
    } else {
      app = getApps()[0]
    }
    db = getFirestore(app)
  } catch (error) {
    console.error("Error initializing Firebase in firebase.tsx:", error)
    if (error instanceof Error && error.message.includes("apiKey nor config.authenticator provided")) {
      console.error("This is likely an environment variable configuration issue")
    }
  }
}

export { db }
