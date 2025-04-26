import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { db, doc, getDoc, updateDoc } from "@/lib/firebase"

// Initialize Stripe with error handling
let stripe: Stripe | null = null
try {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error("[CANCEL-SUB] Missing STRIPE_SECRET_KEY environment variable")
  } else {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2023-10-16",
    })
  }
} catch (error) {
  console.error("[CANCEL-SUB] Error initializing Stripe:", error)
}

export async function POST(request: NextRequest) {
  console.log("[CANCEL-SUB-APP] Request received")

  // Check if Stripe is initialized
  if (!stripe) {
    console.error("[CANCEL-SUB-APP] Stripe is not initialized")
    return NextResponse.json({ error: "Stripe is not initialized" }, { status: 500 })
  }

  try {
    // Parse the request body
    const body = await request.json()
    const { subscriptionId, userId } = body

    console.log("[CANCEL-SUB-APP] Processing cancellation request:", { subscriptionId, userId })

    if (!subscriptionId || !userId) {
      console.log("[CANCEL-SUB-APP] Missing required parameters:", { subscriptionId, userId })
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

    // Verify the user owns this subscription
    console.log("[CANCEL-SUB-APP] Verifying user ownership of subscription")
    const userDoc = await getDoc(doc(db, "users", userId))

    if (!userDoc.exists()) {
      console.log("[CANCEL-SUB-APP] User document not found:", userId)
      return NextResponse.json({ error: "User not found" }, { status: 403 })
    }

    const userData = userDoc.data()
    console.log("[CANCEL-SUB-APP] User data retrieved:", {
      hasSubscription: !!userData.subscription,
      subscriptionId: userData.subscription?.id,
      requestedId: subscriptionId,
      match: userData.subscription?.id === subscriptionId,
    })

    if (!userData.subscription || userData.subscription.id !== subscriptionId) {
      console.log("[CANCEL-SUB-APP] Unauthorized: Subscription ID mismatch or missing")
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Cancel the subscription at period end
    console.log("[CANCEL-SUB-APP] Calling Stripe API to cancel subscription:", subscriptionId)
    try {
      const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      })
      console.log("[CANCEL-SUB-APP] Stripe cancellation successful:", {
        id: updatedSubscription.id,
        status: updatedSubscription.status,
        cancelAtPeriodEnd: updatedSubscription.cancel_at_period_end,
      })
    } catch (stripeError) {
      console.error("[CANCEL-SUB-APP] Stripe API error:", stripeError)
      return NextResponse.json(
        {
          error: "Failed to cancel subscription with Stripe",
          details: stripeError instanceof Error ? stripeError.message : "Unknown Stripe error",
        },
        { status: 500 },
      )
    }

    // Update the user's subscription status in Firestore
    console.log("[CANCEL-SUB-APP] Updating user subscription status in Firestore")
    try {
      await updateDoc(doc(db, "users", userId), {
        "subscription.cancelAtPeriodEnd": true,
        "subscription.updatedAt": new Date().toISOString(),
      })
      console.log("[CANCEL-SUB-APP] Firestore update successful")
    } catch (firestoreError) {
      console.error("[CANCEL-SUB-APP] Firestore update error:", firestoreError)
      // We already cancelled in Stripe, so return success but log the error
      return NextResponse.json({
        success: true,
        warning: "Subscription cancelled in Stripe but failed to update in database",
      })
    }

    console.log("[CANCEL-SUB-APP] Cancellation process completed successfully")
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[CANCEL-SUB-APP] Unexpected error cancelling subscription:", error)
    return NextResponse.json(
      {
        error: "Failed to cancel subscription",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
