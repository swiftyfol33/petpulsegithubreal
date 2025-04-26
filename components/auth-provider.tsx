"use client"

import { createContext, useContext, useState, useEffect } from "react"
import type { ReactNode } from "react"
import { auth, db } from "../lib/firebase"
import { onAuthStateChanged, type User } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"

interface AuthContextType {
  user: User | null
  loading: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Fetch additional user data from Firestore if needed
        const userDoc = await getDoc(doc(db, "users", user.uid))
        if (userDoc.exists()) {
          // Merge Firestore data with Firebase Auth user data
          setUser({ ...user, ...userDoc.data() } as User)
        } else {
          setUser(user)
        }
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  return <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
