"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs, orderBy } from "firebase/firestore"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { RefreshCw, Calendar, Clock, User, ChevronRight } from "lucide-react"
import toast from "react-hot-toast"

interface Pet {
  id: string
  name: string
  type: string
  breed: string
  userId: string
  ownerName?: string
  ownerEmail?: string
  sharedAt?: string | { seconds: number; nanoseconds: number }
}

export default function VetAdminPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [pets, setPets] = useState<Pet[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("shared-pets")
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push("/login")
      } else {
        fetchSharedPets()
      }
    }
  }, [user, authLoading, router])

  // Helper function to format date from Firestore timestamp or string
  const formatDate = (date: any): string => {
    if (!date) return "Unknown date"

    try {
      if (typeof date === "object" && date.seconds) {
        // Firestore timestamp
        return new Date(date.seconds * 1000).toLocaleDateString()
      } else if (typeof date === "string") {
        // ISO string
        return new Date(date).toLocaleDateString()
      }
      return "Unknown format"
    } catch (error) {
      console.error("Error formatting date:", error, date)
      return "Unknown date"
    }
  }

  // Helper function to format time from Firestore timestamp or string
  const formatTime = (date: any): string => {
    if (!date) return "Unknown time"

    try {
      if (typeof date === "object" && date.seconds) {
        // Firestore timestamp
        return new Date(date.seconds * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      } else if (typeof date === "string") {
        // ISO string
        return new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      }
      return "Unknown format"
    } catch (error) {
      console.error("Error formatting time:", error, date)
      return "Unknown time"
    }
  }

  const fetchSharedPets = async () => {
    if (!user) return

    try {
      setLoading(true)

      // Query the petSharing collection for active shares with this vet
      const sharingQuery = query(
        collection(db, "petSharing"),
        where("vetId", "==", user.uid),
        where("status", "==", "active"),
        orderBy("sharedAt", "desc"),
      )

      const sharingSnapshot = await getDocs(sharingQuery)

      if (sharingSnapshot.empty) {
        setPets([])
        setLoading(false)
        return
      }

      // Extract pet information directly from the sharing records
      const petsData: Pet[] = sharingSnapshot.docs.map((doc) => {
        const data = doc.data()
        console.log("Pet sharing data:", data)
        return {
          id: data.petId,
          name: data.petName || "Unknown Pet",
          type: data.petType || "Unknown Type",
          breed: data.petBreed || "Unknown Breed",
          userId: data.ownerId,
          ownerName: data.ownerName || "Pet Owner",
          ownerEmail: data.ownerId,
          sharedAt: data.sharedAt,
        }
      })

      setPets(petsData)
    } catch (error) {
      console.error("Error fetching shared pets:", error)
      toast.error("Failed to load shared pets")
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchSharedPets()
    setRefreshing(false)
  }

  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Vet Dashboard</h1>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
          {refreshing ? <Spinner className="mr-2" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="shared-pets">Shared Pets</TabsTrigger>
          <TabsTrigger value="sharing-history">Sharing History</TabsTrigger>
        </TabsList>

        <TabsContent value="shared-pets">
          {loading ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : pets.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {pets.map((pet) => (
                <Card
                  key={pet.id}
                  className="overflow-hidden border-2 border-blue-100 shadow-lg hover:shadow-xl transition-all"
                >
                  <CardHeader className="pb-2 bg-gradient-to-r from-blue-50 to-indigo-50">
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle className="text-2xl text-blue-800">{pet.name}</CardTitle>
                        <CardDescription className="text-base">
                          {pet.type} • {pet.breed}
                        </CardDescription>
                      </div>
                      <div className="h-16 w-16 bg-white rounded-full flex items-center justify-center shadow-md">
                        {pet.type?.toLowerCase().includes("cat") ? (
                          <span className="text-3xl">🐱</span>
                        ) : pet.type?.toLowerCase().includes("dog") ? (
                          <span className="text-3xl">🐶</span>
                        ) : (
                          <span className="text-3xl">🐾</span>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h3 className="font-medium text-blue-800 mb-2">Owner Information</h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center text-gray-700">
                            <User className="mr-2 h-4 w-4 text-blue-600" />
                            <span className="font-medium">Shared by:</span> {pet.ownerName || "Pet Owner"}
                          </div>
                          <div className="flex items-center text-gray-700">
                            <Calendar className="mr-2 h-4 w-4 text-green-600" />
                            <span className="font-medium">Shared on:</span> {formatDate(pet.sharedAt)}
                          </div>
                          <div className="flex items-center text-gray-700">
                            <Clock className="mr-2 h-4 w-4 text-purple-600" />
                            <span className="font-medium">Shared at:</span> {formatTime(pet.sharedAt)}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                          <h4 className="text-sm font-medium text-green-800 mb-1">Species</h4>
                          <p className="font-bold text-lg text-green-700">{pet.type || "Unknown"}</p>
                        </div>
                        <div className="bg-purple-50 p-3 rounded-lg border border-purple-100">
                          <h4 className="text-sm font-medium text-purple-800 mb-1">Breed</h4>
                          <p className="font-bold text-lg text-purple-700">{pet.breed || "Unknown"}</p>
                        </div>
                      </div>

                      <div className="bg-amber-50 p-4 rounded-lg border border-amber-100">
                        <h3 className="font-medium text-amber-800 mb-2">Access Status</h3>
                        <div className="flex items-center">
                          <div className="h-3 w-3 bg-green-500 rounded-full mr-2"></div>
                          <p className="text-green-700 font-medium">Active Access</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6">
                      <Button
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium py-2 h-auto"
                        onClick={() => (window.location.href = `/vetadmin/patients/${pet.id}`)}
                      >
                        View Complete Health Records
                        <ChevronRight className="ml-2 h-5 w-5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-center text-muted-foreground mb-4">No pets have been shared with you yet.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="sharing-history">
          <SharingHistorySection vetId={user?.uid} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function SharingHistorySection({ vetId }: { vetId?: string }) {
  const [sharingHistory, setSharingHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (vetId) {
      fetchSharingHistory()
    }
  }, [vetId])

  // Helper function to format date from Firestore timestamp or string
  const formatDate = (date: any): string => {
    if (!date) return "Unknown date"

    try {
      if (typeof date === "object" && date.seconds) {
        // Firestore timestamp
        return new Date(date.seconds * 1000).toLocaleString()
      } else if (typeof date === "string") {
        // ISO string
        return new Date(date).toLocaleString()
      }
      return "Unknown format"
    } catch (error) {
      console.error("Error formatting date:", error, date)
      return "Unknown date"
    }
  }

  const fetchSharingHistory = async () => {
    if (!vetId) return

    try {
      setLoading(true)

      // Query all sharing records for this vet, including both active and revoked
      const sharingQuery = query(collection(db, "petSharing"), where("vetId", "==", vetId), orderBy("sharedAt", "desc"))

      const sharingSnapshot = await getDocs(sharingQuery)
      const history: any[] = []

      sharingSnapshot.forEach((doc) => {
        history.push({
          id: doc.id,
          ...doc.data(),
        })
      })

      setSharingHistory(history)
    } catch (error) {
      console.error("Error fetching sharing history:", error)
      toast.error("Failed to load sharing history")
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchSharingHistory()
    setRefreshing(false)
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Pet Sharing History</h2>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
          {refreshing ? <Spinner className="mr-2" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : sharingHistory.length > 0 ? (
        <div className="space-y-4">
          {sharingHistory.map((record) => (
            <Card key={record.id}>
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                  <div>
                    <h3 className="font-medium text-lg">{record.petName}</h3>
                    <p className="text-sm text-muted-foreground">
                      {record.petType} • {record.petBreed}
                    </p>
                  </div>
                  <div className="flex items-center">
                    <span
                      className={`px-3 py-1 rounded-full text-xs ${
                        record.status === "active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                      }`}
                    >
                      {record.status === "active" ? "Active" : "Revoked"}
                    </span>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Shared By</p>
                    <p className="text-sm text-muted-foreground">{record.ownerName || "Pet Owner"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Shared On</p>
                    <p className="text-sm text-muted-foreground">{formatDate(record.sharedAt)}</p>
                  </div>
                </div>

                {record.status === "active" && (
                  <Button
                    className="w-full mt-4"
                    onClick={() => (window.location.href = `/vetadmin/patients/${record.petId}`)}
                  >
                    View Pet Details
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-center text-muted-foreground mb-4">No sharing history available.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
