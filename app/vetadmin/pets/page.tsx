"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { collection, query, where, getDocs, getDoc, doc, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { PageHeader } from "@/components/page-header"
import {
  Loader2,
  Search,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  Plus,
  Mail,
  Phone,
  Cake,
  Weight,
  Clock,
  Activity,
  Moon,
  Utensils,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { format, addDays, startOfWeek, isSameDay } from "date-fns"
import { useMobile } from "@/hooks/use-mobile"
import { AppointmentModal } from "@/components/appointment-modal"
import { Badge } from "@/components/ui/badge"

export default function VetAdminPets() {
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [pets, setPets] = useState<any[]>([])
  const [appointments, setAppointments] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
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
    const fetchData = async () => {
      if (!user) {
        router.push("/login")
        return
      }

      try {
        // Check if user is a vet
        const userDoc = await getDoc(doc(db, "users", user.uid))
        if (!userDoc.exists() || userDoc.data().role !== "vet") {
          router.push("/")
          return
        }

        // Fetch pets
        const sharingQuery = query(
          collection(db, "petSharing"),
          where("vetId", "==", user.uid),
          where("status", "==", "active"),
        )

        const sharingSnapshot = await getDocs(sharingQuery)
        const petIds = sharingSnapshot.docs.map((doc) => doc.data().petId)

        const petsData: any[] = []

        for (const petId of petIds) {
          const petDoc = await getDoc(doc(db, "pets", petId))
          if (petDoc.exists()) {
            const petData = petDoc.data()
            let ownerData = null

            if (petData.userId) {
              const ownerDoc = await getDoc(doc(db, "users", petData.userId))
              if (ownerDoc.exists()) {
                ownerData = ownerDoc.data()
              }
            }

            // Fetch health records for this pet
            const healthRecordsQuery = query(
              collection(db, "healthRecords"),
              where("petId", "==", petId),
              orderBy("date", "desc"),
            )

            const healthRecordsSnapshot = await getDocs(healthRecordsQuery)
            const healthRecords = healthRecordsSnapshot.docs.map((doc) => doc.data())

            // Get latest weight record
            const weightRecords = healthRecords.filter((record) => record.recordType === "weight")
            const latestWeight = weightRecords.length > 0 ? weightRecords[0] : null

            // Get latest sleep data
            const sleepRecords = healthRecords.filter((record) => record.recordType === "sleep")
            const sleepData = sleepRecords.length > 0 ? sleepRecords[0] : null

            // Get latest activity level
            const activityRecords = healthRecords.filter((record) => record.recordType === "activity")
            const activityData = activityRecords.length > 0 ? activityRecords[0] : null

            // Get latest food intake
            const foodRecords = healthRecords.filter((record) => record.recordType === "food")
            const foodData = foodRecords.length > 0 ? foodRecords[0] : null

            // Fetch last visit date
            const visitsQuery = query(
              collection(db, "appointments"),
              where("petId", "==", petId),
              where("status", "==", "completed"),
              orderBy("appointmentDate", "desc"),
            )

            const visitsSnapshot = await getDocs(visitsQuery)
            const lastVisit =
              visitsSnapshot.docs.length > 0 ? visitsSnapshot.docs[0].data().appointmentDate?.toDate() : null

            petsData.push({
              id: petId,
              ...petData,
              owner: ownerData,
              latestWeight,
              lastVisit,
              sleepData,
              activityLevel: activityData?.activityLevel,
              foodIntake: foodData?.foodIntake,
            })
          }
        }

        setPets(petsData)

        // Fetch appointments
        const appointmentsQuery = query(
          collection(db, "appointments"),
          where("vetId", "==", user.uid),
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

    fetchData()
  }, [user, router, refreshTrigger]) // Add refreshTrigger to dependencies

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

  const filteredPets = pets.filter(
    (pet) =>
      pet.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (pet.species && pet.species.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (pet.breed && pet.breed.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (pet.owner && `${pet.owner.firstName} ${pet.owner.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())),
  )

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

  // Format date with fallback
  const formatDate = (date: any) => {
    if (!date) return "N/A"

    try {
      if (date instanceof Date) {
        return format(date, "MMM d, yyyy")
      } else if (date.toDate) {
        return format(date.toDate(), "MMM d, yyyy")
      } else if (typeof date === "string") {
        return format(new Date(date), "MMM d, yyyy")
      }
      return "N/A"
    } catch (error) {
      console.error("Error formatting date:", error)
      return "N/A"
    }
  }

  // Helper function to get activity label
  const getActivityLabel = (level: number) => {
    if (level <= 3) return "Low Activity"
    if (level <= 7) return "Moderate Activity"
    return "High Activity"
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <PageHeader title="Pets" />
        <main className="flex-grow flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </main>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader title="Pets" />
      <main className="flex-grow p-4 pb-24 lg:pb-6">
        <div className="max-w-5xl mx-auto">
          {/* Calendar Section */}
          <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
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
                            {appointment.notes && (
                              <p className="text-xs mt-1 bg-white p-1 rounded">{appointment.notes}</p>
                            )}
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

            <div className="mt-3 flex justify-end">
              <Button size="sm" className="flex items-center" onClick={() => setIsAppointmentModalOpen(true)}>
                <Plus className="mr-2 h-3 w-3" />
                Add Appointment
              </Button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h1 className="text-2xl font-bold">Your Patients</h1>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                type="search"
                placeholder="Search pets..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {filteredPets.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {filteredPets.map((pet) => (
                <Link href={`/vetadmin/pets/${pet.id}`} key={pet.id}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row gap-4">
                        {/* Pet Image - Smaller */}
                        <div className="w-full sm:w-24 h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                          {pet.photoURL ? (
                            <img
                              src={pet.photoURL || "/placeholder.svg"}
                              alt={pet.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-200">
                              <span className="text-2xl font-bold text-gray-400">{pet.name?.charAt(0) || "P"}</span>
                            </div>
                          )}
                        </div>

                        {/* Pet Information */}
                        <div className="flex-grow">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2">
                            <div>
                              <h3 className="font-semibold text-lg">{pet.name}</h3>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {pet.species}
                                </Badge>
                                {pet.breed && (
                                  <Badge variant="outline" className="text-xs">
                                    {pet.breed}
                                  </Badge>
                                )}
                              </div>
                            </div>

                            <div className="mt-2 sm:mt-0">
                              <Badge variant="secondary" className="text-xs">
                                {pet.sex || "Unknown"} • {pet.neutered ? "Neutered" : "Not Neutered"}
                              </Badge>
                            </div>
                          </div>

                          {/* Health Metrics Grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 mb-3">
                            <div className="bg-blue-50 p-2 rounded-lg">
                              <div className="flex items-center text-blue-700 mb-1">
                                <Weight className="w-3 h-3 mr-1" />
                                <span className="text-xs font-medium">Weight</span>
                              </div>
                              <p className="text-sm font-bold">
                                {pet.latestWeight
                                  ? `${pet.latestWeight.value} ${pet.latestWeight.unit}`
                                  : "Not tracked"}
                              </p>
                            </div>

                            <div className="bg-purple-50 p-2 rounded-lg">
                              <div className="flex items-center text-purple-700 mb-1">
                                <Moon className="w-3 h-3 mr-1" />
                                <span className="text-xs font-medium">Sleep</span>
                              </div>
                              <p className="text-sm font-bold">
                                {pet.sleepData ? `${pet.sleepData.duration} hrs` : "Not tracked"}
                              </p>
                            </div>

                            <div className="bg-green-50 p-2 rounded-lg">
                              <div className="flex items-center text-green-700 mb-1">
                                <Activity className="w-3 h-3 mr-1" />
                                <span className="text-xs font-medium">Activity</span>
                              </div>
                              <p className="text-sm font-bold">
                                {pet.activityLevel ? getActivityLabel(pet.activityLevel) : "Not tracked"}
                              </p>
                            </div>

                            <div className="bg-orange-50 p-2 rounded-lg">
                              <div className="flex items-center text-orange-700 mb-1">
                                <Utensils className="w-3 h-3 mr-1" />
                                <span className="text-xs font-medium">Food</span>
                              </div>
                              <p className="text-sm font-bold capitalize">{pet.foodIntake || "Not tracked"}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
                            {/* Pet Details */}
                            <div>
                              <h4 className="text-sm font-medium text-gray-700 mb-1">Pet Details</h4>
                              <div className="space-y-1">
                                <div className="flex items-center text-xs text-gray-600">
                                  <Cake className="h-3 w-3 mr-2" />
                                  <span>DOB: {formatDate(pet.dateOfBirth)}</span>
                                </div>
                                <div className="flex items-center text-xs text-gray-600">
                                  <Weight className="h-3 w-3 mr-2" />
                                  <span>
                                    Weight:{" "}
                                    {pet.latestWeight
                                      ? `${pet.latestWeight.value} ${pet.latestWeight.unit}`
                                      : "No data"}
                                  </span>
                                </div>
                                <div className="flex items-center text-xs text-gray-600">
                                  <Clock className="h-3 w-3 mr-2" />
                                  <span>Last Visit: {pet.lastVisit ? formatDate(pet.lastVisit) : "No visits"}</span>
                                </div>
                              </div>
                            </div>

                            {/* Owner Information */}
                            <div>
                              <h4 className="text-sm font-medium text-gray-700 mb-1">Owner Information</h4>
                              {pet.owner ? (
                                <div className="space-y-1">
                                  <p className="text-xs font-medium">
                                    {pet.owner.firstName} {pet.owner.lastName}
                                  </p>
                                  <div className="flex items-center text-xs text-gray-600">
                                    <Mail className="h-3 w-3 mr-2" />
                                    <span>{pet.owner.email || "No email"}</span>
                                  </div>
                                  <div className="flex items-center text-xs text-gray-600">
                                    <Phone className="h-3 w-3 mr-2" />
                                    <span>{pet.owner.phone || "No phone"}</span>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-xs text-gray-500">No owner information</p>
                              )}
                            </div>
                          </div>

                          {/* View Details Button */}
                          <div className="mt-4">
                            <Button className="w-full">
                              View Full Details
                              <ChevronRight className="ml-2 h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-4">No pets found</p>
              <Button asChild variant="outline">
                <Link href="/vetadmin">Back to Dashboard</Link>
              </Button>
            </div>
          )}
        </div>
      </main>

      {/* Appointment Modal */}
      {user && (
        <AppointmentModal
          isOpen={isAppointmentModalOpen}
          onClose={() => {
            setIsAppointmentModalOpen(false)
            refreshAppointments() // Refresh appointments after closing modal
          }}
          vetId={user.uid}
        />
      )}
    </div>
  )
}
