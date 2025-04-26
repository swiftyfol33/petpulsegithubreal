"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/AuthContext"
import { doc, setDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { toast } from "react-hot-toast"
import { ArrowLeft } from "lucide-react"

export default function OnboardingNamePage() {
  const [firstName, setFirstName] = useState("")
  const [middleName, setMiddleName] = useState("")
  const [lastName, setLastName] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { user } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setIsLoading(true)
    try {
      await setDoc(doc(db, "users", user.uid), { firstName, middleName, lastName }, { merge: true })
      router.push("/onboarding/phone")
    } catch (error) {
      console.error("Error saving name:", error)
      toast.error("Failed to save name. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleBack = () => {
    router.push("/signup")
  }

  return (
    <div className="fixed inset-0 w-screen h-screen bg-[#2D57ED] z-[99999] flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        <Button variant="ghost" onClick={handleBack} className="absolute top-4 left-4 text-white">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h1 className="text-3xl font-bold text-white text-center">What's your name?</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="First Name"
            required
            className="w-full px-6 py-4 bg-white text-black placeholder-gray-400 rounded-full border-2 border-white focus:border-blue-300 focus:outline-none text-lg"
          />
          <Input
            type="text"
            value={middleName}
            onChange={(e) => setMiddleName(e.target.value)}
            placeholder="Middle Name (optional)"
            className="w-full px-6 py-4 bg-white text-black placeholder-gray-400 rounded-full border-2 border-white focus:border-blue-300 focus:outline-none text-lg"
          />
          <Input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Last Name"
            required
            className="w-full px-6 py-4 bg-white text-black placeholder-gray-400 rounded-full border-2 border-white focus:border-blue-300 focus:outline-none text-lg"
          />
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-white text-blue-600 font-semibold rounded-full py-4 px-6 text-lg mt-6 transition-colors hover:bg-blue-100"
          >
            {isLoading ? "Saving..." : "Next"}
          </Button>
        </form>
      </div>
    </div>
  )
}
