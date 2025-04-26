import { NextResponse } from "next/server"
import { serverEnv } from "@/lib/env"

export async function GET() {
  // Create a safe representation of environment variable status
  // Only return boolean values indicating if the variable exists, not the actual values
  const envStatus: Record<string, boolean> = {
    // Stripe
    "stripe.secretKey": Boolean(serverEnv.stripe.secretKey),
    "stripe.publishableKey": Boolean(serverEnv.stripe.publishableKey),
    "stripe.webhookSecret": Boolean(serverEnv.stripe.webhookSecret),
    "stripe.monthlyPriceId": Boolean(serverEnv.stripe.monthlyPriceId),
    "stripe.yearlyPriceId": Boolean(serverEnv.stripe.yearlyPriceId),

    // Google
    "google.mapsApiKey": Boolean(serverEnv.google.mapsApiKey),
    "google.placesApiKey": Boolean(serverEnv.google.placesApiKey),

    // OpenAI
    "openai.apiKey": Boolean(serverEnv.openai.apiKey),

    // Gemini
    "gemini.apiKey": Boolean(serverEnv.gemini.apiKey),

    // Admin
    "admin.apiKey": Boolean(serverEnv.admin.apiKey),

    // Firebase Admin
    "firebase.adminClientEmail": Boolean(serverEnv.firebase.adminClientEmail),
    "firebase.adminPrivateKey": Boolean(serverEnv.firebase.adminPrivateKey),

    // Zoom
    "zoom.accountId": Boolean(serverEnv.zoom.accountId),
    "zoom.clientId": Boolean(serverEnv.zoom.clientId),
    "zoom.clientSecret": Boolean(serverEnv.zoom.clientSecret),

    // Base URL
    baseUrl: Boolean(serverEnv.baseUrl),
  }

  return NextResponse.json(envStatus)
}
