import { type NextRequest, NextResponse } from "next/server"
import { generateStoolAnalysis } from "@/lib/analysis-utils"

export async function POST(request: NextRequest) {
  try {
    const { image, petInfo } = await request.json()

    if (!image) {
      return NextResponse.json({ error: "Image data is required" }, { status: 400 })
    }

    // Call the analysis function with the provided data
    const analysisResult = await generateStoolAnalysis(
      image,
      [], // pastRecords - could be fetched from database if needed
      [], // previousAnalyses - could be fetched from database if needed
      petInfo || {},
    )

    // Return the analysis result
    return new NextResponse(analysisResult, {
      status: 200,
      headers: {
        "Content-Type": "text/plain",
        "Cache-Control": "no-store, max-age=0",
      },
    })
  } catch (error) {
    console.error("Error in stool analysis API:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An unknown error occurred" },
      { status: 500 },
    )
  }
}
