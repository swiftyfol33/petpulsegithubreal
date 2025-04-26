'use client'

import { getFirestore } from "firebase/firestore"
import { getApps, initializeApp } from "firebase/app"

// This file is specifically for client-side only Firebase initialization
// to avoid server-side rendering problems

let clientDb: any = null

export function getClientDb() {
  // Only initialize on the client
  if (typeof window === 'undefined') {
    return null
  }
  
  if (clientDb) {
    return clientDb
  }

  try {
    // Get Firebase config consistently across environments
    const firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || window.ENV?.FIREBASE_API_KEY || "AIzaSyAJCuaWjV4Mh5TuppTOYnC8Ai3agO1jVmo",
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || window.ENV?.FIREBASE_AUTH_DOMAIN || "petpulse-95c5f.firebaseapp.com",
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || window.ENV?.FIREBASE_PROJECT_ID || "petpulse-95c5f",
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || window.ENV?.FIREBASE_STORAGE_BUCKET || "petpulse-95c5f.appspot.com",
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || window.ENV?.FIREBASE_MESSAGING_SENDER_ID || "970470884362",
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || window.ENV?.FIREBASE_APP_ID || "1:970470884362:web:4125c525822c263251cbf3",
    }

    // Initialize Firebase only if it hasn't been initialized already
    let app
    if (!getApps().length) {
      app = initializeApp(firebaseConfig)
    } else {
      app = getApps()[0]
    }
    
    // Initialize Firestore
    clientDb = getFirestore(app)
    return clientDb
  } catch (error) {
    console.error("Error initializing Firebase in client-firebase.ts:", error)
    return null
  }
}