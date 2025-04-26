import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import { GoogleGenerativeAI } from "@google/generative-ai"

interface HealthRecord {
  date: string
  weight: number
  activityLevel: number
  foodIntake: string
  sleepDuration: number
  behavior: string
  notes: string
}

interface PastAnalysis {
  id: string
  date: string
  type: string
  analysis: string
}

// Define the PreviousAnalysis interface
interface PreviousAnalysis {
  date: string
  type: string
  analysis: string
}

// Initialize the Gemini API client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")

/**
 * Generates a real symptom analysis based on the provided symptoms and pet information using GPT-4o
 */
export async function generateSymptomAnalysis(symptoms: string, petInfo: string): Promise<string> {
  try {
    const prompt = `As a veterinary expert, analyze the following symptoms for ${petInfo}:
    
    Symptoms: "${symptoms}"
    
    Please provide a detailed analysis including:
    1. Potential causes
    2. Severity assessment
    3. Recommendations for home care
    4. When to seek veterinary attention
    
    Format your response in a clear, structured way that a pet owner can easily understand.`

    const { text } = await generateText({
      model: openai("gpt-4o"),
      prompt: prompt,
    })

    return text
  } catch (error) {
    console.error("Error in generateSymptomAnalysis:", error)
    throw new Error("Failed to analyze symptoms. Please try again.")
  }
}

// Update the StoolAnalysisResult interface to be optional since we're now returning a string
interface StoolAnalysisResult {
  analysis?: string
  potentialIssues?: string
  abnormalities?: string[]
  recommendations?: string
}

// Update the generateStoolAnalysis function to use Google Gemini instead of OpenAI
export async function generateStoolAnalysis(
  imageBase64: string,
  pastRecords: any[] = [],
  previousAnalyses: any[] = [],
  petInfo: any = {},
): Promise<string> {
  try {
    console.log("Starting stool analysis with Gemini API")

    // Make sure the image is properly formatted for Gemini
    // Remove the data:image prefix if it exists
    let base64ImageData = imageBase64
    if (base64ImageData.startsWith("data:image")) {
      base64ImageData = base64ImageData.split(",")[1]
    }

    // Get the API key from window.ENV if available (client-side) or from process.env (server-side)
    let apiKey = ""
    apiKey = process.env.GEMINI_API_KEY || ""
    console.log("Using server-side Gemini API key")

    if (!apiKey) {
      console.error("No Gemini API key found")
      throw new Error("Gemini API key is missing. Please check your environment variables.")
    }

    // Log the first few characters of the API key to verify it's not empty (don't log the full key for security)
    console.log(`API key starts with: ${apiKey.substring(0, 3)}...`)

    // Create a detailed prompt for the analysis with veterinary context
    const prompt = `VETERINARY MEDICAL CONTEXT: You are a veterinary professional analyzing a pet's stool sample image for health assessment purposes.

TASK: Analyze the pet stool in the image for a ${petInfo.type || "pet"} named ${petInfo.name || "unknown"}, breed ${petInfo.breed || "unknown"}, age ${petInfo.age || "unknown"}.

Please analyze the following aspects:
1. Color (brown, black, red, etc.)
2. Consistency (firm, soft, watery, etc.)
3. Visible abnormalities (mucus, blood, foreign objects)
4. Overall health indication based on stool appearance

FORMAT YOUR RESPONSE WITH THESE EXACT SECTIONS:
Analysis: [detailed description of stool appearance]
Potential Issues: [possible health concerns based on stool appearance]
Abnormalities: [list any abnormal characteristics]
Recommendations: [suggestions for pet owner]

If the image does not contain pet stool or is too blurry/unclear to analyze, respond ONLY with: "NO STOOL VISIBLE IN IMAGE OR IMAGE UNCLEAR. Please upload a clearer image of pet stool."`

    // Direct API call to Google Gemini using gemini-2.0-flash model
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`
    console.log(`Making API request to: ${apiUrl.split("?")[0]}`) // Log URL without the key

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: "image/jpeg",
                  data: base64ImageData,
                },
              },
            ],
          },
        ],
        generationConfig: {
          maxOutputTokens: 1000,
          temperature: 0.4,
          topP: 0.95,
          topK: 40,
        },
      }),
    })

    // Log response status
    console.log(`Gemini API response status: ${response.status}`)

    if (!response.ok) {
      const errorData = await response.json()
      console.error("Gemini API error details:", errorData)
      throw new Error(`Gemini API error: ${errorData.error?.message || "Unknown error"}`)
    }

    const data = await response.json()
    console.log("Stool analysis response received:", data ? "Data received" : "No data")

    if (!data.candidates || data.candidates.length === 0) {
      throw new Error("No response from Gemini API")
    }

    // Extract the text from the Gemini response
    const analysisText = data.candidates[0].content.parts[0].text
    console.log("Analysis text length:", analysisText.length)

    return analysisText
  } catch (error) {
    console.error("Error in generateStoolAnalysis:", error)
    return `Error occurred during stool analysis: ${error.message}`
  }
}

// Helper function to extract a section from text
function extractSection(text: string, sectionHeader: string): string {
  const regex = new RegExp(`${sectionHeader}\\s*([\\s\\S]*?)(?=\\n\\s*[A-Z][a-zA-Z\\s]+:|$)`, "i")
  const match = text.match(regex)
  return match ? match[1].trim() : ""
}

// Helper function to extract a section as a list
function extractSectionAsList(text: string, sectionHeader: string): string[] {
  const section = extractSection(text, sectionHeader)
  if (!section) return []

  // Try to split by bullet points, numbers, or new lines
  const items = section
    .split(/\n\s*[-•*]|\n\s*\d+\.|\n+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0)

  return items.length > 0 ? items : [section]
}

export async function generateComprehensiveAnalysis(
  petInfo: string,
  healthRecords: HealthRecord[],
  pastAnalyses: PastAnalysis[],
): Promise<string> {
  try {
    const healthRecordsText =
      healthRecords.length > 0
        ? healthRecords
            .map(
              (record) =>
                `Date: ${record.date}\n` +
                `Weight: ${record.weight || "N/A"}\n` +
                `Activity Level: ${record.activityLevel || "N/A"}\n` +
                `Food Intake: ${record.foodIntake || "N/A"}\n` +
                `Sleep Duration: ${record.sleepDuration || "N/A"}\n` +
                `Behavior: ${record.behavior || "N/A"}\n` +
                `Notes: ${record.notes || "N/A"}\n`,
            )
            .join("\n")
        : "No health records available"

    const filteredAnalyses = pastAnalyses
      .filter((analysis) => analysis.type !== "comprehensive")
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5)

    const pastAnalysesText =
      filteredAnalyses.length > 0
        ? filteredAnalyses
            .map(
              (analysis) =>
                `Date: ${analysis.date}\n` + `Type: ${analysis.type}\n` + `Analysis: ${analysis.analysis}\n`,
            )
            .join("\n")
        : "No past analyses available"

    const prompt = `As a veterinary expert, provide a comprehensive health analysis for ${petInfo} based on the following health records and past analyses:
    
    Health Records:
    ${healthRecordsText}
    
    Past Analyses (5 most recent, excluding comprehensive):
    ${pastAnalysesText}
    
    Please include:
    1. Overall health assessment
    2. Trends or patterns in the health data and past analyses
    3. Specific recommendations for improving the pet's health
    4. Any potential concerns that should be addressed
    5. How the current health status compares to previous analyses
    
    Format your response in a clear, structured way that a pet owner can easily understand.`

    const { text } = await generateText({
      model: openai("gpt-4o"),
      prompt: prompt,
    })

    return text
  } catch (error) {
    console.error("Error in generateComprehensiveAnalysis:", error)
    throw new Error("Failed to generate comprehensive analysis. Please try again.")
  }
}
