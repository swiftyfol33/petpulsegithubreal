interface Pet {
  name: string
  type: string
  breed: string
}

interface HealthRecord {
  date: string
  weight: number
  activityLevel: number
  foodIntake: string
  sleepDuration: number
  behavior: string
  notes: string
}

export async function analyzeHealthRecords(pet: Pet, records: HealthRecord[]) {
  try {
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: formatAnalysisPrompt(pet, records),
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`API request failed: ${errorData.error || response.statusText}`)
    }

    const { analysis } = await response.json()
    return analysis
  } catch (error) {
    console.error("Error in analyzeHealthRecords:", error)
    throw error
  }
}

function formatAnalysisPrompt(pet: Pet, records: HealthRecord[]) {
  return `Analyze the following health records for ${pet.name}, a ${pet.breed} ${pet.type}:

${records
  .map(
    (record) => `
Date: ${new Date(record.date).toLocaleDateString()}
Weight: ${record.weight} kg
Activity Level: ${record.activityLevel}/10
Food Intake: ${record.foodIntake}
Sleep Duration: ${record.sleepDuration} hours
Behavior: ${record.behavior}
Notes: ${record.notes}
`,
  )
  .join("\n")}

Please provide a comprehensive health analysis in the following format:

1. Summary: A brief overview of the pet's health (max 50 words)
2. Stats: Key statistics including average weight, activity level, sleep duration, and any significant changes
3. Detailed Analysis: A more in-depth analysis of the pet's health trends (100-150 words)
4. Recommendations: 3-5 actionable recommendations for improving the pet's health
5. Disclaimers: 1-3 important disclaimers or warnings, each with a title, description, and severity (low, medium, or high)

Ensure the analysis considers the specific needs and characteristics of a ${pet.breed} ${pet.type}.`
}
