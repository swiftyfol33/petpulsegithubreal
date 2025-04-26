"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { doc, getDoc, collection, query, where, getDocs, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { PageHeader } from "@/components/page-header"
import { Loader2, ArrowLeft, User, Weight, Cake, Activity, Moon, Utensils, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "react-hot-toast"
import { Badge } from "@/components/ui/badge"
import { isBefore } from "date-fns"

export default function PetDetails({ params }: { params: { id: string } }) {
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [pet, setPet] = useState<any>(null)
  const [owner, setOwner] = useState<any>(null)
  const [healthRecords, setHealthRecords] = useState<any[]>([])
  const [aiAnalyses, setAiAnalyses] = useState<any[]>([])
  const [medications, setMedications] = useState<any[]>([])
  const [vaccinations, setVaccinations] = useState<any[]>([])
  const [sharingDoc, setSharingDoc] = useState<any>(null)
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date())

  // Function to fetch all data
  const fetchAllData = async (showLoading = true) => {
    if (!user) {
      router.push("/login")
      return
    }

    try {
      if (showLoading) {
        setLoading(true)
      } else {
        setRefreshing(true)
      }

      console.log("Fetching pet details for pet ID:", params.id)

      // Check if user is a vet
      const userDoc = await getDoc(doc(db, "users", user.uid))
      if (!userDoc.exists() || userDoc.data().role !== "vet") {
        console.error("User is not a vet, redirecting to home")
        router.push("/")
        return
      }

      // Get pet details
      const petDoc = await getDoc(doc(db, "pets", params.id))
      if (!petDoc.exists()) {
        console.error("Pet not found, redirecting to vetadmin")
        router.push("/vetadmin")
        return
      }

      const petData = petDoc.data()
      const petId = params.id
      console.log("Pet data retrieved:", petData)
      setPet({ id: params.id, ...petData })

      // Get owner details if available
      if (petData.userId) {
        console.log("Fetching owner details for user ID:", petData.userId)
        const ownerDoc = await getDoc(doc(db, "users", petData.userId))
        if (ownerDoc.exists()) {
          console.log("Owner data retrieved")
          setOwner({ id: petData.userId, ...ownerDoc.data() })
        } else {
          console.log("Owner not found")
        }
      }

      // Fetch the pet sharing document to check access permissions
      console.log("Fetching pet sharing document")
      const sharingQuery = query(
        collection(db, "petSharing"),
        where("petId", "==", petId),
        where("vetId", "==", user.uid),
        where("status", "==", "active"),
      )

      const sharingSnapshot = await getDocs(sharingQuery)
      console.log(`Found ${sharingSnapshot.size} sharing documents`)

      if (sharingSnapshot.empty) {
        console.error("No active sharing found for this pet and vet")
        toast.error("You don't have permission to view this pet's details")
        router.push("/vetadmin")
        return
      }

      // Store the sharing document for reference
      const sharingData = sharingSnapshot.docs[0].data()
      setSharingDoc(sharingData)

      // ALWAYS fetch the latest health records directly from the collection
      console.log("Fetching latest health records directly")
      const healthRecordsQuery = query(
        collection(db, "healthRecords"),
        where("petId", "==", petId),
        where("userId", "==", petData.userId),
        orderBy("date", "desc"),
      )

      const healthRecordsSnapshot = await getDocs(healthRecordsQuery)
      console.log(`Found ${healthRecordsSnapshot.size} health records directly`)

      const records: any[] = []
      healthRecordsSnapshot.forEach((doc) => {
        records.push({ id: doc.id, ...doc.data() })
      })
      setHealthRecords(records)

      // ALWAYS fetch the latest AI analyses directly from the collection
      console.log("Fetching latest AI analyses directly")
      const aiAnalysesQuery = query(
        collection(db, "aiAnalyses"),
        where("petId", "==", petId),
        where("userId", "==", petData.userId),
        orderBy("date", "desc"),
      )

      const aiAnalysesSnapshot = await getDocs(aiAnalysesQuery)
      console.log(`Found ${aiAnalysesSnapshot.size} AI analyses directly`)

      const analyses: any[] = []
      aiAnalysesSnapshot.forEach((doc) => {
        analyses.push({ id: doc.id, ...doc.data() })
      })
      setAiAnalyses(analyses)

      // ALWAYS fetch the latest medications directly from the collection
      console.log("Fetching latest medications directly")

      // IMPORTANT: Debug the medication query
      console.log("Medication query parameters:", {
        petId,
        userId: petData.userId,
      })

      // Try fetching ALL medications first to debug
      const allMedsQuery = query(collection(db, "medications"))
      const allMedsSnapshot = await getDocs(allMedsQuery)
      console.log(`Found ${allMedsSnapshot.size} total medications in the database`)

      // Log all medications to see their structure
      allMedsSnapshot.forEach((doc) => {
        const medData = doc.data()
        console.log(`Medication ${doc.id}:`, medData)
        console.log(`- petId: ${medData.petId}`)
        console.log(`- userId: ${medData.userId}`)
      })

      // Now try the filtered query
      const medicationsQuery = query(collection(db, "medications"))

      const medicationsSnapshot = await getDocs(medicationsQuery)
      console.log(`Found ${medicationsSnapshot.size} medications in total`)

      const meds: any[] = []
      medicationsSnapshot.forEach((doc) => {
        const medData = doc.data()
        // Filter manually to ensure we're getting the right data
        if (medData.petId === petId) {
          console.log(`Found matching medication for pet ${petId}:`, medData)
          meds.push({ id: doc.id, ...medData })
        }
      })

      console.log(`After filtering, found ${meds.length} medications for this pet`)
      setMedications(meds)

      // ALWAYS fetch the latest vaccinations directly from the collection
      console.log("Fetching latest vaccinations directly")

      // Similar approach for vaccinations
      const allVacsQuery = query(collection(db, "vaccinations"))
      const allVacsSnapshot = await getDocs(allVacsQuery)
      console.log(`Found ${allVacsSnapshot.size} total vaccinations in the database`)

      const vaccinationsQuery = query(collection(db, "vaccinations"))

      const vaccinationsSnapshot = await getDocs(vaccinationsQuery)
      console.log(`Found ${vaccinationsSnapshot.size} vaccinations in total`)

      const vacs: any[] = []
      vaccinationsSnapshot.forEach((doc) => {
        const vacData = doc.data()
        // Filter manually to ensure we're getting the right data
        if (vacData.petId === petId) {
          console.log(`Found matching vaccination for pet ${petId}:`, vacData)
          vacs.push({ id: doc.id, ...vacData })
        }
      })

      console.log(`After filtering, found ${vacs.length} vaccinations for this pet`)
      setVaccinations(vacs)

      // Update last refreshed timestamp
      setLastRefreshed(new Date())
    } catch (error) {
      console.error("Error fetching pet details:", error)
      toast.error("Failed to load pet details")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Initial data fetch
  useEffect(() => {
    fetchAllData()
  }, [user, params.id])

  // Manual refresh function
  const handleRefresh = async () => {
    await fetchAllData(false)
    toast.success("Data refreshed successfully")
  }

  // Helper function to format date from Firestore timestamp
  const formatDate = (date: any) => {
    if (!date) return "Unknown date"

    try {
      if (date.seconds) {
        return (
          new Date(date.seconds * 1000).toLocaleDateString() +
          " " +
          new Date(date.seconds * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        )
      } else if (date.toDate) {
        return (
          date.toDate().toLocaleDateString() +
          " " +
          date.toDate().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        )
      } else if (typeof date === "string") {
        return (
          new Date(date).toLocaleDateString() +
          " " +
          new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        )
      }
      return "Unknown date format"
    } catch (error) {
      console.error("Error formatting date:", error, date)
      return "Invalid date"
    }
  }

  const getActivityLabel = (level: number) => {
    if (level <= 3) return "Low Activity"
    if (level <= 7) return "Moderate Activity"
    return "High Activity"
  }

  const isOverdue = (dueDate: any) => {
    try {
      let date
      if (dueDate.seconds) {
        date = new Date(dueDate.seconds * 1000)
      } else if (dueDate.toDate) {
        date = dueDate.toDate()
      } else if (typeof dueDate === "string") {
        date = new Date(dueDate)
      } else {
        return false
      }

      return isBefore(date, new Date())
    } catch (error) {
      console.error("Error checking if date is overdue:", error)
      return false
    }
  }

  const isExpired = (expirationDate: any): boolean => {
    if (!expirationDate) return false

    try {
      let date
      if (expirationDate.seconds) {
        date = new Date(expirationDate.seconds * 1000)
      } else if (expirationDate.toDate) {
        date = expirationDate.toDate()
      } else if (typeof expirationDate === "string") {
        date = new Date(expirationDate)
      } else {
        return false
      }

      return isBefore(date, new Date())
    } catch (error) {
      console.error("Error checking if date is expired:", error)
      return false
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <PageHeader title="Pet Details" />
        <main className="flex-grow flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </main>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader title={pet?.name || "Pet Details"} />
      <main className="flex-grow p-6 pb-24 lg:pb-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/vetadmin">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">
                Last updated: {lastRefreshed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-1"
              >
                {refreshing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                Refresh
              </Button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
              <div>
                <h1 className="text-2xl font-bold">{pet?.name}</h1>
                <p className="text-gray-600">
                  {pet?.type || pet?.species} {pet?.breed ? `• ${pet.breed}` : ""}
                </p>

                <div className="mt-4 space-y-2">
                  {pet?.birthDate && (
                    <div className="flex items-center gap-2 text-sm">
                      <Cake className="h-4 w-4 text-gray-500" />
                      <span>Born: {formatDate(pet.birthDate).split(" ")[0]}</span>
                    </div>
                  )}
                  {healthRecords.length > 0 && healthRecords[0].weight && (
                    <div className="flex items-center gap-2 text-sm">
                      <Weight className="h-4 w-4 text-gray-500" />
                      <span>Latest Weight: {healthRecords[0].weight} kg</span>
                    </div>
                  )}
                </div>
              </div>

              {owner && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <h3 className="font-medium">Owner Information</h3>
                  </div>
                  <p className="text-sm">{owner.displayName || `${owner.firstName || ""} ${owner.lastName || ""}`}</p>
                  <p className="text-sm text-gray-600">{owner.email}</p>
                  {owner.phone && <p className="text-sm text-gray-600">{owner.phone}</p>}
                </div>
              )}
            </div>
          </div>

          <Tabs defaultValue="health">
            <TabsList className="mb-4">
              <TabsTrigger value="health">Health Records</TabsTrigger>
              <TabsTrigger value="analyses">AI Analyses</TabsTrigger>
              <TabsTrigger value="medications">Medications</TabsTrigger>
              <TabsTrigger value="vaccines">Vaccines</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>

            <TabsContent value="health" className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Health Records</h2>
              {healthRecords && healthRecords.length > 0 ? (
                <div className="space-y-6">
                  {healthRecords.map((record, index) => (
                    <div key={index} className="border rounded-lg p-4 bg-gray-50">
                      <h3 className="font-medium text-lg mb-3">Record from {formatDate(record.date)}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {record.weight !== undefined && (
                          <div className="bg-blue-50 p-3 rounded-lg">
                            <div className="flex items-center text-blue-700 mb-1">
                              <Weight className="w-4 h-4 mr-1" />
                              <span className="text-sm font-medium">Weight</span>
                            </div>
                            <p className="text-lg font-bold">{record.weight} kg</p>
                          </div>
                        )}

                        {record.sleepDuration !== undefined && (
                          <div className="bg-purple-50 p-3 rounded-lg">
                            <div className="flex items-center text-purple-700 mb-1">
                              <Moon className="w-4 h-4 mr-1" />
                              <span className="text-sm font-medium">Sleep</span>
                            </div>
                            <p className="text-lg font-bold">{record.sleepDuration} hrs</p>
                          </div>
                        )}

                        {record.activityLevel !== undefined && (
                          <div className="bg-green-50 p-3 rounded-lg">
                            <div className="flex items-center text-green-700 mb-1">
                              <Activity className="w-4 h-4 mr-1" />
                              <span className="text-sm font-medium">Activity</span>
                            </div>
                            <p className="text-lg font-bold">
                              {getActivityLabel(record.activityLevel)} ({record.activityLevel}/10)
                            </p>
                          </div>
                        )}

                        {record.foodIntake && (
                          <div className="bg-orange-50 p-3 rounded-lg">
                            <div className="flex items-center text-orange-700 mb-1">
                              <Utensils className="w-4 h-4 mr-1" />
                              <span className="text-sm font-medium">Food</span>
                            </div>
                            <p className="text-lg font-bold capitalize">{record.foodIntake}</p>
                          </div>
                        )}
                      </div>

                      {record.behavior && (
                        <div className="mt-4">
                          <h4 className="font-medium mb-1">Behavior</h4>
                          <p className="bg-white p-3 rounded-lg">{record.behavior}</p>
                        </div>
                      )}

                      {record.notes && (
                        <div className="mt-4">
                          <h4 className="font-medium mb-1">Notes</h4>
                          <p className="bg-white p-3 rounded-lg">{record.notes}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600">No health records available yet.</p>
              )}
            </TabsContent>

            <TabsContent value="analyses" className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">AI Analyses</h2>
              {aiAnalyses && aiAnalyses.length > 0 ? (
                <div className="space-y-6">
                  {aiAnalyses.map((analysis, index) => {
                    // Parse analysis data if it's a string
                    let analysisData = analysis.analysis
                    if (typeof analysisData === "string") {
                      try {
                        analysisData = JSON.parse(analysisData)
                      } catch (e) {
                        // Keep as string if parsing fails
                      }
                    }

                    return (
                      <div key={index} className="border rounded-lg p-4 bg-gray-50">
                        <h3 className="font-medium text-lg mb-3">
                          Analysis from {formatDate(analysis.date)}
                          {analysis.type && (
                            <span className="ml-2 text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                              {analysis.type}
                            </span>
                          )}
                        </h3>

                        {typeof analysisData === "object" && analysisData !== null ? (
                          <div className="space-y-4">
                            {Object.entries(analysisData).map(([key, value], i) => (
                              <div key={i} className="bg-white p-3 rounded-lg">
                                <h4 className="font-semibold text-blue-700 mb-2 capitalize">{key}</h4>
                                {Array.isArray(value) ? (
                                  <ul className="list-disc pl-5 space-y-1">
                                    {(value as string[]).map((item, j) => (
                                      <li key={j} className="text-gray-700">
                                        {item}
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="text-gray-700">{value as string}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="bg-white p-3 rounded-lg">
                            <p className="text-gray-700 whitespace-pre-line">{analysisData as string}</p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-gray-600">No AI analyses available yet.</p>
              )}
            </TabsContent>

            <TabsContent value="medications" className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Medications</h2>
              {medications && medications.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-medium text-gray-700 mb-2">Upcoming Medications</h3>
                      <div className="space-y-3">
                        {medications.filter((med) => !med.completed).length > 0 ? (
                          medications
                            .filter((med) => !med.completed)
                            .map((medication, index) => (
                              <div
                                key={index}
                                className={`border rounded-lg p-3 ${
                                  isOverdue(medication.dueDate) ? "border-l-4 border-red-500" : ""
                                }`}
                              >
                                <div className="flex justify-between items-start">
                                  <div>
                                    <h4 className="font-semibold">{medication.name}</h4>
                                    <p className="text-sm text-gray-600">
                                      {isOverdue(medication.dueDate) ? "Overdue since: " : "Due: "}
                                      {formatDate(medication.dueDate)}
                                    </p>
                                    {medication.frequency && (
                                      <p className="text-sm text-gray-600">Frequency: {medication.frequency}</p>
                                    )}
                                    {medication.repeat && medication.repeatInterval && (
                                      <p className="text-sm text-gray-600">
                                        Repeats every {medication.repeatInterval} days
                                      </p>
                                    )}
                                  </div>
                                  <div>
                                    {isOverdue(medication.dueDate) ? (
                                      <Badge variant="destructive" className="ml-2">
                                        Overdue
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="ml-2">
                                        Upcoming
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                {medication.expirationDate && (
                                  <div className="mt-2">
                                    <p
                                      className={`text-sm ${
                                        isExpired(medication.expirationDate)
                                          ? "text-red-600 font-medium"
                                          : "text-gray-600"
                                      }`}
                                    >
                                      Expires: {formatDate(medication.expirationDate).split(" ")[0]}
                                      {isExpired(medication.expirationDate) && " (EXPIRED)"}
                                    </p>
                                  </div>
                                )}
                              </div>
                            ))
                        ) : (
                          <p className="text-gray-500 italic">No upcoming medications</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <h3 className="font-medium text-gray-700 mb-2">Completed Medications</h3>
                      <div className="space-y-3">
                        {medications.filter((med) => med.completed).length > 0 ? (
                          medications
                            .filter((med) => med.completed)
                            .map((medication, index) => (
                              <div key={index} className="border rounded-lg p-3">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <h4 className="font-semibold">{medication.name}</h4>
                                    <p className="text-sm text-gray-600">
                                      Completed on: {formatDate(medication.dueDate)}
                                    </p>
                                    {medication.frequency && (
                                      <p className="text-sm text-gray-600">Frequency: {medication.frequency}</p>
                                    )}
                                  </div>
                                  <Badge variant="success" className="bg-green-100 text-green-800">
                                    Completed
                                  </Badge>
                                </div>
                              </div>
                            ))
                        ) : (
                          <p className="text-gray-500 italic">No completed medications</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-600">No medications recorded yet.</p>
              )}
            </TabsContent>

            <TabsContent value="vaccines" className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Vaccines</h2>
              {vaccinations && vaccinations.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-medium text-gray-700 mb-2">Upcoming Vaccinations</h3>
                      <div className="space-y-3">
                        {vaccinations.filter((vac) => !vac.completed).length > 0 ? (
                          vaccinations
                            .filter((vac) => !vac.completed)
                            .map((vaccination, index) => (
                              <div
                                key={index}
                                className={`border rounded-lg p-3 ${
                                  isOverdue(vaccination.dueDate) ? "border-l-4 border-red-500" : ""
                                }`}
                              >
                                <div className="flex justify-between items-start">
                                  <div>
                                    <h4 className="font-semibold">{vaccination.name}</h4>
                                    <p className="text-sm text-gray-600">
                                      {isOverdue(vaccination.dueDate) ? "Overdue since: " : "Due: "}
                                      {formatDate(vaccination.dueDate)}
                                    </p>
                                    {vaccination.repeat && vaccination.repeatInterval && (
                                      <p className="text-sm text-gray-600">
                                        Repeats every {vaccination.repeatInterval} days
                                      </p>
                                    )}
                                  </div>
                                  <div>
                                    {isOverdue(vaccination.dueDate) ? (
                                      <Badge variant="destructive" className="ml-2">
                                        Overdue
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="ml-2">
                                        Upcoming
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))
                        ) : (
                          <p className="text-gray-500 italic">No upcoming vaccinations</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <h3 className="font-medium text-gray-700 mb-2">Completed Vaccinations</h3>
                      <div className="space-y-3">
                        {vaccinations.filter((vac) => vac.completed).length > 0 ? (
                          vaccinations
                            .filter((vac) => vac.completed)
                            .map((vaccination, index) => (
                              <div key={index} className="border rounded-lg p-3">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <h4 className="font-semibold">{vaccination.name}</h4>
                                    <p className="text-sm text-gray-600">
                                      Completed on: {formatDate(vaccination.dueDate)}
                                    </p>
                                  </div>
                                  <Badge variant="success" className="bg-green-100 text-green-800">
                                    Completed
                                  </Badge>
                                </div>
                              </div>
                            ))
                        ) : (
                          <p className="text-gray-500 italic">No completed vaccinations</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-600">No vaccines recorded yet.</p>
              )}
            </TabsContent>

            <TabsContent value="notes" className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Notes</h2>
              <p className="text-gray-600">No notes available yet.</p>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}
