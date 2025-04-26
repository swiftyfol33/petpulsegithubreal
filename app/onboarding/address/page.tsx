"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "../../../contexts/AuthContext"
import { doc, setDoc } from "firebase/firestore"
import { db } from "../../../lib/firebase"
import { Button } from "@/components/ui/button"
import { toast } from "react-hot-toast"
import GooglePlacesAutocomplete from "@/components/GooglePlacesAutocomplete"
import type { PlaceResult } from "@googlemaps/google-maps-services-js"
import { ArrowLeft } from "lucide-react" // Import ArrowLeft icon

interface Address {
  street: string
  city: string
  state: string
  zipCode: string
  country: string
}

export default function AddressPage() {
  const [address, setAddress] = useState<Address>({
    street: "",
    city: "",
    state: "",
    zipCode: "",
    country: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { user } = useAuth()

  const handlePlaceSelected = (place: PlaceResult) => {
    const addressComponents = place.address_components
    if (!addressComponents) return

    const newAddress: Address = {
      street: "",
      city: "",
      state: "",
      zipCode: "",
      country: "",
    }

    addressComponents.forEach((component) => {
      const types = component.types

      if (types.includes("street_number") || types.includes("route")) {
        newAddress.street += (newAddress.street ? " " : "") + component.long_name
      }
      if (types.includes("locality")) {
        newAddress.city = component.long_name
      }
      if (types.includes("administrative_area_level_1")) {
        newAddress.state = component.short_name
      }
      if (types.includes("postal_code")) {
        newAddress.zipCode = component.long_name
      }
      if (types.includes("country")) {
        newAddress.country = component.long_name
      }
    })

    setAddress(newAddress)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      toast.error("You must be logged in to complete onboarding.")
      return
    }

    setIsLoading(true)

    try {
      await setDoc(
        doc(db, "users", user.uid),
        {
          address: address,
        },
        { merge: true },
      )

      toast.success("Address saved successfully!")
      router.push("/onboarding/interests")
    } catch (error) {
      console.error("Error saving address:", error)
      toast.error("Failed to save address. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleBack = () => {
    router.push("/onboarding/phone") // Go back to phone page
  }

  return (
    <div className="fixed inset-0 w-screen h-screen bg-[#2D57ED] z-[99999] flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        <Button variant="ghost" onClick={handleBack} className="absolute top-4 left-4 text-white">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h1 className="text-3xl font-bold text-white text-center">What's your address?</h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <GooglePlacesAutocomplete
            onPlaceSelected={handlePlaceSelected}
            inputClassName="w-full px-6 py-4 bg-white text-black placeholder-gray-400 rounded-full border-2 border-white focus:border-blue-300 focus:outline-none text-lg"
            suggestionsClassName="bg-white text-black"
          />
          <Button
            type="submit"
            disabled={isLoading || !address.street}
            className="w-full bg-white text-[#2D57ED] font-semibold rounded-full py-4 px-6 text-lg transition-colors hover:bg-blue-100"
          >
            {isLoading ? "Saving..." : "Next"}
          </Button>
        </form>
      </div>
    </div>
  )
}
