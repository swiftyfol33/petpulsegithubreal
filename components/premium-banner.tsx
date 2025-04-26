"use client"

import { useAuth } from "@/contexts/AuthContext"
import { useState, useEffect } from "react"
import { db } from "@/lib/firebase"
import { doc, getDoc } from "firebase/firestore"
import { SubscriptionBanner } from "./subscription-banner"
import { CheckCircle, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter, usePathname } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { getUserSubscriptionStatus } from "@/lib/subscription-utils"

export function PremiumBanner({ className = "" }: { className?: string }) {
  const { user } = useAuth()
  const [isPremium, setIsPremium] = useState(false)
  const [isTrialActive, setIsTrialActive] = useState(false)
  const [isTrialExpired, setIsTrialExpired] = useState(false)
  const [daysRemaining, setDaysRemaining] = useState(0)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const [isCancelled, setIsCancelled] = useState(false)
  const pathname = usePathname()

  // Track last refresh time to prevent excessive refreshes
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(0)

  useEffect(() => {
    const checkPremiumStatus = async () => {
      if (user) {
        try {
          setLoading(true)

          // Use the subscription-utils to get the latest subscription status
          // This ensures we're using the same logic across the app
          const subscriptionStatus = await getUserSubscriptionStatus(user.uid)

          // Update states based on subscription status
          if (subscriptionStatus.isActive) {
            setIsPremium(true)
            setIsTrialExpired(false)

            // Check if it's a trial
            if (subscriptionStatus.isTrialActive) {
              setIsTrialActive(true)
              if (subscriptionStatus.trialEndDate) {
                const trialEnd = new Date(subscriptionStatus.trialEndDate)
                const now = new Date()

                // Calculate days remaining
                const diffTime = Math.abs(trialEnd.getTime() - now.getTime())
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
                setDaysRemaining(diffDays)
              }
            } else {
              setIsTrialActive(false)
              setDaysRemaining(null)
            }

            // Check if subscription is cancelled but still active
            setIsCancelled(subscriptionStatus.cancelAtPeriodEnd || false)
          } else {
            // Check if trial has expired
            const userDoc = await getDoc(doc(db, "users", user.uid))
            const userData = userDoc.data()

            if (userData?.trialActive === false && userData?.hasUsedFreeTrial === true) {
              setIsTrialExpired(true)
            } else {
              setIsTrialExpired(false)
            }

            setIsPremium(false)
            setIsTrialActive(false)
            setDaysRemaining(null)
          }

          // Update last refresh time
          setLastRefreshTime(Date.now())
        } catch (error) {
          console.error("Error checking premium status:", error)
        } finally {
          setLoading(false)
        }
      } else {
        setIsPremium(false)
        setIsTrialActive(false)
        setIsTrialExpired(false)
        setDaysRemaining(null)
        setLoading(false)
      }
    }

    // Check if we should refresh (on mount or when returning from Stripe)
    const shouldRefresh = () => {
      // Always refresh on initial mount
      if (lastRefreshTime === 0) return true

      // Refresh if returning from Stripe (check URL parameters or referrer)
      const isReturningFromStripe =
        document.referrer.includes("stripe.com") || window.location.search.includes("session_id")

      // Refresh if it's been more than 30 seconds since last refresh
      const hasTimeElapsed = Date.now() - lastRefreshTime > 30000

      return isReturningFromStripe || hasTimeElapsed
    }

    if (shouldRefresh()) {
      checkPremiumStatus()
    }
  }, [user, pathname, lastRefreshTime])

  // Function to manually refresh subscription status
  const refreshSubscriptionStatus = () => {
    // Reset last refresh time to force a refresh
    setLastRefreshTime(0)
  }

  // Listen for custom event that might be triggered after subscription changes
  useEffect(() => {
    const handleSubscriptionUpdated = () => {
      refreshSubscriptionStatus()
    }

    window.addEventListener("subscription-updated", handleSubscriptionUpdated)

    return () => {
      window.removeEventListener("subscription-updated", handleSubscriptionUpdated)
    }
  }, [])

  if (loading) return null

  if (isTrialExpired) {
    return (
      <div className={`w-full bg-gradient-to-r from-red-600 to-orange-600 text-white p-4 ${className}`}>
        <div className="container mx-auto max-w-4xl flex flex-col md:flex-row items-center justify-between">
          <div className="flex items-center mb-3 md:mb-0">
            <AlertTriangle className="w-6 h-6 mr-2" />
            <h2 className="text-xl font-bold">Your Free Trial Has Ended</h2>
            <p className="text-white/90 ml-2 hidden md:block">Subscribe now to continue enjoying premium features!</p>
          </div>
          <Button onClick={() => router.push("/subscribe")} className="bg-white text-red-600 hover:bg-gray-100">
            Subscribe Now
          </Button>
        </div>
      </div>
    )
  }

  if (isPremium) {
    return (
      <div
        className={`w-full bg-[#17704A] shadow-[inset_0px_-13px_30px_0px_rgba(75,211,133,1)] text-white p-4 ${className}`}
      >
        <div className="container mx-auto max-w-4xl flex flex-col items-center justify-center">
          <div className="flex flex-col items-center text-center">
            <div className="flex items-center">
              <CheckCircle className="w-6 h-6 mr-2" />
              <h2 className="text-xl font-bold">You're a Premium User</h2>
            </div>
            <p className="text-white/90 mt-1">Enjoy unlimited access to all premium features!</p>
          </div>

          {isTrialActive && (
            <div className="mt-2 flex items-center">
              <Badge className="bg-white text-green-600 hover:bg-gray-100">
                {daysRemaining === 1 ? "1 day" : `${daysRemaining} days`} remaining in your free trial
              </Badge>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (isCancelled) {
    return (
      <div className={`w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white p-4 ${className}`}>
        <div className="container mx-auto max-w-4xl flex flex-col md:flex-row justify-between items-center">
          <p className="text-lg font-medium mb-4 md:mb-0">
            Your subscription will end soon. Renew to keep your premium benefits!
          </p>
          <Link
            href="/subscribe"
            className="bg-white text-amber-600 px-6 py-2 rounded-md font-medium hover:bg-amber-50 transition-colors"
          >
            Renew Subscription
          </Link>
        </div>
      </div>
    )
  }

  return (
    <SubscriptionBanner
      text="Get unlimited access to AI analysis, vet consultations, and more!"
      className={className}
    />
  )
}
