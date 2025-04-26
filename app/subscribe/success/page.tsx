"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { CheckCircle, Loader2 } from "lucide-react"
import Link from "next/link"

export default function SubscriptionSuccessPage() {
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams?.get("session_id")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [subscriptionDetails, setSubscriptionDetails] = useState<any>(null)

  useEffect(() => {
    if (!user) {
      // Store the current URL to redirect back after login
      sessionStorage.setItem("redirectAfterLogin", window.location.pathname + window.location.search)
      router.push("/login")
      return
    }

    if (!sessionId) {
      setError("No session ID found. Please try again.")
      setLoading(false)
      return
    }

    const verifySubscription = async () => {
      try {
        // Verify the session with Stripe
        const response = await fetch(`/api/verify-session?session_id=${sessionId}`)

        if (!response.ok) {
          throw new Error("Failed to verify subscription")
        }

        const data = await response.json()

        if (data.status === "complete") {
          setSubscriptionDetails(data)

          // Update the user's subscription status in Firestore
          const userRef = doc(db, "users", user.uid)
          const userDoc = await getDoc(userRef)

          if (userDoc.exists()) {
            // Only update if needed
            if (!userDoc.data().isPremium) {
              await updateDoc(userRef, {
                isPremium: true,
                subscriptionUpdatedAt: new Date().toISOString(),
              })
            }
          }

          // Dispatch a custom event to notify other components that the subscription has been updated
          window.dispatchEvent(new Event("subscription-updated"))
        } else {
          setError("Your subscription is not active. Please contact support.")
        }
      } catch (error) {
        console.error("Error verifying subscription:", error)
        setError("Failed to verify your subscription. Please try again or contact support.")
      } finally {
        setLoading(false)
      }
    }

    verifySubscription()
  }, [user, sessionId, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <PageHeader title="Processing Your Subscription" />
        <main className="container mx-auto px-4 py-12 max-w-4xl">
          <div className="flex flex-col items-center justify-center space-y-6 text-center">
            <Loader2 className="h-16 w-16 text-purple-600 animate-spin" />
            <h1 className="text-2xl font-bold">Processing Your Subscription</h1>
            <p className="text-gray-600">Please wait while we confirm your subscription...</p>
          </div>
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white">
        <PageHeader title="Subscription Error" />
        <main className="container mx-auto px-4 py-12 max-w-4xl">
          <div className="flex flex-col items-center justify-center space-y-6 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <span className="text-red-600 text-2xl">!</span>
            </div>
            <h1 className="text-2xl font-bold">Subscription Error</h1>
            <p className="text-gray-600">{error}</p>
            <div className="flex flex-col sm:flex-row gap-4 mt-6">
              <Button onClick={() => router.push("/subscribe")}>Try Again</Button>
              <Button variant="outline" asChild>
                <Link href="/settings/subscription">Subscription Settings</Link>
              </Button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <PageHeader title="Subscription Confirmed" />
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="flex flex-col items-center justify-center space-y-6 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold">Thank You for Subscribing!</h1>
          <p className="text-gray-600">
            Your subscription has been confirmed. You now have full access to all premium features.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mt-6">
            <Button onClick={() => router.push("/")}>Go to Dashboard</Button>
            <Button variant="outline" asChild>
              <Link href="/settings/subscription">Manage Subscription</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
