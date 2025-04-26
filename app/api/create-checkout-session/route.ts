import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json()
    console.log("Request body:", body)

    const { priceId, userId, userEmail } = body

    if (!priceId || !userId) {
      return NextResponse.json(
        { error: "Missing required parameters", received: { priceId, userId, userEmail } },
        { status: 400 },
      )
    }

    // Check if we have a Stripe secret key
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY
    if (!stripeSecretKey) {
      console.error("Missing STRIPE_SECRET_KEY environment variable")
      return NextResponse.json({ error: "Stripe secret key is not configured" }, { status: 500 })
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    })

    // Get the host from the request headers
    const host = request.headers.get("host") || "localhost:3000"
    const protocol = host.includes("localhost") ? "http" : "https"
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `${protocol}://${host}`

    console.log("Creating checkout session with:", {
      priceId,
      userId,
      baseUrl,
      host,
      protocol,
    })

    // Create a checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      billing_address_collection: "auto",
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${baseUrl}/subscribe/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/subscribe`,
      client_reference_id: userId,
      customer_email: userEmail || undefined,
      metadata: {
        userId,
      },
    })

    console.log("Checkout session created:", {
      sessionId: session.id,
      url: session.url,
    })

    // Return the session ID and URL
    return NextResponse.json({ sessionId: session.id, url: session.url })
  } catch (error) {
    console.error("Error creating checkout session:", error)

    // Ensure we return a proper JSON response even for errors
    return NextResponse.json(
      {
        error: "Failed to create checkout session",
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}
