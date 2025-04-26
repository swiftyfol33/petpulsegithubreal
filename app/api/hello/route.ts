import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    message: "Hello from App Router API!",
    timestamp: Date.now(),
  })
}
