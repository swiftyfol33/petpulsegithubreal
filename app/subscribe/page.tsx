"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { doc, updateDoc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/page-header"
import { Crown, Check, Loader2, AlertTriangle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import toast from "react-hot-toast"
import { getUserSubscriptionStatus, type SubscriptionStatus } from "@/lib/subscription-utils"

export default function SubscribePage() {
  const { user } = useAuth()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isTrialDialogOpen, setIsTrialDialogOpen] = useState(false)
  const [isCancelTrialDialogOpen, setIsCancelTrialDialogOpen] = useState(false)
  const [isCancelSubscriptionDialogOpen, setIsCancelSubscriptionDialogOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "yearly" | null>(null)
  const [trialActive, setTrialActive] = useState(false)
  const [trialEndDate, setTrialEndDate] = useState<Date | null>(null)
  const [trialPlan, setTrialPlan] = useState<"monthly" | "yearly" | null>(null)
  // Add a new state variable to track if the user has already used their free trial
  const [hasUsedFreeTrial, setHasUsedFreeTrial] = useState(false)
  // Add subscription status state
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null)
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(true)
  // Add a new state variable to track if the subscription was granted by an admin
  const [isAdminGranted, setIsAdminGranted] = useState(false)

  const monthlyPriceId = "price_1R9CssIhqLHjOc8395LrRpgi"
  const yearlyPriceId = "price_1R9CtSIhqLHjOc83ze75CKtI"
  const testPriceId = "price_1R8n7UIhqLHjOc83SYHPpK3m"

  // Update the useEffect to check if subscription was granted by admin
  useEffect(() => {
    const checkUserStatus = async () => {
      if (!user) {
        setIsLoadingSubscription(false)
        return
      }

      try {
        setIsLoadingSubscription(true)
        // Get subscription status
        const status = await getUserSubscriptionStatus(user.uid)
        setSubscriptionStatus(status)

        // Check trial status
        const userDoc = await getDoc(doc(db, "users", user.uid))
        const userData = userDoc.data()

        // Check if user has already used a free trial
        if (userData?.hasUsedFreeTrial) {
          setHasUsedFreeTrial(true)
        }

        // Check if subscription was granted by admin
        if (userData?.adminGrantedPremium) {
          setIsAdminGranted(true)
        }

        if (userData?.trialActive && userData?.trialEndDate) {
          const endDate = new Date(userData.trialEndDate)
          if (endDate > new Date()) {
            setTrialActive(true)
            setTrialEndDate(endDate)
            setTrialPlan(userData.trialPlan || "monthly")
          }
        }
      } catch (error) {
        console.error("Error checking user status:", error)
      } finally {
        setIsLoadingSubscription(false)
      }
    }

    checkUserStatus()
  }, [user])

  const handleSubscribe = async (priceId: string) => {
    if (!user) {
      toast.error("You must be logged in to subscribe")
      router.push("/login")
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          priceId,
          userId: user.uid,
          userEmail: user.email,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to create checkout session")
      }

      const data = await response.json()
      router.push(data.url)
    } catch (error) {
      console.error("Error creating checkout session:", error)
      toast.error("Failed to start subscription process. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  // Update the handleCancelSubscription function to handle admin-granted subscriptions
  const handleCancelSubscription = async () => {
    if (!user) {
      toast.error("No active subscription found")
      return
    }

    setIsLoading(true)
    try {
      console.log("[CLIENT] Starting subscription cancellation process", {
        isAdminGranted,
        userId: user.uid,
        subscriptionId: subscriptionStatus?.subscriptionId,
      })

      if (isAdminGranted) {
        // For admin-granted subscriptions, just update the user document
        console.log("[CLIENT] Cancelling admin-granted subscription")
        await updateDoc(doc(db, "users", user.uid), {
          isPremium: false,
          adminGrantedPremium: false,
        })

        toast.success("Your admin-granted premium access has been cancelled.")
      } else if (subscriptionStatus?.subscriptionId) {
        // For regular subscriptions, call the API
        console.log("[CLIENT] Cancelling regular subscription via API", {
          subscriptionId: subscriptionStatus.subscriptionId,
        })

        const response = await fetch("/api/cancel-subscription", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            subscriptionId: subscriptionStatus.subscriptionId,
            userId: user.uid,
          }),
        })

        console.log("[CLIENT] API response status:", response.status)

        const responseData = await response.json()
        console.log("[CLIENT] API response data:", responseData)

        if (!response.ok) {
          throw new Error(responseData.message || responseData.error || "Failed to cancel subscription")
        }

        toast.success("Your subscription has been cancelled. You'll have access until the end of your billing period.")
      } else {
        console.log("[CLIENT] No subscription found to cancel", { subscriptionStatus })
        throw new Error("No subscription found to cancel")
      }

      // Refresh subscription status
      console.log("[CLIENT] Refreshing subscription status")
      const updatedStatus = await getUserSubscriptionStatus(user.uid)
      console.log("[CLIENT] Updated subscription status:", updatedStatus)
      setSubscriptionStatus(updatedStatus)
      setIsAdminGranted(false)

      setIsCancelSubscriptionDialogOpen(false)
    } catch (error) {
      console.error("[CLIENT] Error cancelling subscription:", error)
      toast.error(error instanceof Error ? error.message : "Failed to cancel subscription. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const openTrialDialog = (plan: "monthly" | "yearly") => {
    setSelectedPlan(plan)
    setIsTrialDialogOpen(true)
  }

  const openCancelTrialDialog = () => {
    setIsCancelTrialDialogOpen(true)
  }

  const openCancelSubscriptionDialog = () => {
    setIsCancelSubscriptionDialogOpen(true)
  }

  const startFreeTrial = async () => {
    if (!user) {
      toast.error("You must be logged in to start a free trial")
      router.push("/login")
      return
    }

    setIsLoading(true)
    try {
      // Check if user has already used a free trial
      const userDoc = await getDoc(doc(db, "users", user.uid))
      const userData = userDoc.data()

      if (userData?.hasUsedFreeTrial) {
        toast.error("You have already used your free trial")
        setIsTrialDialogOpen(false)
        setIsLoading(false)
        return
      }

      // Set trial end date to 7 days from now
      const trialEndDate = new Date()
      trialEndDate.setDate(trialEndDate.getDate() + 7)

      // Update user document with trial information
      await updateDoc(doc(db, "users", user.uid), {
        isPremium: true,
        trialActive: true,
        trialEndDate: trialEndDate.toISOString(),
        trialPlan: selectedPlan,
        hasUsedFreeTrial: true,
        trialStartDate: new Date().toISOString(),
      })

      toast.success("Your 7-day free trial has started!")
      router.push("/")
    } catch (error) {
      console.error("Error starting free trial:", error)
      toast.error("Failed to start free trial. Please try again.")
    } finally {
      setIsLoading(false)
      setIsTrialDialogOpen(false)
    }
  }

  const cancelTrial = async () => {
    if (!user) {
      toast.error("You must be logged in to cancel your trial")
      return
    }

    setIsLoading(true)
    try {
      // Update user document to cancel trial
      await updateDoc(doc(db, "users", user.uid), {
        isPremium: false,
        trialActive: false,
        trialEndDate: null,
      })

      setTrialActive(false)
      setTrialEndDate(null)
      toast.success("Your trial has been cancelled")
    } catch (error) {
      console.error("Error cancelling trial:", error)
      toast.error("Failed to cancel trial. Please try again.")
    } finally {
      setIsLoading(false)
      setIsCancelTrialDialogOpen(false)
    }
  }

  // Calculate days left in trial
  const getDaysLeft = () => {
    if (!trialEndDate) return 0

    const now = new Date()
    const diffTime = trialEndDate.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return Math.max(0, diffDays)
  }

  // Format date to readable format
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Unknown date"
    const date = new Date(dateString)
    return date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })
  }

  // Check if user has an active subscription
  const hasActiveSubscription = subscriptionStatus?.isActive && !trialActive

  // Check if subscription is set to cancel at period end
  const isCancellingSubscription = subscriptionStatus?.cancelAtPeriodEnd

  // Determine if the user is on a monthly or yearly plan
  const isMonthlyPlan = subscriptionStatus?.plan === "monthly"
  const isYearlyPlan = subscriptionStatus?.plan === "yearly"

  return (
    <div className="flex flex-col min-h-screen bg-[#FFFFFF]">
      <PageHeader title="Premium Subscription" />
      <main className="flex-grow flex flex-col items-center p-6 pb-24 lg:pb-6">
        <div className="w-full max-w-5xl space-y-8">
          <div className="text-center space-y-3">
            <h1 className="text-3xl font-bold">Upgrade to Premium</h1>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Get access to all premium features and support the development of the app.
            </p>
          </div>

          {isLoadingSubscription ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
            </div>
          ) : (
            <>
              {trialActive && (
                <Alert className="bg-blue-50 border-blue-200">
                  <AlertTriangle className="h-5 w-5 text-blue-600" />
                  <AlertTitle className="text-blue-800">Active Trial</AlertTitle>
                  <AlertDescription className="text-blue-700">
                    You currently have an active Trial of our {trialPlan === "monthly" ? "Monthly" : "Yearly"} Premium
                    plan. You have {getDaysLeft()} day{getDaysLeft() !== 1 ? "s" : ""} left in your trial.
                    {trialEndDate && (
                      <span className="block mt-1">
                        Your trial ends on {trialEndDate.toLocaleDateString()} at {trialEndDate.toLocaleTimeString()}.
                      </span>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {hasActiveSubscription && isCancellingSubscription && (
                <Alert className="bg-amber-50 border-amber-200">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  <AlertTitle className="text-amber-800">Subscription Ending</AlertTitle>
                  <AlertDescription className="text-amber-700">
                    Your {subscriptionStatus?.plan} subscription has been cancelled but will remain active until{" "}
                    {formatDate(subscriptionStatus?.expiresAt)}. You can resubscribe before this date to continue your
                    premium access without interruption.
                  </AlertDescription>
                </Alert>
              )}

              {hasActiveSubscription && !isCancellingSubscription && (
                <Alert className="bg-green-50 border-green-200">
                  <Check className="h-5 w-5 text-green-600" />
                  <AlertTitle className="text-green-800">Active Subscription</AlertTitle>
                  <AlertDescription className="text-green-700">
                    {isAdminGranted
                      ? "You currently have premium access granted by an administrator."
                      : `You currently have an active ${subscriptionStatus?.plan === "monthly" ? "Monthly" : "Yearly"} Premium
                      subscription. Your subscription will renew on ${formatDate(subscriptionStatus?.expiresAt)}.`}
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Monthly Plan */}
                <div
                  className={`rounded-xl p-6 ${isMonthlyPlan ? "border-2 border-white" : ""} bg-[#431170] text-white shadow-[inset_0px_-13px_30px_0px_rgba(133,75,211,1)] relative overflow-hidden`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-2xl font-bold">Monthly</h3>
                      <p className="text-gray-200">Billed monthly</p>
                    </div>
                    <div className="flex items-center justify-center bg-white/20 backdrop-blur-sm rounded-full p-2">
                      <Crown className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div className="mb-6">
                    <span className="text-3xl font-bold">$12.99</span>
                    <span className="text-gray-200 ml-2">/month</span>
                  </div>
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-center">
                      <Check className="h-5 w-5 text-white mr-2 bg-purple-500/30 rounded-full p-0.5" />
                      <span>All premium features</span>
                    </li>
                    <li className="flex items-center">
                      <Check className="h-5 w-5 text-white mr-2 bg-purple-500/30 rounded-full p-0.5" />
                      <span>Priority support</span>
                    </li>
                    <li className="flex items-center">
                      <Check className="h-5 w-5 text-white mr-2 bg-purple-500/30 rounded-full p-0.5" />
                      <span>Cancel anytime</span>
                    </li>
                  </ul>
                  <div className="flex flex-col space-y-3">
                    {hasActiveSubscription ? (
                      isMonthlyPlan || isAdminGranted ? (
                        // Active Monthly Plan or Admin Granted - Show Cancel Button
                        <Button
                          variant="outline"
                          className="w-full bg-white/10 hover:bg-white/20 text-white border-white/30"
                          onClick={openCancelSubscriptionDialog}
                          disabled={isLoading || isCancellingSubscription}
                        >
                          {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                          {isCancellingSubscription ? "Cancellation Pending" : "Cancel Subscription"}
                        </Button>
                      ) : (
                        // User has Yearly Plan - Show Disabled Button
                        <Button
                          variant="outline"
                          className="w-full bg-white/10 text-white/50 border-white/20"
                          disabled={true}
                        >
                          Cancel Yearly Plan First
                        </Button>
                      )
                    ) : (
                      // No Active Subscription - Show Subscribe Button
                      <Button
                        className="w-full bg-white text-[#431170] hover:bg-white/90"
                        onClick={() => handleSubscribe("price_1R9CssIhqLHjOc8395LrRpgi")}
                        disabled={isLoading || trialActive}
                      >
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        {trialActive ? "Cancel Trial to Continue" : "Subscribe Now"}
                      </Button>
                    )}
                    {trialActive
                      ? trialPlan === "monthly" && (
                          <Button
                            variant="outline"
                            className="w-full bg-white/10 hover:bg-white/20 text-white border-white/30"
                            onClick={openCancelTrialDialog}
                            disabled={isLoading}
                          >
                            Cancel Trial
                          </Button>
                        )
                      : !hasActiveSubscription && (
                          <Button
                            variant="outline"
                            className="w-full bg-white/10 hover:bg-white/20 text-white border-white/30"
                            onClick={() => openTrialDialog("monthly")}
                            disabled={isLoading || hasUsedFreeTrial}
                          >
                            {hasUsedFreeTrial ? "Free Trial Used" : "Start 7-Day Free Trial"}
                          </Button>
                        )}
                  </div>
                </div>

                {/* Yearly Plan */}
                <div
                  className={`rounded-xl p-6 ${isYearlyPlan ? "border-2 border-white" : ""} bg-[#17704A] text-white shadow-[inset_0px_-13px_30px_0px_rgba(75,211,133,1)] relative overflow-hidden`}
                >
                  <div className="absolute top-0 right-0 bg-white text-[#17704A] px-3 py-1 text-xs font-bold rounded-bl-lg">
                    BEST VALUE
                  </div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-2xl font-bold">Yearly</h3>
                      <p className="text-gray-200">Billed annually</p>
                    </div>
                    <div className="flex items-center justify-center bg-white/20 backdrop-blur-sm rounded-full p-2">
                      <Crown className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div className="mb-6">
                    <span className="text-3xl font-bold">$109.99</span>
                    <span className="text-gray-200 ml-2">/year</span>
                    <div className="text-white font-medium text-sm mt-1 bg-green-500/30 inline-block px-2 py-0.5 rounded-full">
                      Save $45.89 (29%)
                    </div>
                  </div>
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-center">
                      <Check className="h-5 w-5 text-white mr-2 bg-green-500/30 rounded-full p-0.5" />
                      <span>All premium features</span>
                    </li>
                    <li className="flex items-center">
                      <Check className="h-5 w-5 text-white mr-2 bg-green-500/30 rounded-full p-0.5" />
                      <span>Priority support</span>
                    </li>
                    <li className="flex items-center">
                      <Check className="h-5 w-5 text-white mr-2 bg-green-500/30 rounded-full p-0.5" />
                      <span>Cancel anytime</span>
                    </li>
                    <li className="flex items-center">
                      <Check className="h-5 w-5 text-white mr-2 bg-green-500/30 rounded-full p-0.5" />
                      <span>29% discount</span>
                    </li>
                  </ul>
                  <div className="flex flex-col space-y-3">
                    {hasActiveSubscription ? (
                      isYearlyPlan || isAdminGranted ? (
                        // Active Yearly Plan or Admin Granted - Show Cancel Button
                        <Button
                          variant="outline"
                          className="w-full bg-white/10 hover:bg-white/20 text-white border-white/30"
                          onClick={openCancelSubscriptionDialog}
                          disabled={isLoading || isCancellingSubscription}
                        >
                          {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                          {isCancellingSubscription ? "Cancellation Pending" : "Cancel Subscription"}
                        </Button>
                      ) : (
                        // User has Monthly Plan - Show Disabled Button
                        <Button
                          variant="outline"
                          className="w-full bg-white/10 text-white/50 border-white/20"
                          disabled={true}
                        >
                          Cancel Monthly Plan First
                        </Button>
                      )
                    ) : (
                      // No Active Subscription - Show Subscribe Button
                      <Button
                        className="w-full bg-white text-[#17704A] hover:bg-white/90"
                        onClick={() => handleSubscribe("price_1R9CtSIhqLHjOc83ze75CKtI")}
                        disabled={isLoading || trialActive}
                      >
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        {trialActive ? "Cancel Trial to Continue" : "Subscribe Now"}
                      </Button>
                    )}
                    {trialActive
                      ? trialPlan === "yearly" && (
                          <Button
                            variant="outline"
                            className="w-full bg-white/10 hover:bg-white/20 text-white border-white/30"
                            onClick={openCancelTrialDialog}
                            disabled={isLoading}
                          >
                            Cancel Trial
                          </Button>
                        )
                      : !hasActiveSubscription && (
                          <Button
                            variant="outline"
                            className="w-full bg-white/10 hover:bg-white/20 text-white border-white/30"
                            onClick={() => openTrialDialog("yearly")}
                            disabled={isLoading || hasUsedFreeTrial}
                          >
                            {hasUsedFreeTrial ? "Free Trial Used" : "Start 7-Day Free Trial"}
                          </Button>
                        )}
                  </div>
                </div>
              </div>

              <div className="text-center text-sm text-gray-500 mt-8">
                <p>
                  By subscribing, you agree to our Terms of Service and Privacy Policy. You can cancel your subscription
                  at any time.
                </p>
              </div>
            </>
          )}
        </div>
      </main>

      {/* Free Trial Confirmation Dialog */}
      <Dialog open={isTrialDialogOpen} onOpenChange={setIsTrialDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start Your 7-Day Free Trial</DialogTitle>
            <DialogDescription>
              You're about to start a 7-day free trial of our {selectedPlan === "monthly" ? "Monthly" : "Yearly"}{" "}
              Premium plan. No credit card required. After the trial ends, you'll need to subscribe to continue enjoying
              premium features.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <h4 className="font-medium mb-2">What's included:</h4>
            <ul className="space-y-2">
              <li className="flex items-center">
                <Check className="h-4 w-4 text-green-500 mr-2" />
                <span className="text-sm">All premium features for 7 days</span>
              </li>
              <li className="flex items-center">
                <Check className="h-4 w-4 text-green-500 mr-2" />
                <span className="text-sm">No automatic billing after trial ends</span>
              </li>
              <li className="flex items-center">
                <Check className="h-4 w-4 text-green-500 mr-2" />
                <span className="text-sm">Cancel anytime</span>
              </li>
            </ul>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTrialDialogOpen(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={startFreeTrial} disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Start Free Trial
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Trial Confirmation Dialog */}
      <Dialog open={isCancelTrialDialogOpen} onOpenChange={setIsCancelTrialDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Your Premium Trial</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel your premium trial? You will immediately lose access to all premium
              features.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Alert className="bg-amber-50 border-amber-200">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-800 text-sm">Important</AlertTitle>
              <AlertDescription className="text-amber-700 text-sm">
                If you cancel your trial, you won't be able to start another free trial in the future.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCancelTrialDialogOpen(false)} disabled={isLoading}>
              Keep Trial
            </Button>
            <Button variant="destructive" onClick={cancelTrial} disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Cancel Trial
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Subscription Confirmation Dialog */}
      <Dialog open={isCancelSubscriptionDialogOpen} onOpenChange={setIsCancelSubscriptionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Your {isAdminGranted ? "Premium Access" : "Subscription"}</DialogTitle>
            <DialogDescription>
              {isAdminGranted
                ? "This premium access was granted to you by an administrator. Are you sure you want to cancel it? You will immediately lose access to all premium features."
                : "Are you sure you want to cancel your premium subscription? You will continue to have access until the end of your current billing period."}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Alert className="bg-amber-50 border-amber-200">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-800 text-sm">Important</AlertTitle>
              <AlertDescription className="text-amber-700 text-sm">
                {isAdminGranted
                  ? "Once cancelled, you will need to contact an administrator to regain premium access."
                  : `After cancellation, your subscription will remain active until ${formatDate(subscriptionStatus?.expiresAt)}. You can resubscribe anytime before then to continue without interruption.`}
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCancelSubscriptionDialogOpen(false)} disabled={isLoading}>
              {isAdminGranted ? "Keep Premium Access" : "Keep Subscription"}
            </Button>
            <Button variant="destructive" onClick={handleCancelSubscription} disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirm Cancellation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
