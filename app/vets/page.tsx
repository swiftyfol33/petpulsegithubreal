"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "../../contexts/AuthContext"
import { db } from "../../lib/firebase"
import { collection, query, where, getDocs, deleteDoc, getDoc, doc, addDoc } from "firebase/firestore"
import { PageHeader } from "../../components/page-header"
import { PetHeader } from "../../components/pet-header"
import { VetFinder } from "../../components/VetFinder"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import {
  RefreshCw,
  Mail,
  Copy,
  MessageSquare,
  Phone,
  MapPin,
  Star,
  Trash2,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { toast } from "react-hot-toast"
import { useSearchParams } from "next/navigation"
import { Card } from "@/components/ui/card"
import { useMediaQuery } from "@/hooks/use-media-query"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { format, addDays, startOfWeek, addWeeks, subWeeks, parseISO, isToday, isSameDay } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ShareVetDialog } from "./share-vet-dialog"
import { PremiumBanner } from "@/components/premium-banner"

// Declare google variable
declare global {
  interface Window {
    google: any
  }
}

interface FavoriteVet {
  id?: string // Firestore document ID
  placeId: string
  name: string
  vicinity: string
  phoneNumber?: string
  email?: string
  petType?: string
  distance?: number
  latitude?: number
  longitude?: number
  rating?: number
  currentlyOpen?: boolean
  openingHours?: {
    weekday_text: string[]
  }
}

interface SharedPet {
  id: string
  name: string
  type: string
  breed: string
  sharingHistory: SharingRecord[]
}

interface SharingRecord {
  vetId: string
  vetName: string
  vetEmail: string
  sharedAt: string
  status: string
  vetSpecialty?: string
  vetPhone?: string
  vetClinic?: string
  petId?: string
  petName?: string
  vetFirstName?: string
  vetLastName?: string
}

interface Appointment {
  id: string
  date: string
  time: string
  petName: string
  ownerName: string
  status: string
  notes?: string
  petId?: string
  ownerId?: string
}

interface Vet {
  id: string
  name: string
  specialty: string
  location: string
  rating: number
  image?: string
}

function generateTalkyRoomName() {
  return `petpulse-${Math.random().toString(36).substring(2, 15)}-${Date.now().toString(36)}`
}

function generateTalkyUrl(roomName: string) {
  return `https://talky.io/${roomName}`
}

export default function VetsPage() {
  const { user } = useAuth()
  const [favoriteVets, setFavoriteVets] = useState<FavoriteVet[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "favorites")
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const isDesktop = useMediaQuery("(min-width: 768px)")
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false)
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false)
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false)
  const [currentVet, setCurrentVet] = useState<FavoriteVet | null>(null)
  const [talkyLink, setTalkyLink] = useState("")
  const [isLocationDialogOpen, setIsLocationDialogOpen] = useState(false)
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [placesService, setPlacesService] = useState<google.maps.places.PlacesService | null>(null)
  const [enteredLocation, setEnteredLocation] = useState<string>("")
  const [vets, setVets] = useState<any[]>([])
  const [refreshKey, setRefreshKey] = useState(0)
  const [sharedPets, setSharedPets] = useState<SharedPet[]>([])
  const [loadingSharedPets, setLoadingSharedPets] = useState(true)
  const [sharedPetsError, setSharedPetsError] = useState<string | null>(null)
  const [sharingHistory, setSharingHistory] = useState<
    Array<{
      petId: string
      petName: string
      vetEmail: string
      sharedAt: number
    }>
  >([])
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 0 }))
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loadingAppointments, setLoadingAppointments] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string>("")
  const [selectedPet, setSelectedPet] = useState<string>("")
  const [appointmentNotes, setAppointmentNotes] = useState<string>("")
  const [schedulingAppointment, setSchedulingAppointment] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedVetForSharing, setSelectedVetForSharing] = useState<Vet | null>(null)
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false)

  const vetsData: Vet[] = [
    {
      id: "1",
      name: "Dr. Sarah Johnson",
      specialty: "General Veterinarian",
      location: "Downtown Pet Clinic",
      rating: 4.8,
      image: "/placeholder.svg?height=100&width=100",
    },
    {
      id: "2",
      name: "Dr. Michael Chen",
      specialty: "Feline Specialist",
      location: "Cat Care Center",
      rating: 4.9,
      image: "/placeholder.svg?height=100&width=100",
    },
    {
      id: "3",
      name: "Dr. Emily Rodriguez",
      specialty: "Canine Orthopedics",
      location: "Healthy Paws Veterinary",
      rating: 4.7,
      image: "/placeholder.svg?height=100&width=100",
    },
    {
      id: "4",
      name: "Dr. James Wilson",
      specialty: "Exotic Pet Specialist",
      location: "Exotic Animal Care",
      rating: 4.6,
      image: "/placeholder.svg?height=100&width=100",
    },
  ]

  const filteredVets = vetsData.filter(
    (vet) =>
      vet.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vet.specialty.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vet.location.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const handleShareClick = (vet: Vet) => {
    setSelectedVetForSharing(vet)
    setIsShareDialogOpen(true)
  }

  const removeFavorite = async (placeId: string) => {
    if (!user) {
      toast.error("You must be logged in to remove favorites.")
      return
    }

    try {
      // First, update the UI optimistically
      setFavoriteVets(favoriteVets.filter((vet) => vet.placeId !== placeId))

      // Then, remove from database
      const q = query(collection(db, "favoriteVets"), where("userId", "==", user.uid), where("placeId", "==", placeId))
      const querySnapshot = await getDocs(q)

      if (querySnapshot.empty) {
        console.log("No matching documents to delete")
        return
      }

      const deletePromises = querySnapshot.docs.map((doc) => deleteDoc(doc.ref))
      await Promise.all(deletePromises)

      toast.success("Vet removed from favorites")
    } catch (error) {
      console.error("Error removing favorite:", error)
      toast.error("Failed to remove vet from favorites")

      // Revert the UI change if there was an error
      fetchFavoriteVets()
    }
  }

  const fetchFavoriteVets = async () => {
    if (!user) {
      setFavoriteVets([])
      setLoading(false)
      return
    }

    setLoading(true)

    try {
      const q = query(collection(db, "favoriteVets"), where("userId", "==", user.uid))
      const querySnapshot = await getDocs(q)

      // Use a Map to deduplicate by placeId only
      const favoritesMap = new Map<string, FavoriteVet>()

      querySnapshot.docs.forEach((doc) => {
        const data = doc.data()

        // Only store by placeId - simplest and most reliable deduplication
        if (!favoritesMap.has(data.placeId)) {
          favoritesMap.set(data.placeId, {
            id: doc.id,
            placeId: data.placeId,
            name: data.name,
            vicinity: data.vicinity,
            latitude: data.latitude,
            longitude: data.longitude,
            phoneNumber: data.phoneNumber || "",
            email: data.email,
            rating: data.rating,
            petType: data.petType,
            openingHours: data.openingHours,
            currentlyOpen: data.currentlyOpen,
          })
        }
      })

      // Convert Map to array
      const favorites = Array.from(favoritesMap.values())

      // Calculate distances if user location is available
      if (userLocation) {
        favorites.forEach((vet) => {
          if (vet.latitude && vet.longitude) {
            vet.distance = calculateDistance(userLocation.lat, userLocation.lng, vet.latitude, vet.longitude)
          }
        })
        // Sort by distance
        favorites.sort((a, b) => (a.distance || Number.POSITIVE_INFINITY) - (b.distance || Number.POSITIVE_INFINITY))
      }

      setFavoriteVets(favorites)

      // Log the deduplication results
      console.log(`Deduplication: ${querySnapshot.docs.length} total vets reduced to ${favorites.length} unique vets`)
    } catch (error) {
      console.error("Error fetching favorite vets:", error)
      toast.error("Failed to load your favorite vets")
    } finally {
      setLoading(false)
    }
  }

  const fetchSharingHistory = useCallback(async () => {
    if (!user) return

    try {
      console.log("Fetching sharing history...")
      const sharingRef = collection(db, "petSharing")
      // Try without the 'active' filter first to see what data exists
      const q = query(sharingRef, where("ownerId", "==", user.uid))
      const querySnapshot = await getDocs(q)

      console.log(`Found ${querySnapshot.docs.length} sharing documents`)

      const sharingData = await Promise.all(
        querySnapshot.docs.map(async (doc) => {
          const data = doc.data()
          console.log("Sharing document data:", data)

          // More detailed logging of vet profile data
          console.log("DEBUG - Vet profile data:", {
            vetId: data.vetId,
            vetEmail: data.vetEmail,
            vetName: data.vetName,
            vetFirstName: data.vetFirstName,
            vetLastName: data.vetLastName,
          })

          // Get pet name
          const petDoc = await getDoc(doc(db, "pets", data.petId))
          const petName = petDoc.exists() ? petDoc.data().name : "Unknown Pet"

          // If we have a vetId, try to fetch the vet's profile data to get their name
          let vetProfileData = null
          if (data.vetId) {
            try {
              const vetDoc = await getDoc(doc(db, "users", data.vetId))
              if (vetDoc.exists()) {
                vetProfileData = vetDoc.data()
                console.log("DEBUG - Found vet profile:", {
                  firstName: vetProfileData.firstName,
                  lastName: vetProfileData.lastName,
                  email: vetProfileData.email,
                  phone: vetProfileData.phone,
                })
              }
            } catch (err) {
              console.error("Error fetching vet profile:", err)
            }
          }

          return {
            petId: data.petId,
            petName,
            vetEmail: data.vetEmail,
            vetId: data.vetId || "",
            sharedAt: data.sharedAt,
            active: data.active !== false, // Default to true if not specified
            vetSpecialty: data.vetSpecialty || "",
            vetPhone: vetProfileData?.phone || data.vetPhone || "",
            vetClinic: data.vetClinic || "",
            // Prioritize profile data if available
            vetFirstName: vetProfileData?.firstName || data.vetFirstName || "",
            vetLastName: vetProfileData?.lastName || data.vetLastName || "",
            vetName:
              vetProfileData?.firstName && vetProfileData?.lastName
                ? `${vetProfileData.firstName} ${vetProfileData.lastName}`
                : data.vetName || "",
          }
        }),
      )

      // Filter active shares client-side to be safe
      const activeShares = sharingData.filter((share) => share.active)
      console.log("Active sharing data:", activeShares)

      setSharingHistory(activeShares)
    } catch (error) {
      console.error("Error fetching sharing history:", error)
    }
  }, [user])

  useEffect(() => {
    fetchFavoriteVets()
    fetchSharingHistory()
  }, [fetchSharingHistory, user])

  // Clear user location when user changes
  useEffect(() => {
    if (user) {
      // We only want to reset location data when a user logs in (new session) or changes
      const currentUserId = localStorage.getItem("currentVetsPageUserId")

      if (currentUserId !== user.uid) {
        console.log("User changed, resetting location data")
        // Store the current user ID to track changes
        localStorage.setItem("currentVetsPageUserId", user.uid)

        // Reset user location when user changes
        setUserLocation(null)

        // Also clear location permission from localStorage when user changes
        if (typeof window !== "undefined") {
          localStorage.removeItem("locationPermission")
        }

        // Reset the location dialog state
        setIsLocationDialogOpen(false)
      } else {
        console.log("Same user, preserving location data")
      }
    } else if (user === null) {
      // User logged out
      console.log("User logged out, resetting location data")
      localStorage.removeItem("currentVetsPageUserId")

      // Reset user location
      setUserLocation(null)

      // Clear location permission from localStorage
      if (typeof window !== "undefined") {
        localStorage.removeItem("locationPermission")
      }

      // Reset the location dialog state
      setIsLocationDialogOpen(false)
    }
  }, [user])

  // Add an event listener for the custom event in the useEffect hook
  useEffect(() => {
    // Function to handle the custom event
    const handleLocationPermissionRequest = () => {
      console.log("Location permission request event received")
      setIsLocationDialogOpen(true)
    }

    // Add event listener when component mounts
    window.addEventListener("requestLocationPermission", handleLocationPermissionRequest)

    // Remove event listener when component unmounts
    return () => {
      window.removeEventListener("requestLocationPermission", handleLocationPermissionRequest)
    }
  }, [])

  // Add a new function to get location without showing the dialog
  const getLocationWithoutDialog = () => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        })
      },
      (error) => {
        console.error("Error getting user location:", error)
        // If there's an error getting location even after permission was granted,
        // we might want to reset the permission
        localStorage.removeItem("locationPermission")
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 },
    )
  }

  const getUserLocation = () => {
    // Check if permission was already granted
    const locationPermission = localStorage.getItem("locationPermission")

    if (locationPermission === "granted") {
      // If permission was already granted, get location without showing dialog
      getLocationWithoutDialog()
      return
    }

    if (navigator.geolocation) {
      setIsLocationDialogOpen(true)
    } else {
      console.error("Geolocation is not supported by this browser.")
      toast.error("Geolocation is not supported. Distances may not be accurate.")
    }
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

  const refreshFavorites = async () => {
    if (!user) return
    await fetchFavoriteVets()
    toast.success("Favorites refreshed successfully")
  }

  const handleVideoMeeting = (vet: FavoriteVet) => {
    const roomName = generateTalkyRoomName()
    const talkyUrl = generateTalkyUrl(roomName)
    setTalkyLink(talkyUrl)
    setCurrentVet(vet)
    setIsVideoModalOpen(true)
  }

  const handleEmailVet = (vet: FavoriteVet) => {
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

  const handleMeetInPerson = (vet: any) => {
    setCurrentVet(vet)
    setSelectedDate(null)
    setSelectedTime("")
    setSelectedPet("")
    setAppointmentNotes("")
    fetchVetAppointments(vet.vetId || vet.placeId)
    setIsScheduleModalOpen(true)
  }

  const fetchVetAppointments = async (vetId: string) => {
    if (!vetId) {
      toast.error("Vet ID not available")
      return
    }

    setLoadingAppointments(true)
    try {
      // Query appointments for this vet
      const appointmentsQuery = query(collection(db, "appointments"), where("vetId", "==", vetId))
      const snapshot = await getDocs(appointmentsQuery)

      const fetchedAppointments: Appointment[] = snapshot.docs.map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          date: data.date,
          time: data.time,
          petName: data.petName || "Unknown Pet",
          ownerName: data.ownerName || "Unknown Owner",
          status: data.status || "scheduled",
          notes: data.notes,
          petId: data.petId,
          ownerId: data.ownerId,
        }
      })

      setAppointments(fetchedAppointments)
      console.log("Fetched appointments:", fetchedAppointments)
    } catch (error) {
      console.error("Error fetching appointments:", error)
      toast.error("Failed to load vet's schedule")
    } finally {
      setLoadingAppointments(false)
    }
  }

  const handleNextWeek = () => {
    setCurrentWeek(addWeeks(currentWeek, 1))
  }

  const handlePrevWeek = () => {
    setCurrentWeek(subWeeks(currentWeek, 1))
  }

  const getWeekDays = () => {
    const days = []
    for (let i = 0; i < 7; i++) {
      days.push(addDays(currentWeek, i))
    }
    return days
  }

  const getAppointmentsForDay = (date: Date) => {
    return appointments.filter((appointment) => {
      if (!appointment.date) return false
      try {
        const appointmentDate = parseISO(appointment.date)
        return isSameDay(appointmentDate, date)
      } catch (error) {
        console.error("Error parsing date:", error)
        return false
      }
    })
  }

  const getAvailableTimeSlots = (date: Date) => {
    // Default available time slots
    const allTimeSlots = [
      "9:00 AM",
      "9:30 AM",
      "10:00 AM",
      "10:30 AM",
      "11:00 AM",
      "11:30 AM",
      "12:00 PM",
      "12:30 PM",
      "1:00 PM",
      "1:30 PM",
      "2:00 PM",
      "2:30 PM",
      "3:00 PM",
      "3:30 PM",
      "4:00 PM",
      "4:30 PM",
    ]

    // Get booked appointments for this day
    const dayAppointments = getAppointmentsForDay(date)
    const bookedTimes = dayAppointments.map((app) => app.time)

    // Filter out booked times
    return allTimeSlots.filter((time) => !bookedTimes.includes(time))
  }

  const handleScheduleAppointment = async () => {
    if (!user) {
      toast.error("You must be logged in to schedule an appointment")
      return
    }

    if (!selectedDate || !selectedTime || !selectedPet) {
      toast.error("Please select a date, time, and pet for your appointment")
      return
    }

    if (!currentVet) {
      toast.error("Vet information is missing")
      return
    }

    setSchedulingAppointment(true)

    try {
      // Get pet details
      const petDoc = await getDoc(doc(db, "pets", selectedPet))
      if (!petDoc.exists()) {
        throw new Error("Selected pet not found")
      }

      const petData = petDoc.data()

      // Create appointment
      const appointmentData = {
        vetId: currentVet.vetId || currentVet.placeId,
        vetName: currentVet.name,
        ownerId: user.uid,
        ownerName: user.displayName || user.email?.split("@")[0] || "Pet Owner",
        petId: selectedPet,
        petName: petData.name,
        date: format(selectedDate, "yyyy-MM-dd"),
        time: selectedTime,
        status: "pending",
        notes: appointmentNotes,
        createdAt: new Date().toISOString(),
      }

      await addDoc(collection(db, "appointments"), appointmentData)

      toast.success("Appointment scheduled successfully!")
      setIsScheduleModalOpen(false)

      // Refresh appointments
      fetchVetAppointments(currentVet.vetId || currentVet.placeId)
    } catch (error) {
      console.error("Error scheduling appointment:", error)
      toast.error("Failed to schedule appointment")
    } finally {
      setSchedulingAppointment(false)
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(talkyLink)
    toast.success("Link copied to clipboard!")
  }

  const handleLocationPermission = () => {
    // Save the permission choice to localStorage
    localStorage.setItem("locationPermission", "granted")

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        })
        setIsLocationDialogOpen(false)
        // Trigger the search with the new location
        // searchVets(); //Commented out because searchVets() uses enteredLocation which is not set here.
      },
      (error) => {
        console.error("Error getting user location:", error)
        toast.error("Unable to get your location. Distances may not be accurate.")
        // If there's an error, we might want to reset the permission
        localStorage.removeItem("locationPermission")
        setIsLocationDialogOpen(false)
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 },
    )
  }

  // Add a function to handle denying location permission
  const handleDenyLocationPermission = () => {
    // Save the denial to localStorage
    localStorage.setItem("locationPermission", "denied")
    setIsLocationDialogOpen(false)

    // Also reset the waiting state in case it was set
    if (typeof window !== "undefined") {
      const resetEvent = new CustomEvent("locationPermissionDenied")
      window.dispatchEvent(resetEvent)
    }
  }

  const searchVets = () => {
    if (!map || !placesService) {
      console.error("Map or Places service not initialized")
      setError("Map services not ready. Please try again in a few moments.")
      return
    }

    setLoading(true)
    setError(null)

    if (enteredLocation) {
      // ... (keep the existing code for entered location)
    } else {
      getUserLocation()
    }
  }

  const fetchSharedPetsHistory = async () => {
    if (!user) {
      setSharedPets([])
      setLoadingSharedPets(false)
      return
    }

    setLoadingSharedPets(true)
    setSharedPetsError(null)

    try {
      // Query pets owned by the current user
      const petsQuery = query(collection(db, "pets"), where("userId", "==", user.uid))
      const petsSnapshot = await getDocs(petsQuery)

      const petsWithSharingHistory: SharedPet[] = []
      const vetProfiles = new Map() // Cache for vet profiles

      // Process each pet
      for (const petDoc of petsSnapshot.docs) {
        const petData = petDoc.data()

        // Only include pets that have sharing history
        if (petData.sharedWithVets && petData.sharedWithVets.length > 0) {
          // Make sure each sharing record has a name and add petId and petName
          const sharingPromises = petData.sharedWithVets.map(async (record) => {
            // Create a new record with petId and petName
            const updatedRecord = {
              ...record,
              petId: petDoc.id,
              petName: petData.name || "Unnamed Pet",
            }

            // Try to get vet profile data if we have a vetId
            if (updatedRecord.vetId && !vetProfiles.has(updatedRecord.vetId)) {
              try {
                const vetDoc = await getDoc(doc(db, "users", updatedRecord.vetId))
                if (vetDoc.exists()) {
                  const vetData = vetDoc.data()
                  vetProfiles.set(updatedRecord.vetId, {
                    firstName: vetData.firstName || "",
                    lastName: vetData.lastName || "",
                    email: vetData.email || "",
                    phone: vetData.phone || "",
                  })

                  console.log(
                    `DEBUG - Fetched vet profile for ${updatedRecord.vetId}:`,
                    vetProfiles.get(updatedRecord.vetId),
                  )
                }
              } catch (err) {
                console.error(`Error fetching vet profile for ${updatedRecord.vetId}:`, err)
              }
            }

            // Use profile data if available
            if (updatedRecord.vetId && vetProfiles.has(updatedRecord.vetId)) {
              const profile = vetProfiles.get(updatedRecord.vetId)
              updatedRecord.vetFirstName = profile.firstName
              updatedRecord.vetLastName = profile.lastName

              // Set the phone number from profile if available
              if (profile.phone) {
                updatedRecord.vetPhone = profile.phone
                console.log(`DEBUG - Set vetPhone from profile: ${updatedRecord.vetPhone}`)
              }

              // Set the full name if we have both first and last name
              if (profile.firstName && profile.lastName) {
                updatedRecord.vetName = `${profile.firstName} ${profile.lastName}`
                console.log(`DEBUG - Set vetName from profile: ${updatedRecord.vetName}`)
              }
            }

            // Debug the record data
            console.log("DEBUG - Pet sharing record:", {
              vetId: updatedRecord.vetId,
              vetName: updatedRecord.vetName,
              vetFirstName: updatedRecord.vetFirstName,
              vetLastName: updatedRecord.vetLastName,
              vetEmail: updatedRecord.vetEmail,
              vetPhone: updatedRecord.vetPhone,
            })

            // If vetName is missing but we have first and last name, construct it
            if (!updatedRecord.vetName && updatedRecord.vetFirstName && updatedRecord.vetLastName) {
              updatedRecord.vetName = `${updatedRecord.vetFirstName} ${updatedRecord.vetLastName}`
              console.log("DEBUG - Constructed vetName from first/last name:", updatedRecord.vetName)
            }

            // If vetName is still missing but we have vetEmail, use that as a fallback display name
            if (!updatedRecord.vetName && updatedRecord.vetEmail) {
              updatedRecord.vetName = updatedRecord.vetEmail.split("@")[0] // Use part before @ as a name if no name exists
              console.log("DEBUG - Setting vetName from email:", updatedRecord.vetName)
            }

            // Extract first and last name from vetName if available and we don't already have them
            if (updatedRecord.vetName && !updatedRecord.vetFirstName && !updatedRecord.vetLastName) {
              const nameParts = updatedRecord.vetName.split(" ")
              if (nameParts.length >= 2) {
                updatedRecord.vetFirstName = nameParts[0]
                updatedRecord.vetLastName = nameParts.slice(1).join(" ")
                console.log("DEBUG - Extracted name parts:", {
                  firstName: updatedRecord.vetFirstName,
                  lastName: updatedRecord.vetLastName,
                })
              } else {
                updatedRecord.vetFirstName = updatedRecord.vetName
                console.log("DEBUG - Set firstName only:", updatedRecord.vetFirstName)
              }
            }

            return updatedRecord
          })

          const sharingHistory = await Promise.all(sharingPromises)

          petsWithSharingHistory.push({
            id: petDoc.id,
            name: petData.name || "Unnamed Pet",
            type: petData.type || "Unknown",
            breed: petData.breed || "Unknown",
            sharingHistory: sharingHistory,
          })
        }
      }

      setSharedPets(petsWithSharingHistory)
      console.log("DEBUG - Processed shared pets:", petsWithSharingHistory)
    } catch (error) {
      console.error("Error fetching shared pets history:", error)
      setSharedPetsError("Failed to load your pet sharing history")
    } finally {
      setLoadingSharedPets(false)
    }
  }

  useEffect(() => {
    fetchSharedPetsHistory()
  }, [user])

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM d, yyyy h:mm a")
    } catch (error) {
      return "Invalid date"
    }
  }

  const refreshHistory = () => {
    fetchSharingHistory()
    fetchFavoriteVets()
    toast.success("History refreshed")
  }

  // Add this useEffect to check for existing location permission on component mount
  useEffect(() => {
    // Check if permission was already granted
    const locationPermission = localStorage.getItem("locationPermission")

    if (locationPermission === "granted" && !userLocation) {
      // If permission was already granted but we don't have location yet, get it
      getLocationWithoutDialog()
    }
  }, [userLocation]) // Only run when userLocation changes or on initial mount

  return (
    <div className="flex flex-col min-h-screen bg-[#FFFFFF]">
      <PageHeader title="Find Vets" />
      <PetHeader />
      <PremiumBanner />
      <main className="flex-grow p-4 pb-24 lg:pb-6">
        <div className="p-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-[1100px] mx-auto">
            <div className="flex items-center justify-center mb-4">
              <TabsList className="grid w-full grid-cols-2 relative max-w-2xl mb-[10px]">
                <TabsTrigger value="favorites">Your Vets</TabsTrigger>
                <TabsTrigger value="find">Find Vets</TabsTrigger>
              </TabsList>
              {activeTab === "favorites" ? (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={refreshFavorites}
                  disabled={loading}
                  className="ml-2 h-8 w-8"
                >
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  <span className="sr-only">Refresh favorites</span>
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    // Clear saved data and force VetFinder to remount
                    localStorage.removeItem("savedVetData")
                    setRefreshKey((prevKey) => prevKey + 1)
                    toast.success("Search refreshed")
                  }}
                  disabled={loading}
                  className="ml-2 h-8 w-8"
                >
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  <span className="sr-only">Refresh search</span>
                </Button>
              )}
            </div>

            <TabsContent value="find" className="m-0">
              <VetFinder
                key={refreshKey}
                favoriteVets={favoriteVets}
                setFavoriteVets={setFavoriteVets}
                userLocation={userLocation}
                setUserLocation={setUserLocation}
                hideMeetInPerson={true}
              />
            </TabsContent>

            <TabsContent value="favorites" className="m-0">
              {activeTab === "favorites" && (
                <div className="flex flex-col gap-6 mt-4">
                  {/* Favorited Vets Section - Now First */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 shadow-sm border border-blue-100">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-semibold text-blue-800">Favorited Vets</h2>
                      <Button
                        onClick={refreshFavorites}
                        variant="outline"
                        size="sm"
                        disabled={loading}
                        className="text-xs bg-white hover:bg-blue-50"
                      >
                        {loading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="mr-1 h-3 w-3" />
                        )}
                        Refresh
                      </Button>
                    </div>

                    {loading ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                      </div>
                    ) : favoriteVets.length > 0 ? (
                      <div className="space-y-4">
                        {favoriteVets.map((vet) => (
                          <Card
                            key={vet.placeId}
                            className="p-4 border-blue-200 bg-white hover:shadow-md transition-shadow"
                          >
                            <div className="flex justify-between items-start">
                              <div className="space-y-1">
                                <h3 className="font-semibold text-lg flex items-center">
                                  {vet.name}
                                  {vet.rating && (
                                    <span className="ml-2 flex items-center text-sm text-yellow-500">
                                      <Star className="h-4 w-4 mr-1 fill-yellow-500 text-yellow-500" />
                                      {vet.rating}
                                    </span>
                                  )}
                                </h3>
                                <p className="text-sm text-gray-600 flex items-center">
                                  <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                                  {vet.vicinity}
                                </p>
                                {vet.phoneNumber && (
                                  <p className="text-sm text-gray-600 flex items-center">
                                    <Phone className="h-4 w-4 mr-1 text-gray-400" />
                                    {vet.phoneNumber}
                                  </p>
                                )}
                                {vet.email && (
                                  <p className="text-sm text-gray-600 flex items-center">
                                    <Mail className="h-4 w-4 mr-1 text-gray-400" />
                                    {vet.email}
                                  </p>
                                )}
                                {vet.distance !== undefined && (
                                  <p className="text-sm text-gray-600">{vet.distance.toFixed(1)} miles away</p>
                                )}
                                {vet.currentlyOpen !== undefined && (
                                  <Badge
                                    variant={vet.currentlyOpen ? "outline" : "secondary"}
                                    className={vet.currentlyOpen ? "bg-green-100 text-green-800 border-green-200" : ""}
                                  >
                                    {vet.currentlyOpen ? "Open Now" : "Closed"}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex flex-col gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeFavorite(vet.placeId)}
                                  className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  <span className="sr-only">Remove from favorites</span>
                                </Button>
                                <div className="flex flex-col gap-2 mt-2">
                                  {vet.email && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleEmailVet(vet)}
                                      className="text-xs"
                                    >
                                      <Mail className="mr-1 h-3 w-3" />
                                      Email
                                    </Button>
                                  )}
                                  {vet.phoneNumber && (
                                    <a href={`tel:${vet.phoneNumber}`} className="w-full">
                                      <Button variant="outline" size="sm" className="text-xs w-full">
                                        <Phone className="mr-1 h-3 w-3" />
                                        Call
                                      </Button>
                                    </a>
                                  )}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleVideoMeeting(vet)}
                                    className="text-xs"
                                  >
                                    <MessageSquare className="mr-1 h-3 w-3" />
                                    Video Chat
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-white rounded-lg p-6 text-center">
                        <p className="text-gray-600">
                          You haven't favorited any vets yet. Go to the "Find Vets" tab to search for vets and add them
                          to your favorites.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Vets You Share With Section */}
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 shadow-sm border border-purple-100">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-semibold text-purple-800">Vets You Share With</h2>
                      <Button
                        onClick={refreshHistory}
                        variant="outline"
                        size="sm"
                        disabled={loadingSharedPets}
                        className="text-xs bg-white hover:bg-purple-50"
                      >
                        {loadingSharedPets ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="mr-1 h-3 w-3" />
                        )}
                        Refresh
                      </Button>
                    </div>

                    {loadingSharedPets ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                      </div>
                    ) : sharedPetsError ? (
                      <div className="bg-red-50 p-4 rounded-lg text-red-600 text-center">{sharedPetsError}</div>
                    ) : sharedPets.length > 0 ? (
                      <div className="space-y-4">
                        {sharedPets.map((pet) => (
                          <Card
                            key={pet.id}
                            className="p-4 border-purple-200 bg-white hover:shadow-md transition-shadow"
                          >
                            <h3 className="font-semibold text-lg mb-2 text-purple-900">
                              {pet.name}{" "}
                              <span className="text-sm font-normal text-gray-600">
                                ({pet.type} - {pet.breed})
                              </span>
                            </h3>

                            <div className="space-y-3">
                              {pet.sharingHistory.map((record, index) => (
                                <div key={index} className="border-t pt-3 first:border-t-0 first:pt-0">
                                  <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                      <div className="flex flex-col">
                                        <h4 className="font-medium text-base">{record.vetName || record.vetEmail}</h4>
                                        {record.vetSpecialty && (
                                          <Badge
                                            variant="outline"
                                            className="text-xs self-start mt-1 bg-purple-50 text-purple-700 border-purple-200"
                                          >
                                            {record.vetSpecialty}
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="text-sm text-gray-600">{record.vetEmail}</p>
                                      {record.vetPhone && <p className="text-sm text-gray-600">{record.vetPhone}</p>}
                                      {record.vetClinic && <p className="text-sm text-gray-600">{record.vetClinic}</p>}
                                      <p className="text-sm text-gray-600">Shared on {formatDate(record.sharedAt)}</p>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                      <Badge
                                        className={
                                          record.status === "active"
                                            ? "bg-green-100 text-green-800 hover:bg-green-100"
                                            : "bg-red-100 text-red-800 hover:bg-red-100"
                                        }
                                      >
                                        {record.status === "active" ? "Active" : "Revoked"}
                                      </Badge>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-white rounded-lg p-6 text-center">
                        <p className="text-gray-600">You haven't shared any pets with vets yet.</p>
                      </div>
                    )}
                  </div>

                  {/* Currently Shared With Section */}
                  <div className="bg-gradient-to-br from-green-50 to-teal-50 rounded-xl p-6 shadow-sm border border-green-100">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-semibold text-green-800">Currently Shared With</h2>
                    </div>

                    {loadingSharedPets ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-green-500" />
                      </div>
                    ) : sharedPets.length > 0 ? (
                      <div className="space-y-4">
                        {/* Extract unique vets from all pets' sharing history */}
                        {(() => {
                          // Get all active sharing records
                          const allSharingRecords = sharedPets.flatMap((pet) =>
                            pet.sharingHistory.filter((record) => record.status === "active"),
                          )

                          // Create a Map to deduplicate vets by email
                          const uniqueVets = new Map()
                          allSharingRecords.forEach((record) => {
                            if (!uniqueVets.has(record.vetEmail)) {
                              uniqueVets.set(record.vetEmail, {
                                ...record,
                                pets: [{ id: record.petId, name: record.petName || "Unknown Pet" }],
                              })
                            } else {
                              // Add pet to existing vet's pets list if not already there
                              const existingVet = uniqueVets.get(record.vetEmail)
                              if (!existingVet.pets.some((p) => p.id === record.petId)) {
                                existingVet.pets.push({ id: record.petId, name: record.petName || "Unknown Pet" })
                              }
                            }
                          })

                          // Convert Map to array
                          const vetsArray = Array.from(uniqueVets.values())

                          // Debug the vets array
                          console.log(
                            "DEBUG - Unique vets for display:",
                            vetsArray.map((vet) => ({
                              email: vet.vetEmail,
                              firstName: vet.vetFirstName,
                              lastName: vet.vetLastName,
                              name: vet.vetName,
                              phone: vet.vetPhone,
                              displayName:
                                vet.vetFirstName && vet.vetLastName
                                  ? `${vet.vetFirstName} ${vet.vetLastName}`
                                  : vet.vetName || vet.vetEmail.split("@")[0],
                            })),
                          )

                          return vetsArray.length > 0 ? (
                            vetsArray.map((vet, index) => {
                              // Debug each vet's display name
                              const displayName =
                                vet.vetFirstName && vet.vetLastName
                                  ? `${vet.vetFirstName} ${vet.vetLastName}`
                                  : vet.vetName && !vet.vetName.includes("@")
                                    ? vet.vetName
                                    : vet.vetEmail.split("@")[0]

                              console.log(`DEBUG - Vet ${index} display name:`, {
                                displayName,
                                firstName: vet.vetFirstName,
                                lastName: vet.vetLastName,
                                name: vet.vetName,
                                email: vet.vetEmail,
                                phone: vet.vetPhone,
                              })

                              return (
                                <Card
                                  key={index}
                                  className="p-4 border-green-200 bg-white hover:shadow-md transition-shadow"
                                >
                                  <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                      <h3 className="font-semibold text-lg">{displayName}</h3>
                                      <p className="text-sm text-gray-600">{vet.vetEmail}</p>
                                      {vet.vetPhone && <p className="text-sm text-gray-600">{vet.vetPhone}</p>}
                                      {vet.vetClinic && <p className="text-sm text-gray-600">{vet.vetClinic}</p>}
                                      {vet.vetSpecialty && (
                                        <Badge
                                          variant="outline"
                                          className="text-xs mt-1 bg-green-50 text-green-700 border-green-200"
                                        >
                                          {vet.vetSpecialty}
                                        </Badge>
                                      )}
                                      <div className="mt-2">
                                        <p className="text-sm font-medium">Shared Pets:</p>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                          {vet.pets &&
                                            vet.pets.map((pet) => (
                                              <Badge
                                                key={pet.id}
                                                variant="secondary"
                                                className="text-xs bg-green-100 text-green-800 border-green-200"
                                              >
                                                {pet.name}
                                              </Badge>
                                            ))}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                      <div className="flex flex-col gap-2 mt-2">
                                        {vet.vetEmail && (
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                              handleEmailVet({
                                                name: displayName,
                                                email: vet.vetEmail,
                                                placeId: vet.vetId || "shared-vet",
                                                vicinity: vet.vetClinic || "",
                                                petType: "",
                                              })
                                            }
                                            className="text-xs"
                                          >
                                            <Mail className="mr-1 h-3 w-3" />
                                            Email
                                          </Button>
                                        )}
                                        {vet.vetPhone && (
                                          <a href={`tel:${vet.vetPhone}`} className="w-full">
                                            <Button variant="outline" size="sm" className="text-xs w-full">
                                              <Phone className="mr-1 h-3 w-3" />
                                              Call
                                            </Button>
                                          </a>
                                        )}
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() =>
                                            handleVideoMeeting({
                                              name: displayName,
                                              email: vet.vetEmail,
                                              placeId: vet.vetId || "shared-vet",
                                              vicinity: vet.vetClinic || "",
                                              phoneNumber: vet.vetPhone,
                                            })
                                          }
                                          className="text-xs"
                                        >
                                          <MessageSquare className="mr-1 h-3 w-3" />
                                          Video Chat
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                </Card>
                              )
                            })
                          ) : (
                            <div className="bg-white rounded-lg p-6 text-center">
                              <p className="text-gray-600">No active vet sharing found.</p>
                            </div>
                          )
                        })()}
                      </div>
                    ) : (
                      <div className="bg-white rounded-lg p-6 text-center">
                        <p className="text-gray-600">You haven't shared any pets with vets yet.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Dialog open={isJoinModalOpen} onOpenChange={setIsJoinModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Not Available</DialogTitle>
          </DialogHeader>
          <p>This vet has not joined PetPulse yet.</p>
        </DialogContent>
      </Dialog>
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
                <Copy className="mr-2 h-4 w-4" />
                Copy Link
              </Button>
            </div>
            <div className="flex flex-col space-y-2">
              {currentVet?.phoneNumber && (
                <a
                  href={`sms:${currentVet.phoneNumber}&body=Hi, I'd like to schedule a video consultation. Here's our private meeting room link: ${talkyLink}`}
                  className="w-full"
                >
                  <Button className="w-full flex items-center justify-center">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Send by SMS
                  </Button>
                </a>
              )}
              {currentVet?.email && currentVet.email.includes("@") && (
                <Button
                  onClick={() => {
                    window.location.href = `mailto:${currentVet.email}?subject=Video Meeting&body=Hi, I'd like to schedule a video consultation. Here's our private meeting room link: ${talkyLink}`
                  }}
                  className="w-full flex items-center justify-center"
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Send by Email
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={isScheduleModalOpen} onOpenChange={setIsScheduleModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Schedule Meeting with {currentVet?.name}</DialogTitle>
            <DialogDescription>Select a date and time to schedule your in-person appointment</DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Calendar View */}
            <div className="border rounded-md p-4">
              <div className="flex justify-between items-center mb-4">
                <Button variant="outline" size="sm" onClick={handlePrevWeek}>
                  <ChevronLeft className="h-4 w-4" />
                  Previous Week
                </Button>
                <h3 className="text-sm font-medium">
                  {format(currentWeek, "MMMM d")} - {format(addDays(currentWeek, 6), "MMMM d, yyyy")}
                </h3>
                <Button variant="outline" size="sm" onClick={handleNextWeek}>
                  Next Week
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {loadingAppointments ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : (
                <div className="grid grid-cols-7 gap-2">
                  {getWeekDays().map((day, index) => (
                    <div key={index} className="text-center">
                      <div className="text-xs font-medium mb-1">{format(day, "EEE")}</div>
                      <button
                        className={`w-full rounded-md py-2 text-sm ${
                          selectedDate && isSameDay(selectedDate, day)
                            ? "bg-blue-100 text-blue-700 font-medium"
                            : isToday(day)
                              ? "bg-gray-100"
                              : "hover:bg-gray-50"
                        }`}
                        onClick={() => setSelectedDate(day)}
                      >
                        {format(day, "d")}
                      </button>
                      <div className="mt-1">
                        {getAppointmentsForDay(day).length > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {getAppointmentsForDay(day).length} booked
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Appointment Form */}
            {selectedDate && (
              <div className="space-y-4 border-t pt-4">
                <h4 className="font-medium">Book for {format(selectedDate, "EEEE, MMMM d, yyyy")}</h4>

                {/* Time Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Time</label>
                  <div className="grid grid-cols-4 gap-2">
                    {getAvailableTimeSlots(selectedDate).map((time) => (
                      <button
                        key={time}
                        className={`py-2 px-3 text-sm rounded-md ${
                          selectedTime === time
                            ? "bg-blue-100 text-blue-700 font-medium"
                            : "bg-gray-50 hover:bg-gray-100"
                        }`}
                        onClick={() => setSelectedTime(time)}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                  {getAvailableTimeSlots(selectedDate).length === 0 && (
                    <p className="text-sm text-red-500">No available time slots for this day</p>
                  )}
                </div>

                {/* Pet Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Pet</label>
                  <Select value={selectedPet} onValueChange={setSelectedPet}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a pet" />
                    </SelectTrigger>
                    <SelectContent>
                      {sharedPets.map((pet) => (
                        <SelectItem key={pet.id} value={pet.id}>
                          {pet.name} ({pet.type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Notes (optional)</label>
                  <textarea
                    className="w-full rounded-md border border-gray-300 p-2 text-sm"
                    rows={3}
                    placeholder="Reason for visit, symptoms, etc."
                    value={appointmentNotes}
                    onChange={(e) => setAppointmentNotes(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Existing Appointments */}
            {appointments.length > 0 && (
              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">Existing Appointments</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {appointments.map((appointment) => (
                    <div key={appointment.id} className="flex justify-between items-center p-2 bg-gray-50 rounded-md">
                      <div>
                        <p className="text-sm font-medium">
                          {format(parseISO(appointment.date), "MMM d")} at {appointment.time}
                        </p>
                        <p className="text-xs text-gray-500">
                          {appointment.petName} - {appointment.ownerName}
                        </p>
                      </div>
                      <Badge
                        variant={appointment.status === "confirmed" ? "default" : "secondary"}
                        className={appointment.status === "confirmed" ? "bg-green-100 text-green-800" : ""}
                      >
                        {appointment.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsScheduleModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleScheduleAppointment}
              disabled={!selectedDate || !selectedTime || !selectedPet || schedulingAppointment}
            >
              {schedulingAppointment ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Scheduling...
                </>
              ) : (
                <>
                  <Calendar className="mr-2 h-4 w-4" />
                  Schedule Appointment
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isLocationDialogOpen} onOpenChange={setIsLocationDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Location Access</DialogTitle>
            <DialogDescription>
              PetPulse needs access to your location to find nearby vets. Do you want to allow access?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleDenyLocationPermission}>
              Cancel
            </Button>
            <Button onClick={handleLocationPermission}>Allow Access</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {selectedVetForSharing && (
        <ShareVetDialog vet={selectedVetForSharing} open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen} />
      )}
    </div>
  )
}
