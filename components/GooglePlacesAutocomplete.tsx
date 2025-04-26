"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import { useLoadScript } from "@react-google-maps/api"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"

interface GooglePlacesAutocompleteProps {
  onPlaceSelected: (place: google.maps.places.PlaceResult) => void
  countryRestrictions?: string[]
}

const GooglePlacesAutocomplete: React.FC<GooglePlacesAutocompleteProps> = ({
  onPlaceSelected,
  countryRestrictions,
}) => {
  const [apiKey, setApiKey] = useState<string>("")
  const [isLoadingKey, setIsLoadingKey] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    const fetchApiKey = async () => {
      try {
        const response = await fetch("/api/get-google-places-api-key")

        if (!response.ok) {
          throw new Error(`Failed to fetch API key: ${response.status}`)
        }

        const data = await response.json()
        if (data.apiKey) {
          setApiKey(data.apiKey)
        } else {
          setLoadError("API key not found in response")
        }
      } catch (error) {
        console.error("Error fetching Google Places API key:", error)
        setLoadError(error instanceof Error ? error.message : "Unknown error")
      } finally {
        setIsLoadingKey(false)
      }
    }

    fetchApiKey()
  }, [])

  const { isLoaded, loadError: scriptLoadError } = useLoadScript({
    googleMapsApiKey: apiKey,
    libraries: ["places"],
  })

  const autoCompleteRef = useRef<google.maps.places.AutocompleteService | null>(null)
  const [inputValue, setInputValue] = useState("")
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([])

  useEffect(() => {
    if (isLoaded && !loadError) {
      autoCompleteRef.current = new window.google.maps.places.AutocompleteService()
    }
  }, [isLoaded, loadError])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setInputValue(value)

    if (value.length > 0 && autoCompleteRef.current) {
      const request: google.maps.places.AutocompletionRequest = {
        input: value,
        types: ["address"],
      }

      if (countryRestrictions && countryRestrictions.length > 0) {
        request.componentRestrictions = { country: countryRestrictions }
      }

      autoCompleteRef.current.getPlacePredictions(request, (predictions, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
          setSuggestions(predictions)
        } else {
          setSuggestions([])
        }
      })
    } else {
      setSuggestions([])
    }
  }

  const handleSuggestionClick = async (placeId: string) => {
    if (typeof window === "undefined" || !window.google || !window.google.maps) {
      console.error("Google Maps API not loaded")
      return
    }

    const placesService = new window.google.maps.places.PlacesService(document.createElement("div"))
    placesService.getDetails(
      {
        placeId: placeId,
        fields: ["address_components", "formatted_address", "geometry"],
      },
      (place, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
          onPlaceSelected(place)
          setInputValue(place.formatted_address || "")
          setSuggestions([])
        }
      },
    )
  }

  if (isLoadingKey) {
    return (
      <div className="flex items-center justify-center p-4">
        <Spinner /> Loading API key...
      </div>
    )
  }

  if (loadError) {
    return <div className="text-red-500">Error loading API key: {loadError}</div>
  }

  if (scriptLoadError) {
    return <div className="text-red-500">Error loading Google Maps: {scriptLoadError.message}</div>
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center p-4">
        <Spinner /> Loading Google Maps...
      </div>
    )
  }

  return (
    <div className="relative">
      <Input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        placeholder="Enter your address"
        className="w-full bg-blue-600 text-white !placeholder-white rounded-full border-2 border-white focus:border-white/50 focus:outline-none"
      />
      {suggestions.length > 0 && (
        <ul className="absolute z-10 w-full bg-blue-600 border border-white rounded-md mt-1 max-h-60 overflow-y-auto">
          {suggestions.map((suggestion) => (
            <li
              key={suggestion.place_id}
              onClick={() => handleSuggestionClick(suggestion.place_id)}
              className="px-4 py-2 hover:bg-blue-700 cursor-pointer text-white"
            >
              {suggestion.description}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default GooglePlacesAutocomplete
