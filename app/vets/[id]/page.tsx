"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { collection, query, where, getDocs, orderBy, doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/AuthContext"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import {
  ChevronRight,
  Activity,
  Weight,
  Moon,
  Utensils,
  Calendar,
  ChevronLeft,
  ArrowLeft,
  ArrowRight,
  Plus,
} from "lucide-react"
import Link from "next/link"
import { format, addDays, startOfWeek, isSameDay } from "date-fns"
import Image from "next/image"
import { useMobile } from "@/hooks/use-mobile"
import { AppointmentModal } from "@/components/appointment-modal"
import { PetHeader } from "@/components/pet-header"

export default function VetCalendarPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [vet, setVet] = useState<any>(null)
  const [sharedPets, setSharedPets] = useState<any[]>([])
  const [petHealthData, setPetHealthData] = useState<{ [key: string]: any }>({})
  const [appointments, setAppointments] = useState<any[]>([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [activeDay, setActiveDay] = useState(new Date())
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const isMobile = useMobile()

  // Function to refresh appointments after adding a new one
  const refreshAppointments = () => {
    setRefreshTrigger((prev) => prev + 1)
  }

  useEffect(() => {
    if (user) {
      fetchData()
    }
  }, [user, refreshTrigger, id])

  const fetchData = async () => {
    if (!user || !id) return

    try {
      setLoading(true)

      // First, get the vet information
      let vetData = null

      // Try to get vet by ID first
      const vetDoc = await getDoc(doc(db, "users", id as string))

      if (vetDoc.exists()) {
        vetData = { id: vetDoc.id, ...vetDoc.data() }
      } else {
        // If not found by ID, try to find by email
        const vetsQuery = query(collection(db, "users"), where("email", "==", id), where("role", "==", "vet"))
        const vetsSnapshot = await getDocs(vetsQuery)

        if (!vetsSnapshot.empty) {
          const doc = vetsSnapshot.docs[0]
          vetData = { id: doc.id, ...doc.data() }
        }
      }

      if (!vetData) {
        console.error("Vet not found")
        setLoading(false)
        return
      }

      setVet(vetData)
      console.log("Fetching data for vet:", vetData.id)

      // Query petSharing collection for pets shared with this vet
      const q = query(collection(db, "petSharing"), where("vetId", "==", vetData.id), where("status", "==", "active"))

      const querySnapshot = await getDocs(q)
      const petsData: any[] = []
      console.log(`Found ${querySnapshot.size} shared pets`)

      querySnapshot.forEach((doc) => {
        const data = doc.data()
        console.log("Pet sharing document:", data)
        petsData.push({
          id: doc.id,
          ...data,
          sharedAt: data.sharedAt?.toDate?.() || new Date(data.sharedAt),
        })
      })

      // Sort by most recently shared
      petsData.sort((a, b) => b.sharedAt - a.sharedAt)

      setSharedPets(petsData)

      // Fetch health data for each pet
      for (const pet of petsData) {
        fetchPetHealthData(pet)
      }

      // Fetch appointments
      const appointmentsQuery = query(
        collection(db, "appointments"),
        where("vetId", "==", vetData.id),
        where("status", "==", "scheduled"),
        orderBy("appointmentDate"),
      )

      const appointmentsSnapshot = await getDocs(appointmentsQuery)
      const appointmentsData = appointmentsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        // Ensure appointmentDate is a Date object
        appointmentDate: doc.data().appointmentDate?.toDate() || null,
      }))

      setAppointments(appointmentsData)
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchPetHealthData = async (pet: any) => {
    try {
      console.log(`Processing health data for pet: ${pet.petId}`)

      // If health records are included in the sharing document
      if (pet.healthRecords && pet.healthRecords.length > 0) {
        console.log(`Found ${pet.healthRecords.length} health records in sharing document`)

        // Use the most recent health record
        const mostRecentRecord = [...pet.healthRecords].sort((a: any, b: any) => {
          const dateA = a.date?.seconds ? new Date(a.date.seconds * 1000) : new Date(a.date)
          const dateB = b.date?.seconds ? new Date(b.date.seconds * 1000) : new Date(b.date)
          return dateB.getTime() - dateA.getTime()
        })[0]

        console.log("Most recent health record:", mostRecentRecord)
        setPetHealthData((prev) => ({
          ...prev,
          [pet.petId]: mostRecentRecord,
        }))
        return
      } else {
        console.log("No health records found in sharing document")
      }

      // Fallback to the old method if no health records in sharing document
      console.log("Falling back to direct health records query")
      const healthQuery = query(
        collection(db, "healthRecords"),
        where("petId", "==", pet.petId),
        orderBy("date", "desc"),
        where("userId", "==", pet.ownerId),
      )

      const healthSnapshot = await getDocs(healthQuery)
      console.log(`Found ${healthSnapshot.size} health records directly`)

      if (!healthSnapshot.empty) {
        const healthData = healthSnapshot.docs[0].data()
        console.log("Health record data:", healthData)
        setPetHealthData((prev) => ({
          ...prev,
          [pet.petId]: healthData,
        }))
      } else {
        console.log("No health records found directly")
      }
    } catch (error) {
      console.error(`Error fetching health data for pet ${pet.petId}:`, error)
    }
  }

  const getActivityLabel = (level: number) => {
    if (level <= 3) return "Low Activity"
    if (level <= 7) return "Moderate Activity"
    return "High Activity"
  }

  // Helper function to format date from Firestore timestamp
  const formatDate = (date: any) => {
    if (!date) return "Unknown date"

    try {
      if (date instanceof Date) {
        return format(date, "MMM d, yyyy")
      } else if (date.seconds) {
        return format(new Date(date.seconds * 1000), "MMM d, yyyy")
      } else if (date.toDate) {
        return format(date.toDate(), "MMM d, yyyy")
      } else if (typeof date === "string") {
        return format(new Date(date), "MMM d, yyyy")
      }
      return "Unknown date format"
    } catch (error) {
      console.error("Error formatting date:", error, date)
      return "Unknown"
    }
  }

  // Generate days for the weekly calendar view
  const generateWeekDays = () => {
    const days = []
    const startDay = startOfWeek(currentDate, { weekStartsOn: 1 }) // Start from Monday

    for (let i = 0; i < 7; i++) {
      const day = addDays(startDay, i)
      days.push(day)
    }

    return days
  }

  const weekDays = generateWeekDays()

  // Get appointments for a specific day
  const getAppointmentsForDay = (day: Date) => {
    return appointments.filter(
      (appointment) => appointment.appointmentDate && isSameDay(appointment.appointmentDate, day),
    )
  }

  // Navigate to previous week/day
  const goToPrevious = () => {
    if (isMobile) {
      setActiveDay((prev) => addDays(prev, -1))
    } else {
      setCurrentDate((prev) => addDays(prev, -7))
    }
  }

  // Navigate to next week/day
  const goToNext = () => {
    if (isMobile) {
      setActiveDay((prev) => addDays(prev, 1))
    } else {
      setCurrentDate((prev) => addDays(prev, 7))
    }
  }

  // Set active day for mobile view
  useEffect(() => {
    // Initialize active day to current date or first day of week
    const today = new Date()
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
    const weekEnd = addDays(weekStart, 6)

    // If today is in the current week view, use it as active day
    if (today >= weekStart && today <= weekEnd) {
      setActiveDay(today)
    } else {
      setActiveDay(weekStart)
    }
  }, [currentDate])

  // Get color class based on appointment type
  const getAppointmentColorClass = (type: string) => {
    switch (type) {
      case "Check-up":
        return "bg-green-100 border-l-2 border-green-500"
      case "Vaccination":
        return "bg-blue-100 border-l-2 border-blue-500"
      case "Surgery":
        return "bg-red-100 border-l-2 border-red-500"
      case "Dental":
        return "bg-purple-100 border-l-2 border-purple-500"
      case "Follow-up":
        return "bg-yellow-100 border-l-2 border-yellow-500"
      case "Emergency":
        return "bg-orange-100 border-l-2 border-orange-500"
      default:
        return "bg-gray-100 border-l-2 border-gray-500"
    }
  }

  // Format time from Date object
  const formatAppointmentTime = (date: Date) => {
    return format(date, "h:mm a")
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <PageHeader heading="Vet Calendar" text="View appointments and shared pets" />
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
        </div>
      </div>
    )
  }

  if (!vet) {
    return (
      <div className="container mx-auto px-4 py-6">
        <PageHeader heading="Vet Calendar" text="View appointments and shared pets" />
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-red-600">Vet not found</h2>
          <p className="mt-2 text-gray-600">The vet you're looking for could not be found.</p>
          <Button className="mt-4" onClick={() => router.push("/vets")}>
            Back to Vets
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <PageHeader
        heading={`${vet.displayName || vet.name || "Vet"}'s Calendar`}
        text="View appointments and shared pets"
      />
      <PetHeader backTo="/vets" />

      {/* Calendar Section */}
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-6 mt-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Appointment Calendar</h2>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={goToPrevious}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              {isMobile ? "" : "Previous"}
            </Button>
            <span className="text-sm font-medium">
              {isMobile
                ? format(activeDay, "MMM d, yyyy")
                : `${format(weekDays[0], "MMM d")} - ${format(weekDays[6], "MMM d, yyyy")}`}
            </span>
            <Button variant="outline" size="sm" onClick={goToNext}>
              {isMobile ? "" : "Next"}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>

        {/* Desktop Calendar View */}
        {!isMobile && (
          <>
            {/* Calendar header - days of week */}
            <div className="hidden sm:grid grid-cols-7 gap-1 mb-2">
              {weekDays.map((day, index) => (
                <div key={index} className="text-center">
                  <p className="text-xs font-medium text-gray-500">{format(day, "EEE")}</p>
                  <p
                    className={`text-sm font-bold ${isSameDay(day, new Date()) ? "text-blue-600 bg-blue-50 rounded-full w-6 h-6 flex items-center justify-center mx-auto" : ""}`}
                  >
                    {format(day, "d")}
                  </p>
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="hidden sm:grid grid-cols-7 gap-1 h-[250px] border rounded-lg overflow-hidden">
              {weekDays.map((day, dayIndex) => (
                <div
                  key={dayIndex}
                  className={`border-r last:border-r-0 h-full overflow-y-auto p-1 ${
                    isSameDay(day, new Date()) ? "bg-blue-50" : dayIndex % 2 === 0 ? "bg-gray-50" : "bg-white"
                  }`}
                >
                  {getAppointmentsForDay(day).map((appointment, appIndex) => (
                    <div
                      key={appIndex}
                      className={`p-1 mb-1 rounded-md shadow-sm text-xs ${getAppointmentColorClass(appointment.appointmentType)}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          {appointment.appointmentDate ? formatAppointmentTime(appointment.appointmentDate) : ""}
                        </span>
                      </div>
                      <p className="font-bold truncate">{appointment.petName}</p>
                      <p className="text-xs truncate">{appointment.appointmentType}</p>
                    </div>
                  ))}

                  {getAppointmentsForDay(day).length === 0 && (
                    <div className="h-full flex items-center justify-center text-gray-400 text-xs">No appts</div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Mobile Calendar View */}
        {isMobile && (
          <>
            {/* Mobile day selector */}
            <div className="flex justify-between items-center mb-2">
              <div className="grid grid-cols-7 w-full">
                {weekDays.map((day, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveDay(day)}
                    className={`flex flex-col items-center p-1 ${
                      isSameDay(day, activeDay) ? "bg-blue-100 rounded-md" : ""
                    }`}
                  >
                    <p className="text-xs font-medium text-gray-500">{format(day, "EEE")}</p>
                    <p className={`text-sm font-bold ${isSameDay(day, new Date()) ? "text-blue-600" : ""}`}>
                      {format(day, "d")}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Mobile appointments list */}
            <div className="border rounded-lg overflow-hidden bg-gray-50 h-[300px] overflow-y-auto">
              <div className="p-2">
                <h3 className="text-sm font-medium text-gray-700 mb-2">{format(activeDay, "EEEE, MMMM d")}</h3>

                {getAppointmentsForDay(activeDay).length > 0 ? (
                  <div className="space-y-2">
                    {getAppointmentsForDay(activeDay).map((appointment, appIndex) => (
                      <div
                        key={appIndex}
                        className={`p-2 rounded-md shadow-sm ${getAppointmentColorClass(appointment.appointmentType)}`}
                      >
                        <div className="flex justify-between items-start">
                          <span className="font-bold text-sm">
                            {appointment.appointmentDate ? formatAppointmentTime(appointment.appointmentDate) : ""}
                          </span>
                        </div>
                        <p className="font-bold text-sm mt-1">{appointment.petName}</p>
                        <p className="text-xs text-gray-600">Client: {appointment.clientName}</p>
                        {appointment.petType && (
                          <p className="text-xs text-gray-600">Pet Type: {appointment.petType}</p>
                        )}
                        <p className="text-xs font-medium mt-1">{appointment.appointmentType}</p>
                        {appointment.notes && <p className="text-xs mt-1 bg-white p-1 rounded">{appointment.notes}</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-32 text-gray-400">
                    <Calendar className="h-8 w-8 mb-2 opacity-30" />
                    <p>No appointments for this day</p>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile day navigation */}
            <div className="flex justify-between items-center mt-2">
              <button
                className="flex items-center text-sm text-gray-600"
                onClick={() => setActiveDay((prev) => addDays(prev, -1))}
              >
                <ArrowLeft className="h-3 w-3 mr-1" />
                Previous Day
              </button>
              <button
                className="flex items-center text-sm text-gray-600"
                onClick={() => setActiveDay((prev) => addDays(prev, 1))}
              >
                Next Day
                <ArrowRight className="h-3 w-3 ml-1" />
              </button>
            </div>
          </>
        )}

        {/* Only show the Add Appointment button if the user is the vet */}
        {user && vet && user.uid === vet.id && (
          <div className="mt-3 flex justify-end">
            <Button size="sm" className="flex items-center" onClick={() => setIsAppointmentModalOpen(true)}>
              <Plus className="mr-2 h-3 w-3" />
              Add Appointment
            </Button>
          </div>
        )}
      </div>

      {sharedPets.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg mt-6">
          <h3 className="text-lg font-medium text-gray-900">No pets shared with this vet yet</h3>
          <p className="mt-2 text-gray-500">When pet owners share their pets with this vet, they will appear here.</p>
        </div>
      ) : (
        <div className="w-full space-y-6 mt-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Shared Pets</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {sharedPets.map((pet) => (
              <div key={pet.id} className="border rounded-lg overflow-hidden shadow-sm">
                <div className="p-4 bg-blue-50 border-b">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-xl font-bold">{pet.petName}</h3>
                      <p className="text-gray-600">
                        {pet.petType} • {pet.petBreed}
                      </p>
                    </div>
                    {pet.petPhotoURL && (
                      <div className="h-16 w-16 rounded-full overflow-hidden">
                        <Image
                          src={pet.petPhotoURL || "/placeholder.svg"}
                          alt={pet.petName}
                          width={64}
                          height={64}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4">
                  <div className="mb-4">
                    <p className="text-sm text-gray-500">
                      Owner: <span className="font-medium text-gray-700">{pet.ownerName}</span>
                    </p>
                    <p className="text-sm text-gray-500">
                      Shared on: <span className="font-medium text-gray-700">{formatDate(pet.sharedAt)}</span>
                    </p>
                  </div>

                  {/* Health metrics similar to home page */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <div className="flex items-center text-blue-700 mb-1">
                        <Weight className="w-4 h-4 mr-1" />
                        <span className="text-sm font-medium">Weight</span>
                      </div>
                      <p className="text-lg font-bold">
                        {petHealthData[pet.petId]?.weight
                          ? `${petHealthData[pet.petId].weight.toFixed(1)} kg`
                          : "Not tracked"}
                      </p>
                    </div>

                    <div className="bg-purple-50 p-3 rounded-lg">
                      <div className="flex items-center text-purple-700 mb-1">
                        <Moon className="w-4 h-4 mr-1" />
                        <span className="text-sm font-medium">Sleep</span>
                      </div>
                      <p className="text-lg font-bold">
                        {petHealthData[pet.petId]?.sleepDuration
                          ? `${petHealthData[pet.petId].sleepDuration.toFixed(1)} hrs`
                          : "Not tracked"}
                      </p>
                    </div>

                    <div className="bg-green-50 p-3 rounded-lg">
                      <div className="flex items-center text-green-700 mb-1">
                        <Activity className="w-4 h-4 mr-1" />
                        <span className="text-sm font-medium">Activity</span>
                      </div>
                      <p className="text-lg font-bold">
                        {petHealthData[pet.petId]?.activityLevel
                          ? getActivityLabel(petHealthData[pet.petId].activityLevel)
                          : "Not tracked"}
                      </p>
                    </div>

                    <div className="bg-orange-50 p-3 rounded-lg">
                      <div className="flex items-center text-orange-700 mb-1">
                        <Utensils className="w-4 h-4 mr-1" />
                        <span className="text-sm font-medium">Food</span>
                      </div>
                      <p className="text-lg font-bold capitalize">
                        {petHealthData[pet.petId]?.foodIntake || "Not tracked"}
                      </p>
                    </div>
                  </div>

                  {/* Only show the View Full Details button if the user is the vet */}
                  {user && vet && user.uid === vet.id && (
                    <Link href={`/vetadmin/pets/${pet.petId}`} className="w-full">
                      <Button className="w-full">
                        View Full Details
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Appointment Modal - only shown if the user is the vet */}
      {user && vet && user.uid === vet.id && (
        <AppointmentModal
          isOpen={isAppointmentModalOpen}
          onClose={() => {
            setIsAppointmentModalOpen(false)
            refreshAppointments() // Refresh appointments after closing modal
          }}
          vetId={vet.id}
        />
      )}
    </div>
  )
}
