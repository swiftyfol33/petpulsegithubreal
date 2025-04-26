"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { doc, setDoc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { ArrowLeft } from "lucide-react"
import { toast } from "react-hot-toast"
import GooglePlacesAutocomplete from "@/components/GooglePlacesAutocomplete"

// Define a type for the place result that matches what we actually receive
interface SimplifiedPlaceResult {
  formatted_address?: string
  address_components?: Array<{
    long_name: string
    short_name: string
    types: string[]
  }>
  place_id?: string
  geometry?: {
    location: {
      lat: () => number
      lng: () => number
    }
  }
}

export default function VetLocationOnboarding() {
  const [selectedPlace, setSelectedPlace] = useState<SimplifiedPlaceResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { user } = useAuth()
  const router = useRouter()

  // This function will be passed to the GooglePlacesAutocomplete component
  const handlePlaceSelected = (place: any) => {
    console.log("Place selected:", place)
    setSelectedPlace(place)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      toast.error("You must be logged in to continue")
      return
    }

    if (!selectedPlace || !selectedPlace.formatted_address) {
      toast.error("Please select a valid practice location")
      return
    }

    setIsLoading(true)

    try {
      // Create a safe version of the location data for Firestore
      const locationData: Record<string, any> = {
        formattedAddress: selectedPlace.formatted_address || "",
      }

      // Only extract address components if they exist
      if (selectedPlace.address_components && selectedPlace.address_components.length > 0) {
        let street = ""
        let city = ""
        let state = ""
        let zipCode = ""
        let country = ""

        selectedPlace.address_components.forEach((component) => {
          const types = component.types

          if (types.includes("street_number")) {
            street = component.long_name
          } else if (types.includes("route")) {
            street = street ? `${street} ${component.long_name}` : component.long_name
          } else if (types.includes("locality")) {
            city = component.long_name
          } else if (types.includes("administrative_area_level_1")) {
            state = component.short_name
          } else if (types.includes("postal_code")) {
            zipCode = component.long_name
          } else if (types.includes("country")) {
            country = component.long_name
          }
        })

        // Only add properties that have values
        if (street) locationData.street = street
        if (city) locationData.city = city
        if (state) locationData.state = state
        if (zipCode) locationData.zipCode = zipCode
        if (country) locationData.country = country
      }

      // Only add place_id if it exists
      if (selectedPlace.place_id) {
        locationData.placeId = selectedPlace.place_id
      }

      // Add coordinates if they exist
      if (selectedPlace.geometry?.location) {
        try {
          const lat = selectedPlace.geometry.location.lat()
          const lng = selectedPlace.geometry.location.lng()

          if (!isNaN(lat) && !isNaN(lng)) {
            locationData.coordinates = { lat, lng }
          }
        } catch (error) {
          console.error("Error extracting coordinates:", error)
          // Continue without coordinates if there's an error
        }
      }

      console.log("Saving location data:", locationData)

      // Check if user document already exists
      const userRef = doc(db, "users", user.uid)
      const userSnap = await getDoc(userRef)

      // Update or create user document
      await setDoc(
        userRef,
        {
          practiceLocation: locationData,
          ...(userSnap.exists() ? userSnap.data() : {}),
        },
        { merge: true },
      )

      // Navigate to next step
      router.push("/onboarding/vet/specialization")
    } catch (error) {
      console.error("Error saving location:", error)
      toast.error("Failed to save your practice location. Please try again.")
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
        <h1 className="text-white text-xl font-medium ml-4 font-eb-garamond">Practice Location</h1>
      </div>

      <div className="max-w-md mx-auto">
        {/* Main Content */}
        <div className="mb-12">
          <h2 className="text-white text-4xl font-bold mb-4 font-eb-garamond">
            Where is your veterinary practice located?
          </h2>
          <p className="text-white text-xl">This helps pet owners find your clinic when they need veterinary care</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Google Places Autocomplete */}
          <div className="mb-6">
            <GooglePlacesAutocomplete onPlaceSelected={handlePlaceSelected} />
          </div>

          {/* Selected Location Display */}
          {selectedPlace && selectedPlace.formatted_address && (
            <div className="bg-white/20 text-white p-4 rounded-lg mb-6">
              <p className="font-medium">Selected Location:</p>
              <p>{selectedPlace.formatted_address}</p>
            </div>
          )}

          {/* Continue Button */}
          <button
            type="submit"
            disabled={isLoading || !selectedPlace || !selectedPlace.formatted_address}
            className="w-full bg-white text-blue-600 font-semibold rounded-full py-4 px-6 text-lg mt-6 transition-colors hover:bg-blue-100 disabled:opacity-70"
          >
            {isLoading ? "Saving..." : "Continue"}
          </button>
        </form>
      </div>
    </div>
  )
}
