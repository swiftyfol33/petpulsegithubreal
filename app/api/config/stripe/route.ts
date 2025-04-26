import { NextResponse } from "next/server"
import { serverEnv } from "@/lib/env"

export async function GET() {
  // Only return the publishable key and price IDs, which are safe for client use
  return NextResponse.json({
    publishableKey: serverEnv.stripe.publishableKey,
    monthlyPriceId: serverEnv.stripe.monthlyPriceId,
    yearlyPriceId: serverEnv.stripe.yearlyPriceId,
  })
}
