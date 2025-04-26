"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { toast } from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { Loader2, Crown, AlertCircle, CheckCircle2 } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import Link from "next/link"
import { getUserSubscriptionStatus } from "@/lib/subscription-utils"

export default function SubscriptionSettings() {
  const [isLoading, setIsLoading] = useState(true)
  const [subscriptionData, setSubscriptionData] = useState<any>(null)
  const [isTrialActive, setIsTrialActive] = useState(false)
  const [trialEndDate, setTrialEndDate] = useState<Date | null>(null)
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null)
  const { user } = useAuth()
  const router = useRouter()
  const [isCancelled, setIsCancelled] = useState(false)

  useEffect(() => {
    if (user) {
      fetchSubscriptionData()
    } else {
      setIsLoading(false)
    }
  }, [user])

  const fetchSubscriptionData = async () => {
    if (!user) return
    setIsLoading(true)

    try {
      // Get subscription status
      const subStatus = await getUserSubscriptionStatus(user.uid)
      console.log("Subscription status from getUserSubscriptionStatus:", subStatus)

      // Get user document to check for trial status
      const userDoc = await getDoc(doc(db, "users", user.uid))
      const userData = userDoc.data()
      console.log("User data from Firestore:", {
        hasSubscription: !!userData?.subscription,
        subscriptionId: userData?.subscription?.id,
        stripeSubscriptionId: userData?.stripeSubscriptionId,
      })

      // Check if user is on a trial
      if (userData?.trialActive && userData?.trialEndDate) {
        const endDate = new Date(userData.trialEndDate)
        const now = new Date()

        // Only consider trial active if end date is in the future
        if (endDate > now) {
          setIsTrialActive(true)
          setTrialEndDate(endDate)

          // Calculate days remaining
          const diffTime = Math.abs(endDate.getTime() - now.getTime())
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
          setDaysRemaining(diffDays)
        }
      }

      setSubscriptionData({
        ...subStatus,
        startDate: userData?.subscriptionStartDate || null,
        endDate: userData?.subscriptionEndDate || null,
        customerId: userData?.stripeCustomerId || null,
        subscriptionId: subStatus.subscriptionId || userData?.subscription?.id || null,
        adminGranted: userData?.adminGranted || false,
        expiresAt: userData?.subscriptionExpiresAt || null,
      })

      if (userData?.subscription?.cancelAtPeriodEnd) {
        setIsCancelled(true)
      }
    } catch (error) {
      console.error("Error fetching subscription data:", error)
      toast.error("Failed to load subscription data")
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-[#FAF9F6]">
        <PageHeader title="Subscription" />
        <main className="flex-grow flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </main>
      </div>
    )
  }

  const handleCancelSubscription = async () => {
    if (
      confirm(
        "Are you sure you want to cancel your subscription? You'll still have access until the end of your current billing period.",
      )
    ) {
      try {
        setIsLoading(true)

        // Determine the subscription ID to use
        const subId = subscriptionData.subscriptionId

        console.log("[SETTINGS] Starting subscription cancellation", {
          subscriptionId: subId,
          userId: user.uid,
        })

        if (!subId) {
          throw new Error("No subscription ID found. Cannot cancel subscription.")
        }

        // Use the new App Router API endpoint
        const response = await fetch("/api/cancel-subscription", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            subscriptionId: subId,
            userId: user.uid,
          }),
        })

        console.log("[SETTINGS] Cancellation API response status:", response.status)

        // Check if response is JSON
        const contentType = response.headers.get("content-type")
        if (!contentType || !contentType.includes("application/json")) {
          console.error("[SETTINGS] Response is not JSON:", await response.text())
          throw new Error("Server returned an invalid response format")
        }

        const responseData = await response.json()
        console.log("[SETTINGS] Cancellation API response data:", responseData)

        if (!response.ok) {
          throw new Error(responseData.message || responseData.error || "Failed to cancel subscription")
        }

        toast.success("Subscription successfully cancelled")
        // Refresh subscription data
        console.log("[SETTINGS] Refreshing subscription data after cancellation")
        await fetchSubscriptionData()
      } catch (error) {
        console.error("[SETTINGS] Error cancelling subscription:", error)
        toast.error(error instanceof Error ? error.message : "Failed to cancel subscription")
      } finally {
        setIsLoading(false)
      }
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#FAF9F6]">
      <PageHeader title="Subscription" />
      <main className="flex-grow flex flex-col items-center p-6 pb-24 lg:pb-6">
        <div className="w-full max-w-4xl space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Subscription Details</CardTitle>
                  <CardDescription>Manage your subscription settings here.</CardDescription>
                </div>
                {(subscriptionData?.isActive || isTrialActive) && (
                  <div className="flex items-center gap-1 bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">
                    <Crown className="h-4 w-4" />
                    <span>Premium</span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {isTrialActive && trialEndDate && (
                <div className="space-y-4">
                  <Alert className="bg-blue-50 border-blue-200">
                    <AlertCircle className="h-5 w-5 text-blue-600" />
                    <AlertTitle className="text-blue-800 font-medium">Premium Trial Active</AlertTitle>
                    <AlertDescription className="text-blue-700">
                      You have {daysRemaining} {daysRemaining === 1 ? "day" : "days"} remaining in your free trial. Your
                      trial will end on {trialEndDate.toLocaleDateString()}.
                    </AlertDescription>
                  </Alert>

                  <Card className="border border-blue-200 bg-blue-50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg text-blue-800">How Your Trial Works</CardTitle>
                    </CardHeader>
                    <CardContent className="text-blue-700 space-y-3 pt-0">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <p>Your 7-day free trial gives you full access to all premium features</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <p>No payment information required during the trial period</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <p>When your trial ends, you'll automatically return to the free plan unless you subscribe</p>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex flex-col gap-4 pt-2">
                    <Link href="/subscribe" className="w-full">
                      <Button className="w-full">Manage Subscriptions</Button>
                    </Link>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={async () => {
                        if (
                          confirm(
                            "Are you sure you want to cancel your trial? You'll lose access to premium features immediately.",
                          )
                        ) {
                          try {
                            setIsLoading(true)
                            // Call API to cancel trial
                            const response = await fetch("/api/cancel-trial", {
                              method: "POST",
                              headers: {
                                "Content-Type": "application/json",
                              },
                              body: JSON.stringify({
                                userId: user.uid,
                              }),
                            })

                            if (!response.ok) {
                              const errorData = await response.json()
                              throw new Error(errorData.error || "Failed to cancel trial")
                            }

                            toast.success("Trial successfully cancelled")

                            // Force refresh the page to show updated trial status
                            window.location.reload()
                          } catch (error) {
                            console.error("Error cancelling trial:", error)
                            toast.error(error instanceof Error ? error.message : "Failed to cancel trial")
                          } finally {
                            setIsLoading(false)
                          }
                        }
                      }}
                    >
                      Cancel Trial
                    </Button>
                  </div>
                </div>
              )}

              {subscriptionData?.isActive && !isTrialActive && (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-gray-500">Subscription Plan</h3>
                      <p className="font-medium">
                        {subscriptionData.plan === "monthly" ? "Monthly Premium" : "Yearly Premium"}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-gray-500">Status</h3>
                      <div className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-green-500"></span>
                        <p className="font-medium">Active</p>
                      </div>
                    </div>
                    {subscriptionData.startDate && (
                      <div className="space-y-2">
                        <h3 className="text-sm font-medium text-gray-500">Start Date</h3>
                        <p className="font-medium">{new Date(subscriptionData.startDate).toLocaleDateString()}</p>
                      </div>
                    )}
                    {subscriptionData.endDate && (
                      <div className="space-y-2">
                        <h3 className="text-sm font-medium text-gray-500">Renewal Date</h3>
                        <p className="font-medium">{new Date(subscriptionData.endDate).toLocaleDateString()}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-4 pt-2">
                    <Link
                      href="https://billing.stripe.com/p/login/6oE5mj38C5lq6SQ7ss"
                      target="_blank"
                      className="w-full"
                    >
                      <Button variant="outline" className="w-full">
                        Manage Subscription & Billing
                      </Button>
                    </Link>
                    {!subscriptionData.subscriptionId && !subscriptionData.adminGranted && (
                      <div className="text-sm text-muted-foreground mt-2">
                        Unable to find subscription details. Please try refreshing your subscription data by clicking
                        the button below.
                        <Button
                          variant="link"
                          className="p-0 h-auto text-sm text-blue-600 hover:text-blue-800"
                          onClick={async () => {
                            try {
                              setIsLoading(true)
                              await fetch("/api/stripe-sync-subscription", {
                                method: "POST",
                                headers: {
                                  "Content-Type": "application/json",
                                },
                                body: JSON.stringify({
                                  userId: user.uid,
                                }),
                              })
                              toast.success("Subscription data refreshed. Please reload the page.")
                              await fetchSubscriptionData()
                            } catch (error) {
                              console.error("Error syncing subscription:", error)
                              toast.error("Failed to refresh subscription data.")
                            } finally {
                              setIsLoading(false)
                            }
                          }}
                        >
                          Refresh Subscription Data
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {!subscriptionData?.isActive && !isTrialActive && (
                <div className="space-y-6">
                  <Alert variant="destructive">
                    <AlertCircle className="h-5 w-5" />
                    <AlertTitle>No Active Subscription</AlertTitle>
                    <AlertDescription>
                      You don't currently have an active subscription. Upgrade to Premium to access all features.
                    </AlertDescription>
                  </Alert>

                  <div className="flex justify-center">
                    <Link href="/subscribe">
                      <Button className="flex items-center gap-2">
                        <Crown className="h-4 w-4" />
                        Manage Subscriptions
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {subscriptionData?.isActive && !isTrialActive && isCancelled && (
            <Alert className="bg-amber-50 border-amber-200 mt-4">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <AlertTitle className="text-amber-800 font-medium">Subscription Cancelled</AlertTitle>
              <AlertDescription className="text-amber-700">
                Your subscription has been cancelled but will remain active until the end of your current billing
                period. After this date, you'll be returned to the free plan.
              </AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle>How Subscriptions Work</CardTitle>
              <CardDescription>Understanding your subscription options</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium mb-2">Free Trial</h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <p>Each account is eligible for one 7-day free trial</p>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <p>Full access to all premium features during the trial period</p>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <p>No payment information required to start your trial</p>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <p>Automatically reverts to free plan when trial ends unless you subscribe</p>
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-2">Monthly Subscription</h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <p>Billed monthly at our standard rate</p>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <p>Cancel anytime - you'll maintain premium access until the end of your billing period</p>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <p>Flexible option for short-term needs</p>
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-2">Annual Subscription</h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                      <p>Save 29% compared to monthly billing</p>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                      <p>Billed once annually</p>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                      <p>Best value for long-term users</p>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                      <p>Cancel anytime - you'll maintain premium access until the end of your billing year</p>
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-2">Managing Your Subscription</h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-gray-600 mt-0.5 flex-shrink-0" />
                      <p>Use the "Manage Billing" button to access your customer portal</p>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-gray-600 mt-0.5 flex-shrink-0" />
                      <p>Change between monthly and annual plans at any time</p>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-gray-600 mt-0.5 flex-shrink-0" />
                      <p>Update payment methods or billing information</p>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-gray-600 mt-0.5 flex-shrink-0" />
                      <p>Cancel your subscription if needed</p>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
