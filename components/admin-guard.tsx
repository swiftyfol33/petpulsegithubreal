"use client"

import type React from "react"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useFirebase } from "@/lib/firebase-provider"

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin } = useFirebase()
  const router = useRouter()

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      router.push("/")
    }
  }, [user, loading, isAdmin, router])

  if (loading) {
    return <div>Loading...</div>
  }

  if (!user || !isAdmin) {
    return null
  }

  return <>{children}</>
}
