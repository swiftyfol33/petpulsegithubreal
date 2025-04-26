"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "../../../contexts/AuthContext"
import { doc, setDoc } from "firebase/firestore"
import { db } from "../../../lib/firebase"
import { Button } from "@/components/ui/button"
import { toast } from "react-hot-toast"
import { ArrowLeft } from "lucide-react"

const interests = [
  "Health Tracking",
  "AI Advice",
  "Shopping Recommendations",
  "Activity & Fitness Tracking",
  "Training & Behavior Tips",
  "Reminders & Scheduling",
  "Vet & Emergency Assistance",
  "Pet Social Media & Sharing",
  "Pet Sitting & Boarding Services",
  "Pet Communication Analysis",
  "Smart Device Integration",
  "Community & Forums",
  "Food & Nutrition",
  "Health & Wellness",
  "Grooming & Hygiene",
  "Toys & Entertainment",
  "Training & Behavior",
  "Bedding & Comfort",
  "Travel & Outdoor Essentials",
  "Litter & Waste Management",
]

export default function InterestsPage() {
  const [selectedInterests, setSelectedInterests] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { user } = useAuth()

  const handleInterestToggle = (interest: string) => {
    setSelectedInterests((prev) => (prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      toast.error("You must be logged in to complete onboarding.")
      return
    }

    if (selectedInterests.length === 0) {
      toast.error("Please select at least one interest.")
      return
    }

    setIsLoading(true)

    try {
      await setDoc(
        doc(db, "users", user.uid),
        {
          interests: selectedInterests,
        },
        { merge: true },
      )

      toast.success("Interests saved successfully!")
      router.push("/pets")
    } catch (error) {
      console.error("Error saving interests:", error)
      toast.error("Failed to save interests. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleBack = () => {
    router.push("/onboarding/address")
  }

  return (
    <div className="fixed inset-0 w-screen h-screen bg-[#2D57ED] z-[99999] overflow-y-auto">
      <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 pb-24">
        <div className="w-full max-w-md space-y-8">
          <Button variant="ghost" onClick={handleBack} className="absolute top-4 left-4 text-white">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <h1 className="text-3xl font-bold text-white text-center">Which are you most interested in?</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {interests.map((interest) => (
                <button
                  key={interest}
                  type="button"
                  onClick={() => handleInterestToggle(interest)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    selectedInterests.includes(interest)
                      ? "bg-white text-blue-600"
                      : "bg-blue-700 text-white hover:bg-blue-600"
                  }`}
                >
                  {interest}
                </button>
              ))}
            </div>
            <Button
              type="submit"
              disabled={isLoading || selectedInterests.length === 0}
              className="w-full bg-white text-blue-600 font-semibold rounded-full py-4 px-6 text-lg mt-6 transition-colors hover:bg-blue-100"
            >
              {isLoading ? "Saving..." : "Finish"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
