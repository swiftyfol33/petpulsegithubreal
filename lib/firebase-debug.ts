"use client"

import { getApps } from "firebase/app"

export function debugFirebaseConfig() {
  // Get environment variables
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  }

  // Check if any values are undefined
  const missingVars = Object.entries(config)
    .filter(([_, value]) => !value)
    .map(([key]) => key)

  // Check if Firebase is already initialized
  const isInitialized = getApps().length > 0

  return {
    config,
    missingVars,
    isInitialized,
    allVarsPresent: missingVars.length === 0,
  }
}
