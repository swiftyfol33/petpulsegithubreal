import { type NextRequest, NextResponse } from "next/server"
import { db, doc, getDoc, updateDoc } from "@/lib/firebase"

export async function POST(request: NextRequest) {
  console.log("[CANCEL-TRIAL-APP] Request received")

  try {
    // Parse the request body
    const body = await request.json()
    const { userId } = body

    console.log("[CANCEL-TRIAL-APP] Processing trial cancellation request:", { userId })

    if (!userId) {
      console.log("[CANCEL-TRIAL-APP] Missing required parameter:", { userId })
      return NextResponse.json({ error: "Missing required parameter: userId" }, { status: 400 })
    }

    // Verify the user exists
    console.log("[CANCEL-TRIAL-APP] Verifying user exists")
    const userDoc = await getDoc(doc(db, "users", userId))

    if (!userDoc.exists()) {
      console.log("[CANCEL-TRIAL-APP] User document not found:", userId)
      return NextResponse.json({ error: "User not found" }, { status: 403 })
    }

    const userData = userDoc.data()
    console.log("[CANCEL-TRIAL-APP] User data retrieved:", {
      hasTrialActive: !!userData.trialActive,
      trialEndDate: userData.trialEndDate,
    })

    if (!userData.trialActive) {
      console.log("[CANCEL-TRIAL-APP] No active trial found for user")
      return NextResponse.json({ error: "No active trial found for this user" }, { status: 400 })
    }

    // Update the user's trial status in Firestore
    console.log("[CANCEL-TRIAL-APP] Updating user trial status in Firestore")
    try {
      await updateDoc(doc(db, "users", userId), {
        isPremium: false,
        trialActive: false,
        trialEndDate: null,
        updatedAt: new Date().toISOString(),
      })
      console.log("[CANCEL-TRIAL-APP] Firestore update successful", {
        userId,
        updatedFields: {
          isPremium: false,
          trialActive: false,
          trialEndDate: null,
          updatedAt: new Date().toISOString(),
        },
      })
    } catch (firestoreError) {
      console.error("[CANCEL-TRIAL-APP] Firestore update error:", firestoreError)
      return NextResponse.json(
        {
          error: "Failed to update trial status in database",
          details: firestoreError instanceof Error ? firestoreError.message : "Unknown Firestore error",
        },
        { status: 500 },
      )
    }

    console.log("[CANCEL-TRIAL-APP] Trial cancellation process completed successfully")
    return NextResponse.json({
      success: true,
      message: "Trial successfully cancelled",
      updatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[CANCEL-TRIAL-APP] Unexpected error cancelling trial:", error)
    return NextResponse.json(
      {
        error: "Failed to cancel trial",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
