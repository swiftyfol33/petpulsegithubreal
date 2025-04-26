"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { collection, query, where, getDocs, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { ChevronRight, Activity, Weight, Moon, Utensils } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { useMobile } from "@/hooks/use-mobile"
import { format } from "date-fns"

export default function VetsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [sharedPets, setSharedPets] = useState<any[]>([])
  const [petHealthData, setPetHealthData] = useState<{ [key: string]: any }>({})
  const isMobile = useMobile()
  // Add a new state variable for patients data after the existing state variables
  const [patients, setPatients] = useState<{ [key: string]: any }>({})

  useEffect(() => {
    if (user) {
      fetchData()
    }
  }, [user])

  const fetchData = async () => {
    if (!user) return

    try {
      setLoading(true)
      console.log("Fetching data for vet:", user.uid)

      // Query petSharing collection for pets shared with this vet
      const q = query(collection(db, "petSharing"), where("vetId", "==", user.uid), where("status", "==", "active"))

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

      // Group pets by owner
      const patientData: { [key: string]: any } = {}
      petsData.forEach((pet) => {
        if (!patientData[pet.ownerId]) {
          patientData[pet.ownerId] = {
            id: pet.ownerId,
            name: pet.ownerName,
            email: pet.ownerEmail || "No email provided",
            phone: pet.ownerPhone || "No phone provided",
            pets: [],
          }
        }
        patientData[pet.ownerId].pets.push(pet)
      })
      setPatients(patientData)

      // Fetch health data for each pet
      for (const pet of petsData) {
        fetchPetHealthData(pet)
      }
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

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Patients</h1>
      {/* Patients Section */}
      <div className="w-full space-y-6 mt-6">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Patients</h2>

        {Object.keys(patients).length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-medium text-gray-900">No patients yet</h3>
            <p className="mt-2 text-gray-500">When pet owners share their pets with you, they will appear here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.values(patients).map((patient: any) => (
              <div key={patient.id} className="border rounded-lg overflow-hidden shadow-sm">
                <div className="p-4 bg-blue-50 border-b">
                  <h3 className="text-xl font-bold">{patient.name}</h3>
                  <p className="text-gray-600">{patient.email}</p>
                  {patient.phone && <p className="text-gray-600">{patient.phone}</p>}
                </div>

                <div className="p-4">
                  <h4 className="font-medium text-gray-700 mb-2">Shared Pets ({patient.pets.length})</h4>
                  <div className="space-y-3">
                    {patient.pets.map((pet: any) => (
                      <div key={pet.petId} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                        <div className="flex items-center">
                          {pet.petPhotoURL && (
                            <div className="h-10 w-10 rounded-full overflow-hidden mr-3">
                              <Image
                                src={pet.petPhotoURL || "/placeholder.svg"}
                                alt={pet.petName}
                                width={40}
                                height={40}
                                className="h-full w-full object-cover"
                              />
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{pet.petName}</p>
                            <p className="text-xs text-gray-500">
                              {pet.petType} • {pet.petBreed}
                            </p>
                          </div>
                        </div>
                        <Link href={`/vetadmin/pets/${pet.petId}`} className="text-blue-600 hover:text-blue-800">
                          <Button variant="ghost" size="sm">
                            View
                            <ChevronRight className="ml-1 h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {sharedPets.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg mt-6">
          <h3 className="text-lg font-medium text-gray-900">No pets shared with you yet</h3>
          <p className="mt-2 text-gray-500">When pet owners share their pets with you, they will appear here.</p>
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

                  <Link href={`/vetadmin/pets/${pet.petId}`} className="w-full">
                    <Button className="w-full">
                      View Full Details
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
