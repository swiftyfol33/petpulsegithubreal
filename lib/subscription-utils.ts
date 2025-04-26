import { db } from "./firebase"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { getCurrentUserId, getCurrentUserEmail } from "./stripe-auth-wrapper"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
})

export interface SubscriptionStatus {
  isActive: boolean
  plan: "free" | "monthly" | "yearly" | null
  expiresAt: string | null
  subscriptionId: string | null
  isTrialActive?: boolean
  trialEndDate?: string | null
  cancelAtPeriodEnd?: boolean
  adminGranted?: boolean
}

export async function getUserSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
  console.log(`[SUBSCRIPTION] Starting subscription status check for user: ${userId}`)
  try {
    console.log(`[SUBSCRIPTION] Checking subscription status for user: ${userId}`)

    // First, try to get the user document from Firestore
    console.log(`[SUBSCRIPTION] Fetching user document from Firestore`)
    const userDoc = await getDoc(doc(db, "users", userId))

    if (!userDoc.exists()) {
      console.log(`[SUBSCRIPTION] No user found with ID: ${userId}`)
      return {
        isActive: false,
        plan: "free" as const,
        expiresAt: null,
        subscriptionId: null,
        isTrialActive: false,
        trialEndDate: null,
        adminGranted: false,
      }
    }

    const userData = userDoc.data()
    console.log(
      `[SUBSCRIPTION] User data found in Firestore:`,
      JSON.stringify({
        hasSubscription: !!userData.subscription,
        subscriptionId: userData.subscription?.id,
        status: userData.subscription?.status,
        cancelAtPeriodEnd: userData.subscription?.cancelAtPeriodEnd,
        adminGranted: userData.adminGrantedPremium || userData.subscription?.adminGranted,
        isPremium: userData.isPremium,
      }),
    )

    // Check for admin-granted premium status
    if (userData.adminGrantedPremium || (userData.subscription && userData.subscription.adminGranted)) {
      console.log(`[SUBSCRIPTION] User has admin-granted premium`)
      return {
        isActive: true,
        plan: "free" as const, // We'll use "free" but show it as admin-granted in the UI
        expiresAt: null,
        subscriptionId: null,
        isTrialActive: false,
        trialEndDate: null,
        adminGranted: true,
      }
    }

    // Check if user has isPremium flag set but no subscription data
    // This can happen if the subscription data wasn't properly synced
    if (userData.isPremium && !userData.subscription) {
      console.log(`[SUBSCRIPTION] User has isPremium flag but no subscription data. Attempting to sync.`)

      // We'll still return isPremium true but trigger a sync in the background
      // This ensures the UI shows premium while we fetch the latest data
      try {
        // Attempt to sync in the background
        fetch("/api/sync-subscription", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        }).catch((e) => console.error("Background sync error:", e))
      } catch (e) {
        console.error("Error triggering background sync:", e)
      }

      return {
        isActive: true,
        plan: "free" as const, // Default to free until we know the plan
        expiresAt: null,
        subscriptionId: null,
        isTrialActive: false,
        trialEndDate: null,
        adminGranted: false,
      }
    }

    // Get the email directly from Firebase Auth
    let userEmail: string | null = null
    const currentUserId = getCurrentUserId()

    if (currentUserId && currentUserId === userId) {
      // If the current user is the one we're checking
      userEmail = getCurrentUserEmail() || null
      console.log(`[SUBSCRIPTION] Using email from current Firebase Auth user: ${userEmail}`)
    } else {
      // If we're checking a different user (admin scenario)
      // We need to get the email from Firestore since we can't access other users' Auth data
      // Try to find email in the user document
      if (userData.email) {
        userEmail = userData.email
        console.log(`[SUBSCRIPTION] Using email from Firestore user document: ${userEmail}`)
      }
    }

    // If we still don't have an email, check if it's stored in the subscription data
    if (!userEmail && userData.subscription?.customerEmail) {
      userEmail = userData.subscription.customerEmail
      console.log(`[SUBSCRIPTION] Using email from subscription data: ${userEmail}`)
    }

    console.log(`[SUBSCRIPTION] Final user email: ${userEmail || "Not found"}`)

    if (!userEmail) {
      console.log(`[SUBSCRIPTION] Could not determine email for user: ${userId}`)
      return {
        isActive: false,
        plan: "free" as const,
        expiresAt: null,
        subscriptionId: null,
        isTrialActive: false,
        trialEndDate: null,
        adminGranted: false,
      }
    }

    // Check if user has subscription data in Firestore
    if (userData.subscription?.status === "active" || userData.subscription?.status === "trialing") {
      console.log(`[SUBSCRIPTION] Found active subscription in Firestore for user: ${userId}`)

      const monthlyPriceId = "price_1R9CssIhqLHjOc8395LrRpgi"
      const yearlyPriceId = "price_1R9CtSIhqLHjOc83ze75CKtI"

      let plan: "free" | "monthly" | "yearly" = "free"
      if (userData.subscription.priceId === monthlyPriceId) {
        plan = "monthly"
      } else if (userData.subscription.priceId === yearlyPriceId) {
        plan = "yearly"
      }

      console.log(`[SUBSCRIPTION] Determined plan from Firestore: ${plan}`)

      return {
        isActive: true,
        plan,
        expiresAt: userData.subscription.currentPeriodEnd,
        subscriptionId: userData.subscription.id,
        isTrialActive: userData?.trialActive || false,
        trialEndDate: userData?.trialEndDate || null,
        cancelAtPeriodEnd: userData.subscription.cancelAtPeriodEnd || false,
        adminGranted: userData.subscription.adminGranted || false,
      }
    }

    // If no active subscription in Firestore, check Stripe directly using email
    console.log(
      `[SUBSCRIPTION] No active subscription in Firestore. Checking Stripe for subscriptions with email: ${userEmail}`,
    )

    // Get customer by email
    const customers = await stripe.customers.list({
      email: userEmail,
      limit: 1,
    })

    console.log(`[SUBSCRIPTION] Stripe customers found for email ${userEmail}: ${customers.data.length}`)

    if (customers.data.length === 0) {
      console.log(`[SUBSCRIPTION] No Stripe customer found with email: ${userEmail}`)
      return {
        isActive: false,
        plan: "free" as const,
        expiresAt: null,
        subscriptionId: null,
        isTrialActive: false,
        trialEndDate: null,
        adminGranted: false,
      }
    }

    const customerId = customers.data[0].id
    console.log(`[SUBSCRIPTION] Found Stripe customer: ${customerId}`)

    // Get subscriptions for this customer
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    })

    console.log(`[SUBSCRIPTION] Active subscriptions found for customer ${customerId}: ${subscriptions.data.length}`)

    if (subscriptions.data.length === 0) {
      console.log(`[SUBSCRIPTION] No active subscriptions found for customer: ${customerId}`)
      return {
        isActive: false,
        plan: "free" as const,
        expiresAt: null,
        subscriptionId: null,
        isTrialActive: false,
        trialEndDate: null,
        adminGranted: false,
      }
    }

    const subscription = subscriptions.data[0]
    console.log(`[SUBSCRIPTION] Found active subscription in Stripe: ${subscription.id}`)

    const priceId = subscription.items.data[0].price.id
    console.log(`[SUBSCRIPTION] Price ID from Stripe: ${priceId}`)

    const monthlyPriceId = "price_1R9CssIhqLHjOc8395LrRpgi"
    const yearlyPriceId = "price_1R9CtSIhqLHjOc83ze75CKtI"

    console.log(`[SUBSCRIPTION] Monthly price ID: ${monthlyPriceId}`)
    console.log(`[SUBSCRIPTION] Yearly price ID: ${yearlyPriceId}`)

    let plan: "free" | "monthly" | "yearly" = "free"
    if (priceId === monthlyPriceId) {
      plan = "monthly"
    } else if (priceId === yearlyPriceId) {
      plan = "yearly"
    }

    console.log(`[SUBSCRIPTION] Determined plan from Stripe: ${plan}`)

    // Update the user's subscription in Firestore
    try {
      const subscriptionData = {
        id: subscription.id,
        status: subscription.status,
        priceId: priceId,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
        customerId: customerId,
        customerEmail: userEmail, // Store the email for future reference
        updatedAt: new Date().toISOString(),
        cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
      }

      console.log(`[SUBSCRIPTION] Updating user subscription in Firestore`)

      await updateDoc(doc(db, "users", userId), {
        subscription: subscriptionData,
        isPremium: true,
        stripeCustomerId: customerId, // Store customer ID at top level
      })

      console.log(`[SUBSCRIPTION] Successfully updated user subscription in Firestore`)
    } catch (updateError) {
      console.error(`[SUBSCRIPTION] Error updating subscription in Firestore:`, updateError)
      // Continue even if update fails
    }

    // Check if user is on a trial
    const userDocRef = doc(db, "users", userId)
    const userDocSnapshot = await getDoc(userDocRef)
    const userDataAfterUpdate = userDocSnapshot.exists() ? userDocSnapshot.data() : null
    const isTrialActive = userDataAfterUpdate?.trialActive || false
    const trialEndDate = userDataAfterUpdate?.trialEndDate || null

    return {
      isActive: true,
      plan,
      expiresAt: new Date(subscription.current_period_end * 1000).toISOString(),
      subscriptionId: subscription.id,
      isTrialActive,
      trialEndDate,
      cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
      adminGranted: false,
    }
  } catch (error) {
    console.error(`[SUBSCRIPTION] Error checking subscription status:`, error)
    console.error(`[SUBSCRIPTION] Stack trace:`, new Error().stack)
    return {
      isActive: false,
      plan: "free" as const,
      expiresAt: null,
      subscriptionId: null,
      isTrialActive: false,
      trialEndDate: null,
      adminGranted: false,
    }
  }
}

export function formatSubscriptionPlan(plan: "free" | "monthly" | "yearly" | null): string {
  switch (plan) {
    case "monthly":
      return "Monthly Premium"
    case "yearly":
      return "Yearly Premium"
    case "free":
    default:
      return "Free Plan"
  }
}
