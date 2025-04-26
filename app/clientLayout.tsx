"use client"

import type React from "react"

import { useEffect } from "react"
import { AuthProvider } from "@/contexts/AuthContext"
import { FirebaseProvider } from "@/lib/firebase-provider"
import { Toaster } from "@/components/ui/toaster"
import { ErrorBoundary } from "@/components/error-boundary"
import { FirebaseConnectionStatus } from "@/components/firebase-connection-status"

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  console.log("ClientLayout rendering")

  useEffect(() => {
    console.log("ClientLayout mounted")

    // Check if Firebase config is available in window
    if (typeof window !== "undefined") {
      console.log("window.ENV in ClientLayout:", !!window.ENV)
      console.log("Firebase env vars in ClientLayout:", {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? "Set" : "Not set",
      })
    }
  }, [])

  return (
    <ErrorBoundary>
      <FirebaseProvider>
        <AuthProvider>
          <FirebaseConnectionStatus />
          {children}
          <Toaster />
        </AuthProvider>
      </FirebaseProvider>
    </ErrorBoundary>
  )
}
