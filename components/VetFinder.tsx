"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Loader } from "@googlemaps/js-api-loader"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { MapPin, Phone, Heart, Clock, Search, Video, MessageSquare, Mail, Info } from "lucide-react"
import { toast } from "react-hot-toast"
import { useAuth } from "../contexts/AuthContext"
import { db } from "../lib/firebase"
import { collection, addDoc, getDocs, query, where, deleteDoc } from "firebase/firestore"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useMediaQuery } from "@/hooks/use-media-query"

interface OpeningHours {
  periods: {
    open: { day: number; time: string }
    close: { day: number; time: string }
  }[]
  weekday_text: string[]
}

interface Vet {
  placeId: string
  name: string
  vicinity: string
  rating?: number
  openingHours?: OpeningHours
  currentlyOpen?: boolean
  phoneNumber?: string
  email?: string
  petType?: string
  latitude: number
  longitude: number
  distance?: number
}

interface FavoriteVet {
  id?: string // Firestore document ID
  placeId: string
  name: string
  vicinity: string
  latitude: number
  longitude: number
  phoneNumber: string
  email?: string
  rating?: number
  petType?: string
  openingHours?: OpeningHours
  currentlyOpen?: boolean
}

interface VetFinderProps {
  favoriteVets: FavoriteVet[]
  setFavoriteVets: React.Dispatch<React.SetStateAction<FavoriteVet[]>>
  userLocation: { lat: number; lng: number } | null
  setUserLocation: React.Dispatch<React.SetStateAction<{ lat: number; lng: number } | null>>
}

interface SavedVetData {
  vets: Vet[]
  enteredLocation: string
  timestamp: number
  mapCenter: { lat: number; lng: number }
}

declare global {
  interface Window {
    google: any
  }
}

function generateTalkyRoomName() {
  return `petpulse-${Math.random().toString(36).substring(2, 15)}-${Date.now().toString(36)}`
}

function generateTalkyUrl(roomName: string) {
  return `https://talky.io/${roomName}`
}

export function VetFinder({ favoriteVets, setFavoriteVets, userLocation, setUserLocation }: VetFinderProps) {
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [placesService, setPlacesService] = useState<google.maps.places.PlacesService | null>(null)
  const [vets, setVets] = useState<Vet[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [enteredLocation, setEnteredLocation] = useState("")
  const [loadingFavorite, setLoadingFavorite] = useState<string | null>(null)
  const [selectedPet, setSelectedPet] = useState<{ type: string } | null>(null)
  const [locationStatus, setLocationStatus] = useState<string | null>(null)
  const mapRef = useRef<HTMLDivElement>(null)
  const { user } = useAuth()

  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false)
  const [currentVet, setCurrentVet] = useState<Vet | null>(null)
  const [talkyLink, setTalkyLink] = useState("")
  const isDesktop = useMediaQuery("(min-width: 768px)")
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false)
  const [waitingForLocation, setWaitingForLocation] = useState(false)
  const locationTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  let google: any

  const [mapsApiKey, setMapsApiKey] = useState<string>("")
  const [placesApiKey, setPlacesApiKey] = useState<string>("")
  const [isLoadingKeys, setIsLoadingKeys] = useState(true)

  // Update the handleVideoMeeting function
  const handleVideoMeeting = (vet: Vet) => {
    const roomName = generateTalkyRoomName()
    const link = generateTalkyUrl(roomName)
    setTalkyLink(link)
    setCurrentVet(vet)
    setIsVideoModalOpen(true)
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(talkyLink)
    toast.success("Link copied to clipboard!")
  }

  // Update the getUserLocation function to check localStorage first
  const getUserLocation = () => {
    // Check if location permission is already stored
    const locationPermission = localStorage.getItem("locationPermission")

    if (locationPermission === "granted") {
      // If permission was previously granted, get the location without showing dialog
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (
            userLocation === null ||
            userLocation.lat !== position.coords.latitude ||
            userLocation.lng !== position.coords.longitude
          ) {
            setUserLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            })

            // If we were waiting for location to search, do the search now
            if (waitingForLocation) {
              setWaitingForLocation(false)
              // We need to wait for the state to update
              setTimeout(() => {
                searchWithLocation({
                  lat: position.coords.latitude,
                  lng: position.coords.longitude,
                })
              }, 100)
            }
          }
        },
        (error) => {
          console.error("Error getting user location:", error)
          setLocationStatus("Unable to get your location. Distances may not be accurate.")
          // If there's an error getting location even after permission was granted,
          // we might want to reset the permission
          localStorage.removeItem("locationPermission")
          setWaitingForLocation(false)
        },
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 },
      )
    } else if (locationPermission === "denied") {
      // If permission was previously denied, don't request again
      setLocationStatus("Location access was previously denied. Enter a location manually.")
      setWaitingForLocation(false)
    } else if (navigator.geolocation) {
      // If no stored preference and we're in the VetFinder component,
      // we'll defer to the parent component's dialog
      setLocationStatus("Waiting for location permission...")
    } else {
      console.error("Geolocation is not supported by this browser.")
      setLocationStatus("Geolocation is not supported. Distances may not be accurate.")
      setWaitingForLocation(false)
    }
  }

  // Listen for location updates
  useEffect(() => {
    if (userLocation && waitingForLocation) {
      setWaitingForLocation(false)
      // Clear the timeout when location is received
      if (locationTimeoutRef.current) {
        clearTimeout(locationTimeoutRef.current)
        locationTimeoutRef.current = null
      }
      searchWithLocation(userLocation)
    }
  }, [userLocation, waitingForLocation])

  // With this effect to fetch the keys:
  useEffect(() => {
    const fetchApiKeys = async () => {
      try {
        // Fetch Maps API key
        const mapsResponse = await fetch("/api/get-google-maps-api-key")
        const mapsData = await mapsResponse.json()

        // Fetch Places API key
        const placesResponse = await fetch("/api/get-google-places-api-key")
        const placesData = await placesResponse.json()

        if (mapsData.apiKey) {
          setMapsApiKey(mapsData.apiKey)
        }

        if (placesData.apiKey) {
          setPlacesApiKey(placesData.apiKey)
        }
      } catch (error) {
        console.error("Error fetching API keys:", error)
        setError("Failed to load map services. Please try again later.")
      } finally {
        setIsLoadingKeys(false)
      }
    }

    fetchApiKeys()
  }, [])

  // Update the loader initialization in the useEffect:
  useEffect(() => {
    console.log("VetFinder component mounted")

    if (isLoadingKeys) {
      return // Wait for API keys to load
    }

    const loader = new Loader({
      apiKey: mapsApiKey,
      version: "weekly",
      libraries: ["places"],
    })

    loader
      .load()
      .then((g) => {
        google = g
        if (mapRef.current) {
          const map = new google.maps.Map(mapRef.current, {
            center: { lat: 0, lng: 0 },
            zoom: 13,
            disableDefaultUI: true,
            zoomControl: true,
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: true,
          })
          setMap(map)
          setPlacesService(new google.maps.places.PlacesService(map))

          // Load saved vet data from local storage
          const savedData = localStorage.getItem("savedVetData")
          if (savedData) {
            const parsedData: SavedVetData = JSON.parse(savedData)
            // Check if the data is less than 24 hours old
            if (Date.now() - parsedData.timestamp < 24 * 60 * 60 * 1000) {
              setVets(parsedData.vets)
              setEnteredLocation(parsedData.enteredLocation)
              if (parsedData.mapCenter) {
                map.setCenter(parsedData.mapCenter)
              }
            } else {
              // If data is older than 24 hours, remove it
              localStorage.removeItem("savedVetData")
            }
          }
        }
      })
      .catch((e) => {
        console.error("Error loading Google Maps API:", e)
        setError("Failed to load Google Maps. Please try again later.")
      })
  }, [mapsApiKey, isLoadingKeys]) // Add dependencies

  useEffect(() => {
    // This effect runs when the user changes
    if (user) {
      // We only want to reset data when a user logs in (new session) or changes
      // We can check if we've already seen this user in this session
      const currentUserId = localStorage.getItem("currentVetFinderUserId")

      if (currentUserId !== user.uid) {
        console.log("User changed, resetting vet finder data")
        // Store the current user ID to track changes
        localStorage.setItem("currentVetFinderUserId", user.uid)

        // When a user logs in or changes, clear saved data from localStorage
        localStorage.removeItem("savedVetData")

        // Reset states
        setVets([])
        setEnteredLocation("")
        setError(null)
        setLocationStatus(null)

        // Reset map to default if it exists
        if (map) {
          map.setCenter({ lat: 0, lng: 0 })
        }
      } else {
        console.log("Same user, preserving vet finder data")
      }
    } else if (user === null) {
      // User logged out
      console.log("User logged out, resetting vet finder data")
      localStorage.removeItem("currentVetFinderUserId")
      localStorage.removeItem("savedVetData")

      // Reset states
      setVets([])
      setEnteredLocation("")
      setError(null)
      setLocationStatus(null)

      // Reset map to default if it exists
      if (map) {
        map.setCenter({ lat: 0, lng: 0 })
      }
    }
  }, [user, map])

  // Add an effect to listen for the locationPermissionDenied event
  useEffect(() => {
    const handleLocationPermissionDenied = () => {
      setWaitingForLocation(false)
      // Clear the timeout when permission is denied
      if (locationTimeoutRef.current) {
        clearTimeout(locationTimeoutRef.current)
        locationTimeoutRef.current = null
      }
    }

    window.addEventListener("locationPermissionDenied", handleLocationPermissionDenied)

    return () => {
      window.removeEventListener("locationPermissionDenied", handleLocationPermissionDenied)
    }
  }, [])

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (locationTimeoutRef.current) {
        clearTimeout(locationTimeoutRef.current)
        locationTimeoutRef.current = null
      }
    }
  }, [])

  const getPlaceDetails = async (placeId: string): Promise<google.maps.places.PlaceResult> => {
    return new Promise((resolve, reject) => {
      if (!placesService) {
        reject(new Error("Places service not initialized"))
        return
      }

      if (typeof window === "undefined" || !window.google || !window.google.maps || !window.google.maps.places) {
        console.error("Google Maps Places API is not loaded correctly.")
        reject(new Error("Google Maps Places API failed to load. Please try again later."))
        return
      }

      placesService.getDetails(
        {
          placeId: placeId,
          fields: ["opening_hours", "utc_offset_minutes", "formatted_phone_number", "website", "geometry"],
        },
        (result, status) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && result) {
            resolve(result)
          } else {
            reject(new Error(`Failed to get place details: ${status}`))
          }
        },
      )
    })
  }

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 3959 // Radius of the Earth in miles
    const dLat = (lat2 - lat1) * (Math.PI / 180)
    const dLon = (lon2 - lon1) * (Math.PI / 180)
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const distance = R * c
    return distance
  }

  // New function to search with a specific location
  const searchWithLocation = (location: { lat: number; lng: number }) => {
    if (!map || !placesService) {
      console.error("Map or Places service not initialized")
      setError("Map services not ready. Please try again in a few moments.")
      return
    }

    setLoading(true)
    setError(null)

    const googleLocation = new window.google.maps.LatLng(location.lat, location.lng)
    console.log("Searching nearby with location:", googleLocation.toString())
    map.setCenter(googleLocation)

    const nearbySearchRequest = {
      location: googleLocation,
      radius: 5000, // 5km radius
      type: "veterinary_care",
    }

    placesService.nearbySearch(nearbySearchRequest, async (results, status) => {
      console.log("Nearby search status:", status)
      if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
        console.log("Found", results.length, "results")
        try {
          const vetsWithDetails = await Promise.all(
            results.slice(0, 50).map(async (result) => {
              const basicVet: Vet = {
                placeId: result.place_id!,
                name: result.name || "Unknown",
                vicinity: result.vicinity || "No address provided",
                rating: result.rating,
                petType: selectedPet?.type || "pet",
                latitude: result.geometry?.location?.lat() || 0,
                longitude: result.geometry?.location?.lng() || 0,
              }

              try {
                const details = await getPlaceDetails(result.place_id!)
                const vetWithDetails = {
                  ...basicVet,
                  openingHours: details.opening_hours as OpeningHours | undefined,
                  currentlyOpen: details.opening_hours?.isOpen(),
                  phoneNumber: details.formatted_phone_number,
                  email: details.website && details.website.includes("@") ? details.website : undefined,
                }

                if (userLocation) {
                  vetWithDetails.distance = calculateDistance(
                    userLocation.lat,
                    userLocation.lng,
                    vetWithDetails.latitude,
                    vetWithDetails.longitude,
                  )
                }

                return vetWithDetails
              } catch (error) {
                console.warn(`Failed to get details for ${result.name}:`, error)
                return basicVet
              }
            }),
          )

          // Sort vets by distance if available
          const sortedVets = vetsWithDetails.sort(
            (a, b) => (a.distance || Number.POSITIVE_INFINITY) - (b.distance || Number.POSITIVE_INFINITY),
          )

          setVets(sortedVets)

          // Save vet data to local storage
          const dataToSave: SavedVetData = {
            vets: sortedVets,
            enteredLocation,
            timestamp: Date.now(),
            mapCenter: { lat: location.lat, lng: location.lng },
          }
          localStorage.setItem("savedVetData", JSON.stringify(dataToSave))
        } catch (error) {
          console.error("Error fetching vet details:", error)
          setError("Failed to fetch complete vet information. Please try again.")
        }
      } else {
        console.error("Nearby search failed with status:", status)
        setError(`No veterinarians found nearby. Status: ${status}`)
      }
      setLoading(false)
    })
  }

  // Update the searchVets function to properly handle the location permission flow
  const searchVets = () => {
    if (!map || !placesService) {
      console.error("Map or Places service not initialized")
      setError("Map services not ready. Please try again in a few moments.")
      return
    }

    setLoading(true)
    setError(null)

    if (enteredLocation) {
      console.log("Searching for entered location:", enteredLocation)
      const request = {
        query: enteredLocation,
        fields: ["name", "geometry"],
      }

      if (typeof window === "undefined" || !window.google || !window.google.maps || !window.google.maps.places) {
        console.error("Google Maps Places API is not loaded correctly.")
        setError("Google Maps Places API failed to load. Please try again later.")
        setLoading(false)
        return
      }

      if (!window.google || !window.google.maps || !window.google.maps.places) {
        console.error("Google Maps Places API is not loaded correctly.")
        setError("Google Maps Places API failed to load. Please try again later.")
        setLoading(false)
        return
      }

      placesService.findPlaceFromQuery(request, (results, status) => {
        console.log("Find place query status:", status)
        if (status === window.google.maps.places.PlacesServiceStatus.OK && results && results[0]) {
          const location = results[0].geometry?.location
          if (location) {
            const locationObj = { lat: location.lat(), lng: location.lng() }
            searchWithLocation(locationObj)
          } else {
            console.error("Location not found in results")
            setError("Unable to find the entered location. Please try a different location.")
            setLoading(false)
          }
        } else {
          console.error("Find place query failed with status:", status)
          setError(`Unable to find the entered location. Status: ${status}`)
          setLoading(false)
        }
      })
    } else {
      // If we don't have the user's location, request it
      setWaitingForLocation(true)

      // Set a timeout to stop waiting after 5 seconds
      locationTimeoutRef.current = setTimeout(() => {
        if (waitingForLocation) {
          setWaitingForLocation(false)
          setLocationStatus("Location request timed out. Please enter a location manually.")
          // The button will automatically return to its default state when waitingForLocation becomes false
          setLoading(false) // Make sure loading is also set to false
        }
      }, 5000)

      // Clear previous denial from localStorage to force the permission dialog to show again
      if (typeof window !== "undefined") {
        localStorage.removeItem("locationPermission")

        // Create and dispatch a custom event to notify the parent component
        console.log("Dispatching requestLocationPermission event")
        const event = new CustomEvent("requestLocationPermission")
        window.dispatchEvent(event)
      }

      setLoading(false)
    }
  }

  const toggleFavorite = async (vet: Vet) => {
    if (!user) {
      toast.error("You must be logged in to favorite vets.")
      return
    }

    setLoadingFavorite(vet.placeId)
    try {
      const isFavorite = favoriteVets.some((fav) => fav.placeId === vet.placeId)

      // Check if this vet already exists in the database by placeId only
      const placeIdQuery = query(
        collection(db, "favoriteVets"),
        where("userId", "==", user.uid),
        where("placeId", "==", vet.placeId),
      )
      const placeIdQuerySnapshot = await getDocs(placeIdQuery)
      const existsInDatabase = !placeIdQuerySnapshot.empty

      if (isFavorite) {
        // Remove from UI
        setFavoriteVets((prevFavorites) => prevFavorites.filter((fav) => fav.placeId !== vet.placeId))

        // Remove from database if it exists
        if (existsInDatabase) {
          const deletePromises = placeIdQuerySnapshot.docs.map((doc) => deleteDoc(doc.ref))
          await Promise.all(deletePromises)
        }
        toast.success("Removed from favorites")
      } else {
        // Add to database first, then update UI after success
        if (!existsInDatabase) {
          // Create the new favorite object
          const newFavorite: FavoriteVet = {
            placeId: vet.placeId,
            name: vet.name,
            vicinity: vet.vicinity,
            latitude: vet.latitude,
            longitude: vet.longitude,
            phoneNumber: vet.phoneNumber || "",
            email: vet.email,
            rating: vet.rating,
            petType: vet.petType,
            openingHours: vet.openingHours,
            currentlyOpen: vet.currentlyOpen,
          }

          // Add to database
          const vetDataToSave = {
            userId: user.uid,
            placeId: vet.placeId,
            name: vet.name,
            vicinity: vet.vicinity,
            phoneNumber: vet.phoneNumber || null,
            email: vet.email || null,
            rating: vet.rating || null,
            petType: vet.petType || null,
            latitude: vet.latitude,
            longitude: vet.longitude,
            createdAt: new Date().toISOString(),
          }

          // Only add openingHours if it exists and extract only the data we need
          if (vet.openingHours) {
            // Extract only the weekday_text array and periods array, not the functions
            vetDataToSave.openingHours = {
              weekday_text: vet.openingHours.weekday_text || [],
              periods: vet.openingHours.periods || [],
            }

            // Store currentlyOpen as a boolean, not a function result
            vetDataToSave.currentlyOpen = vet.currentlyOpen
          }

          await addDoc(collection(db, "favoriteVets"), vetDataToSave)

          // Only update UI after database operation succeeds
          setFavoriteVets((prevFavorites) => [...prevFavorites, newFavorite])
          toast.success("Added to favorites")
        } else {
          toast.info("This vet is already in your favorites")
        }
      }
    } catch (error) {
      console.error("Error toggling favorite:", error)
      toast.error(error instanceof Error ? error.message : "Failed to update favorites")
    } finally {
      setLoadingFavorite(null)
    }
  }

  const handleEmailVet = (vet: Vet) => {
    if (!vet.email || !vet.email.includes("@")) {
      toast.error("No valid email address available for this vet.")
      return
    }
    const subject = encodeURIComponent(`Appointment Request for ${vet.petType || "pet"}`)
    const body = encodeURIComponent(
      `Hello ${vet.name},\n\nI would like to schedule an appointment for my ${vet.petType || "pet"}. Please let me know your available time slots.\n\nThank you.`,
    )
    window.location.href = `mailto:${vet.email}?subject=${subject}&body=${body}`
  }

  const handleMeetInPerson = () => {
    setIsJoinModalOpen(true)
  }

  // Add a loading state at the beginning of the component render
  if (isLoadingKeys) {
    return <div className="p-4 text-center">Loading map services...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Input
          type="text"
          placeholder="Enter location (optional)"
          value={enteredLocation}
          onChange={(e) => setEnteredLocation(e.target.value)}
          className="flex-grow"
        />

        <Button
          onClick={searchVets}
          disabled={loading || waitingForLocation}
          className="bg-blue-500 hover:bg-blue-600 text-white w-[300px]"
        >
          {loading
            ? "Searching..."
            : waitingForLocation
              ? "Waiting for location..."
              : enteredLocation
                ? "Find Vets"
                : "Use My Location"}
          <Search className="ml-2 h-4 w-4" />
        </Button>
      </div>
      {locationStatus && <p className="text-sm text-blue-600 mt-2">{locationStatus}</p>}
      {error && <p className="text-red-500">{error}</p>}
      <div className="bg-blue-100 p-3 rounded-md mb-4 flex items-center">
        <Info className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0" />
        <p className="text-sm text-blue-600">
          Enter your location manually or grant access and automatically detect location.
        </p>
      </div>
      <div ref={mapRef} className="w-full h-[300px] rounded-lg overflow-hidden" />
      <div className="space-y-4 xl:grid xl:grid-cols-2 xl:gap-4 xl:space-y-0">
        {vets.map((vet, index) => (
          <div
            key={vet.placeId}
            className={`bg-white p-4 rounded-lg shadow relative ${index === 0 ? "border-2 border-orange-500" : ""}`}
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center">
                  <h3 className="font-semibold text-lg">{vet.name}</h3>
                  {index === 0 && <Badge className="ml-2 bg-orange-500">Closest</Badge>}
                </div>
                <p className="text-sm text-gray-600 flex items-center">
                  <MapPin className="mr-1 h-4 w-4" />
                  {vet.vicinity}
                </p>
                {vet.rating && <p className="text-sm">Rating: {vet.rating.toFixed(1)} / 5</p>}
                {vet.distance !== undefined && (
                  <p className="text-sm text-gray-600 mt-1">
                    <span className="font-medium">{vet.distance.toFixed(1)} miles away</span>
                  </p>
                )}
                {vet.phoneNumber && (
                  <p className="text-sm flex items-center mt-1">
                    <Phone className="mr-1 h-4 w-4" />
                    <a href={`tel:${vet.phoneNumber}`} className="text-blue-600 hover:underline">
                      {vet.phoneNumber}
                    </a>
                  </p>
                )}
                {vet.email && vet.email.includes("@") ? (
                  <p className="text-sm flex items-center mt-1">
                    <Mail className="mr-1 h-4 w-4" />
                    <a href={`mailto:${vet.email}`} className="text-blue-600 hover:underline">
                      {vet.email}
                    </a>
                  </p>
                ) : (
                  <p className="text-sm text-gray-500 mt-1">Vet doesn't have email listed.</p>
                )}
              </div>
              <div className="flex flex-col items-end">
                {typeof vet.currentlyOpen !== "undefined" && (
                  <span
                    className={`px-2 py-1 rounded text-sm mb-2 ${
                      vet.currentlyOpen ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                    }`}
                  >
                    {vet.currentlyOpen ? "Open" : "Closed"}
                  </span>
                )}
                <Button
                  onClick={() => toggleFavorite(vet)}
                  variant="ghost"
                  size="icon"
                  disabled={loadingFavorite === vet.placeId}
                  className={`${
                    favoriteVets.some((fav) => fav.placeId === vet.placeId) ? "text-red-500" : "text-gray-400"
                  }`}
                >
                  <Heart
                    className={`h-5 w-5 ${loadingFavorite === vet.placeId ? "animate-pulse" : ""}`}
                    fill={favoriteVets.some((fav) => fav.placeId === vet.placeId) ? "currentColor" : "none"}
                  />
                </Button>
              </div>
            </div>

            {vet.openingHours && (
              <div className="mt-3 border-t pt-3">
                <h4 className="font-medium text-sm flex items-center mb-2">
                  <Clock className="w-4 h-4 mr-1" />
                  Business Hours
                </h4>
                <div className="grid grid-cols-1 gap-1">
                  {vet.openingHours.weekday_text.map((dayHours, index) => (
                    <div key={index} className="text-sm grid grid-cols-[100px,1fr] gap-2">
                      <span className="text-gray-600">{dayHours.split(": ")[0]}:</span>
                      <span>{dayHours.split(": ")[1]}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 grid grid-cols-2 gap-2">
              {vet.phoneNumber && (
                <a href={`tel:${vet.phoneNumber}`} className="w-full">
                  <Button className="w-full flex items-center justify-center">
                    <Phone className="mr-2 h-4 w-4" />
                    Call
                  </Button>
                </a>
              )}
              <Button onClick={() => handleVideoMeeting(vet)} className="w-full flex items-center justify-center">
                <Video className="mr-2 h-4 w-4" />
                Video Meeting
              </Button>

              {vet.email && vet.email.includes("@") && (
                <Button onClick={() => handleEmailVet(vet)} className="w-full flex items-center justify-center">
                  <Mail className="mr-2 h-4 w-4" />
                  Email
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
      <Dialog open={isVideoModalOpen} onOpenChange={setIsVideoModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Video Meeting with {currentVet?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>Here's your private meeting room link:</p>
            <Input value={talkyLink} readOnly />
            <div className="flex space-x-2">
              <Button onClick={copyToClipboard} className="flex-1">
                Copy Link
              </Button>
            </div>
            <div className="flex space-x-2">
              <a
                href={`sms:${currentVet?.phoneNumber || ""}&body=Hi, I'd like to schedule a video consultation. Here's our private meeting room link: ${talkyLink}`}
                className="flex-1"
              >
                <Button className="w-full flex items-center justify-center">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Send SMS
                </Button>
              </a>
              <Button
                onClick={() => {
                  if (currentVet?.email && currentVet.email.includes("@")) {
                    window.location.href = `mailto:${currentVet.email}?subject=Video Meeting&body=Hi, I'd like to schedule a video consultation. Here's our private meeting room link: ${talkyLink}`
                  } else {
                    toast.error("No valid email address available for this vet.")
                  }
                }}
                className="flex-1"
                disabled={!currentVet?.email || !currentVet.email.includes("@")}
              >
                <Mail className="mr-2 h-4 w-4" />
                Send Email
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={isJoinModalOpen} onOpenChange={setIsJoinModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Not Available</DialogTitle>
          </DialogHeader>
          <p>This vet has not joined PetPulse yet.</p>
        </DialogContent>
      </Dialog>
    </div>
  )
}
