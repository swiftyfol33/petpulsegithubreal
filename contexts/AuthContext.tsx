"use client"

// Add logging at the beginning of the file
console.log("AuthContext module loading")

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import type { User } from "firebase/auth"
import { onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"

// Import from our centralized firebase initialization
import { auth, db } from "@/lib/firebase-init"

interface AuthContextType {
  user: User | null
  loading: boolean
  isAdmin: boolean
  isPremium: boolean
  signOut: (authInstance?: any) => Promise<void>
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAdmin: false,
  isPremium: false,
  signOut: async () => {},
})

// Add more detailed logging in the AuthProvider
export function AuthProvider({ children }: { children: ReactNode }) {
  console.log("AuthProvider rendering")
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isPremium, setIsPremium] = useState(false)

  useEffect(() => {
    console.log("AuthProvider useEffect running")

    // Skip on server-side
    if (typeof window === "undefined") {
      console.log("Server-side rendering, skipping auth setup")
      return
    }

    // Check if auth is available
    if (!auth) {
      console.error("Auth is not available in AuthProvider")
      console.log("auth object:", auth)
      setLoading(false)
      return () => {}
    }

    console.log("Setting up auth state listener in AuthProvider")

    const unsubscribe = onAuthStateChanged(
      auth,
      async (user) => {
        console.log("Auth state changed:", user ? "User logged in" : "No user")

        // Update the admin check to look at the userRoles collection
        if (user) {
          try {
            // First check the user document
            if (!db) {
              console.error("Firestore is not available in AuthProvider")
              setUser(user)
              setLoading(false)
              return
            }

            const userDoc = await getDoc(doc(db, "users", user.uid))

            // Then check the userRoles collection for admin status
            let adminStatus = false
            if (user.email) {
              const adminDoc = await getDoc(doc(db, "userRoles", user.email))
              adminStatus = adminDoc.exists() && adminDoc.data().isAdmin === true
            }

            // Also check if this is the default admin email
            if (user.email === "aaa@gmail.com") {
              adminStatus = true
            }

            if (userDoc.exists()) {
              const userData = userDoc.data()
              setUser({ ...user, ...userData } as User)
              // Use admin status from either source
              setIsAdmin(userData.isAdmin || adminStatus)
              setIsPremium(userData.isPremium || false)
            } else {
              setUser(user)
              setIsAdmin(adminStatus)
              setIsPremium(false)
            }
          } catch (error) {
            console.error("Error fetching user data:", error)
            setUser(user)
            setIsAdmin(user.email === "aaa@gmail.com") // Fallback for default admin
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
      },
    )

    return () => {
      console.log("Cleaning up auth state listener in AuthProvider")
      unsubscribe()
    }
  }, [])

  const signOut = async (authInstance = auth) => {
    try {
      if (!authInstance) {
        throw new Error("Auth instance is not available")
      }
      await firebaseSignOut(authInstance)
    } catch (error) {
      console.error("Error signing out:", error)
      throw error
    }
  }

  return <AuthContext.Provider value={{ user, loading, isAdmin, isPremium, signOut }}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
