"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "../../../contexts/AuthContext"
import { doc, setDoc } from "firebase/firestore"
import { db } from "../../../lib/firebase"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { toast } from "react-hot-toast"
import { ArrowLeft } from "lucide-react" // Import ArrowLeft icon

export default function PhonePage() {
  const [countryCode, setCountryCode] = useState("+")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { user } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      toast.error("You must be logged in to complete onboarding.")
      return
    }

    if (!countryCode.startsWith("+") || countryCode.length < 2) {
      toast.error("Please enter a valid country code starting with '+'")
      return
    }

    if (phoneNumber.length < 8) {
      toast.error("Phone number must be at least 8 digits long")
      return
    }

    setIsLoading(true)
    try {
      await setDoc(
        doc(db, "users", user.uid),
        {
          phoneCountryCode: countryCode,
          phoneNumber: phoneNumber,
        },
        { merge: true },
      )
      router.push("/onboarding/address")
    } catch (error) {
      console.error("Error saving phone number:", error)
      toast.error("Failed to save phone number. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleBack = () => {
    router.push("/onboarding/name") // Go back to name page
  }

  return (
    <div className="fixed inset-0 w-screen h-screen bg-[#2D57ED] z-[99999] flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        <Button variant="ghost" onClick={handleBack} className="absolute top-4 left-4 text-white">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h1 className="text-3xl font-bold text-white text-center">What's your phone number?</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex space-x-2">
            <Input
              type="text"
              value={countryCode}
              onChange={(e) => {
                const value = e.target.value
                if (value === "" || (value.startsWith("+") && /^\+\d*$/.test(value))) {
                  setCountryCode(value)
                }
              }}
              placeholder="+1"
              className="w-1/3 px-3 py-2 bg-white text-black placeholder-gray-400 rounded-full border-2 border-white focus:border-blue-300 focus:outline-none text-lg"
            />
            <Input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ""))}
              placeholder="Enter your phone number"
              required
              minLength={8}
              className="w-2/3 px-3 py-2 bg-white text-black placeholder-gray-400 rounded-full border-2 border-white focus:border-blue-300 focus:outline-none text-lg"
            />
          </div>
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
