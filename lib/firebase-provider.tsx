"use client"

console.log("FirebaseProvider module loading")

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import type { User } from "firebase/auth"
import type { FirebaseApp } from "firebase/app"
import type { Firestore } from "firebase/firestore"
import type { Storage } from "firebase/storage"
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
} from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"

// Import from our centralized firebase initialization
import { app, auth, db, storage } from "./firebase-init"

// Export Firestore utilities for convenience
export {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
} from "firebase/firestore"

// Export storage utilities
export { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage"

// Connection status types
type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error"

// Firebase context type
interface FirebaseContextType {
  app: FirebaseApp | null
  auth: typeof auth
  db: Firestore | null
  storage: Storage | null
  user: User | null
  isAdmin: boolean
  isPremium: boolean
  loading: boolean
  connectionStatus: ConnectionStatus
  connectionError: Error | null
  signIn: (email: string, password: string) => Promise<User>
  signUp: (email: string, password: string) => Promise<User>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  retryConnection: () => void
}

// Create context with default values
const FirebaseContext = createContext<FirebaseContextType>({
  app: null,
  auth: null as any,
  db: null,
  storage: null,
  user: null,
  isAdmin: false,
  isPremium: false,
  loading: true,
  connectionStatus: "connecting",
  connectionError: null,
  signIn: async () => {
    throw new Error("Firebase context not initialized")
  },
  signUp: async () => {
    throw new Error("Firebase context not initialized")
  },
  signOut: async () => {
    throw new Error("Firebase context not initialized")
  },
  resetPassword: async () => {
    throw new Error("Firebase context not initialized")
  },
  retryConnection: () => {},
})

export function FirebaseProvider({ children }: { children: ReactNode }) {
  console.log("FirebaseProvider rendering")
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isPremium, setIsPremium] = useState(false)
  const [loading, setLoading] = useState(true)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("connecting")
  const [connectionError, setConnectionError] = useState<Error | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  // Set up auth state listener
  useEffect(() => {
    console.log("FirebaseProvider useEffect running, retry count:", retryCount)

    if (typeof window === "undefined") {
      console.log("Server-side rendering, skipping Firebase setup")
      return
    }

    try {
      setConnectionStatus("connecting")
      setConnectionError(null)

      console.log("Setting up auth state listener in FirebaseProvider")
      console.log("Firebase objects:", {
        app: app ? "initialized" : "null",
        auth: auth ? "initialized" : "null",
        db: db ? "initialized" : "null",
        storage: storage ? "initialized" : "null",
      })

      // Verify that Firebase Auth is properly initialized with API key
      if (!auth) {
        console.error("Firebase auth is not initialized in FirebaseProvider")
        throw new Error("Firebase auth is not initialized")
      }
      
      // Check for auth config
      if (typeof window !== "undefined" && window.ENV && !window.ENV.FIREBASE_API_KEY) {
        console.warn("Firebase API key not found in window.ENV, this could cause auth issues")
      }

      // Test connection by making a simple request
      const testConnection = async () => {
        try {
          if (!db) {
            console.error("Firestore is not initialized in testConnection")
            throw new Error("Firestore is not initialized")
          }

          console.log("Testing Firestore connection")
          // Simple test to verify Firestore connection
          await getDoc(doc(db, "connectionTest", "test"))
          setConnectionStatus("connected")
          console.log("Firebase connected successfully")
        } catch (error) {
          console.warn("Firebase connection test failed, but continuing:", error)
          // We'll still proceed even if this test fails
        }
      }

      testConnection()

      const unsubscribe = onAuthStateChanged(
        auth,
        async (currentUser) => {
          if (currentUser) {
            try {
              // Check admin status
              let adminStatus = false
              if (currentUser.email) {
                // Check if this is the default admin email
                if (currentUser.email === "aaa@gmail.com") {
                  adminStatus = true
                } else if (db) {
                  // Check userRoles collection
                  const adminDoc = await getDoc(doc(db, "userRoles", currentUser.email))
                  adminStatus = adminDoc.exists() && adminDoc.data().isAdmin === true
                }
              }

              // Check user document for additional data
              if (db) {
                const userDoc = await getDoc(doc(db, "users", currentUser.uid))
                if (userDoc.exists()) {
                  const userData = userDoc.data()
                  setUser({ ...currentUser, ...userData } as User)
                  // Use admin status from either source
                  setIsAdmin(userData.isAdmin || adminStatus)
                  setIsPremium(userData.isPremium || false)
                } else {
                  setUser(currentUser)
                  setIsAdmin(adminStatus)
                  setIsPremium(false)
                }
              } else {
                setUser(currentUser)
                setIsAdmin(adminStatus)
                setIsPremium(false)
              }
            } catch (error) {
              console.error("Error fetching user data:", error)
              setUser(currentUser)
              setIsAdmin(currentUser.email === "aaa@gmail.com")
              setIsPremium(false)
            }
          } else {
            setUser(null)
            setIsAdmin(false)
            setIsPremium(false)
          }
          setLoading(false)
        },
        (error) => {
          console.error("Auth state change error:", error)
          setLoading(false)
          setConnectionStatus("error")
          setConnectionError(error instanceof Error ? error : new Error("Unknown auth error"))
        },
      )

      return () => {
        console.log("Cleaning up auth state listener in FirebaseProvider")
        unsubscribe()
      }
    } catch (error) {
      console.error("Firebase initialization error:", error)
      
      // Log more detailed error information
      if (error instanceof Error) {
        console.error("Error name:", error.name)
        console.error("Error message:", error.message)
        
        // Special handling for the authentication error
        if (error.message && error.message.includes("apiKey nor config.authenticator provided")) {
          console.error("This is likely an environment variable configuration issue in your Vercel deployment")
          console.error("Please check that Firebase API key is properly set in environment variables")
        }
      }
      
      setConnectionStatus("error")
      setConnectionError(error instanceof Error ? error : new Error("Firebase initialization failed"))
      setLoading(false)
    }
  }, [retryCount])

  // Authentication methods
  const signIn = async (email: string, password: string): Promise<User> => {
    if (!auth) throw new Error("Firebase auth not initialized")
    const result = await signInWithEmailAndPassword(auth, email, password)
    return result.user
  }

  const signUp = async (email: string, password: string): Promise<User> => {
    if (!auth) throw new Error("Firebase auth not initialized")
    const result = await createUserWithEmailAndPassword(auth, email, password)
    return result.user
  }

  const signOut = async (): Promise<void> => {
    if (!auth) throw new Error("Firebase auth not initialized")
    await firebaseSignOut(auth)
  }

  const resetPassword = async (email: string): Promise<void> => {
    if (!auth) throw new Error("Firebase auth not initialized")
    await sendPasswordResetEmail(auth, email)
  }

  const retryConnection = () => {
    setRetryCount((prev) => prev + 1)
  }

  return (
    <FirebaseContext.Provider
      value={{
        app,
        auth,
        db,
        storage,
        user,
        isAdmin,
        isPremium,
        loading,
        connectionStatus,
        connectionError,
        signIn,
        signUp,
        signOut,
        resetPassword,
        retryConnection,
      }}
    >
      {children}
    </FirebaseContext.Provider>
  )
}

export const useFirebase = () => useContext(FirebaseContext)
