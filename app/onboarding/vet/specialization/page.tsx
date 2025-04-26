"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { doc, setDoc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { ArrowLeft, Check } from "lucide-react"
import { toast } from "react-hot-toast"

const specializations = [
  { id: "dogs", label: "Dogs" },
  { id: "cats", label: "Cats" },
  { id: "birds", label: "Birds" },
  { id: "reptiles", label: "Reptiles" },
  { id: "small_mammals", label: "Small Mammals (Rabbits, Guinea Pigs, etc.)" },
  { id: "exotic", label: "Exotic Pets" },
  { id: "farm_animals", label: "Farm Animals" },
  { id: "horses", label: "Horses" },
  { id: "wildlife", label: "Wildlife" },
  { id: "aquatic", label: "Aquatic Animals" },
]

const services = [
  { id: "general_practice", label: "General Practice" },
  { id: "emergency_care", label: "Emergency Care" },
  { id: "surgery", label: "Surgery" },
  { id: "dentistry", label: "Dentistry" },
  { id: "dermatology", label: "Dermatology" },
  { id: "cardiology", label: "Cardiology" },
  { id: "oncology", label: "Oncology" },
  { id: "neurology", label: "Neurology" },
  { id: "orthopedics", label: "Orthopedics" },
  { id: "ophthalmology", label: "Ophthalmology" },
  { id: "behavior", label: "Behavior" },
  { id: "nutrition", label: "Nutrition" },
  { id: "rehabilitation", label: "Rehabilitation" },
  { id: "acupuncture", label: "Acupuncture" },
  { id: "holistic", label: "Holistic/Alternative Medicine" },
]

export default function VetSpecializationOnboarding() {
  const [selectedSpecializations, setSelectedSpecializations] = useState<string[]>([])
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const { user } = useAuth()
  const router = useRouter()

  const toggleSpecialization = (id: string) => {
    setSelectedSpecializations((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
  }

  const toggleService = (id: string) => {
    setSelectedServices((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      toast.error("You must be logged in to continue")
      return
    }

    if (selectedSpecializations.length === 0) {
      toast.error("Please select at least one animal specialization")
      return
    }

    if (selectedServices.length === 0) {
      toast.error("Please select at least one service you provide")
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
          specializations: selectedSpecializations,
          services: selectedServices,
          onboardingComplete: true,
          ...(userSnap.exists() ? userSnap.data() : {}),
        },
        { merge: true },
      )

      // Navigate to dashboard or welcome page
      router.push("/welcome")
      toast.success("Your veterinary profile is complete!")
    } catch (error) {
      console.error("Error saving specializations:", error)
      toast.error("Failed to save your specializations. Please try again.")
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
        <h1 className="text-white text-xl font-medium ml-4 font-eb-garamond">Specializations</h1>
      </div>

      <div className="max-w-md mx-auto">
        {/* Main Content */}
        <div className="mb-12">
          <h2 className="text-white text-4xl font-bold mb-4 font-eb-garamond">What do you specialize in?</h2>
          <p className="text-white text-xl">Select the animals you treat and services you provide</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Animal Specializations */}
          <div>
            <h3 className="text-white text-xl font-semibold mb-4">Animals you treat:</h3>
            <div className="grid grid-cols-2 gap-3">
              {specializations.map((spec) => (
                <button
                  key={spec.id}
                  type="button"
                  onClick={() => toggleSpecialization(spec.id)}
                  className={`flex items-center justify-between px-4 py-3 rounded-lg text-left transition-colors ${
                    selectedSpecializations.includes(spec.id) ? "bg-white text-blue-600" : "bg-blue-700 text-white"
                  }`}
                >
                  <span>{spec.label}</span>
                  {selectedSpecializations.includes(spec.id) && <Check className="w-5 h-5" />}
                </button>
              ))}
            </div>
          </div>

          {/* Services Provided */}
          <div>
            <h3 className="text-white text-xl font-semibold mb-4">Services you provide:</h3>
            <div className="grid grid-cols-2 gap-3">
              {services.map((service) => (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => toggleService(service.id)}
                  className={`flex items-center justify-between px-4 py-3 rounded-lg text-left transition-colors ${
                    selectedServices.includes(service.id) ? "bg-white text-blue-600" : "bg-blue-700 text-white"
                  }`}
                >
                  <span>{service.label}</span>
                  {selectedServices.includes(service.id) && <Check className="w-5 h-5" />}
                </button>
              ))}
            </div>
          </div>

          {/* Complete Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-white text-blue-600 font-semibold rounded-full py-4 px-6 text-lg mt-6 transition-colors hover:bg-blue-100 disabled:opacity-70"
          >
            {isLoading ? "Saving..." : "Complete Profile"}
          </button>
        </form>
      </div>
    </div>
  )
}
