import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    supported: true,
    timestamp: Date.now(),
  })
}

export async function HEAD() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "X-API-Support": "true",
    },
  })
}
