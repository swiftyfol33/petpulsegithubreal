import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get("session_id")

    if (!sessionId) {
      return NextResponse.json({ error: "Missing session_id parameter" }, { status: 400 })
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2023-10-16",
    })

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    // Return session details
    return NextResponse.json({
      status: session.status,
      customerId: session.customer,
      subscriptionId: session.subscription,
      paymentStatus: session.payment_status,
      amountTotal: session.amount_total,
      currency: session.currency,
    })
  } catch (error) {
    console.error("Error verifying session:", error)
    return NextResponse.json(
      { error: "Failed to verify session", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
