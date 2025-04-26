"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { doc, setDoc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { ArrowLeft } from "lucide-react"
import { toast } from "react-hot-toast"

export default function VetProfileOnboarding() {
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [phoneCountryCode, setPhoneCountryCode] = useState("+1")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { user } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      toast.error("You must be logged in to continue")
      return
    }

    if (!phoneCountryCode.startsWith("+") || phoneCountryCode.length < 2) {
      toast.error("Please enter a valid country code starting with '+'")
      return
    }

    if (phoneNumber.length < 8) {
      toast.error("Phone number must be at least 8 digits long")
      return
    }

    setIsLoading(true)

    try {
      // Check if user document already exists
      const userRef = doc(db, "users", user.uid)
      const userSnap = await getDoc(userRef)

      // Update or create user document
      await setDoc(
        userRef,
        {
          firstName,
          lastName,
          phoneCountryCode,
          phoneNumber,
          role: "vet",
          ...(userSnap.exists() ? userSnap.data() : {}),
        },
        { merge: true },
      )

      // Navigate to next step
      router.push("/onboarding/vet/location")
    } catch (error) {
      console.error("Error saving profile:", error)
      toast.error("Failed to save your profile. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen !bg-[#2D57ED] p-6">
      {/* Header */}
      <div className="flex items-center mb-12">
        <button onClick={() => router.back()} className="text-white p-2">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-white text-xl font-medium ml-4 font-eb-garamond">Vet Profile</h1>
      </div>

      <div className="max-w-md mx-auto">
        {/* Main Content */}
        <div className="mb-12">
          <h2 className="text-white text-4xl font-bold mb-4 font-eb-garamond">Tell us about yourself</h2>
          <p className="text-white text-xl">Let's set up your veterinary professional profile</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* First Name Input */}
          <div className="relative">
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First Name"
              required
              className="w-full px-6 py-4 bg-white text-black placeholder-gray-400 rounded-full border-2 border-white focus:border-blue-300 focus:outline-none text-lg"
            />
          </div>

          {/* Last Name Input */}
          <div className="relative">
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Last Name"
              required
              className="w-full px-6 py-4 bg-white text-black placeholder-gray-400 rounded-full border-2 border-white focus:border-blue-300 focus:outline-none text-lg"
            />
          </div>

          {/* Phone Input */}
          <div className="flex space-x-2">
            <input
              type="text"
              value={phoneCountryCode}
              onChange={(e) => {
                const value = e.target.value
                if (value === "" || (value.startsWith("+") && /^\+\d*$/.test(value))) {
                  setPhoneCountryCode(value)
                }
              }}
              placeholder="+1"
              required
              className="w-1/4 px-6 py-4 bg-white text-black placeholder-gray-400 rounded-full border-2 border-white focus:border-blue-300 focus:outline-none text-lg"
            />
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ""))}
              placeholder="Phone Number"
              required
              className="w-3/4 px-6 py-4 bg-white text-black placeholder-gray-400 rounded-full border-2 border-white focus:border-blue-300 focus:outline-none text-lg"
            />
          </div>

          {/* Continue Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-white text-blue-600 font-semibold rounded-full py-4 px-6 text-lg mt-6 transition-colors hover:bg-blue-100 disabled:opacity-70"
          >
            {isLoading ? "Saving..." : "Continue"}
          </button>
        </form>
      </div>
    </div>
  )
}
