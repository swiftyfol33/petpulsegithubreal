"use client"

import type React from "react"

import { useEffect, useState, Suspense } from "react"
import { useAuth } from "../../contexts/AuthContext"
import { useSelectedPet } from "../../contexts/PetContext"
import { HealthTrackingLayout } from "@/components/health-tracking-layout"
import { db } from "../../lib/firebase"
import { collection, query, where, orderBy, limit, getDocs, addDoc } from "firebase/firestore"
import { format } from "date-fns"
import { Activity } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { PetHeader } from "../../components/pet-header"
import { toast } from "react-hot-toast"
import { Skeleton } from "@/components/ui/skeleton"

interface ActivityRecord {
  id: string
  date: string
  activityLevel: number
}

function ActivityLevelContent() {
  const { user } = useAuth()
  const { selectedPet } = useSelectedPet()
  const [activityRecords, setActivityRecords] = useState<ActivityRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newActivityLevel, setNewActivityLevel] = useState<number[]>([5])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    if (user && selectedPet) {
      setIsReady(true)
      fetchActivityRecords()
    } else {
      setIsReady(false)
      setActivityRecords([])
      setLoading(false)
      setError(null)
    }
  }, [user, selectedPet])

  const fetchActivityRecords = async () => {
    if (!user || !selectedPet) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const q = query(
        collection(db, "healthRecords"),
        where("userId", "==", user.uid),
        where("petId", "==", selectedPet.id),
        where("type", "==", "activity"),
        orderBy("date", "desc"),
        limit(30),
      )

      const querySnapshot = await getDocs(q)
      const records: ActivityRecord[] = []
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        if (data.activityLevel) {
          records.push({
            id: doc.id,
            date: data.date,
            activityLevel: data.activityLevel,
          })
        }
      })
      setActivityRecords(records)
    } catch (err) {
      console.error("Error fetching activity records:", err)
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch activity records"
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !selectedPet) {
      toast.error("User or pet not selected. Please try again.")
      return
    }

    setIsSubmitting(true)
    try {
      const newRecord = {
        userId: user.uid,
        petId: selectedPet.id,
        date: new Date().toISOString(),
        activityLevel: newActivityLevel[0],
        type: "activity", // Add this line to specify the record type
      }

      const docRef = await addDoc(collection(db, "healthRecords"), newRecord)
      console.log("Document written with ID: ", docRef.id)

      setNewActivityLevel([5])
      await fetchActivityRecords()
      toast.success("Activity logged successfully!")
    } catch (error) {
      console.error("Error adding activity record:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to add activity record"
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const getActivityLabel = (level: number) => {
    if (level <= 3) return "Low Activity"
    if (level <= 7) return "Moderate Activity"
    return "High Activity"
  }

  const currentActivity = activityRecords[0] ? getActivityLabel(activityRecords[0].activityLevel) : "No data"

  return (
    <div className="space-y-4">
      {/* Log New Activity Level */}
      <Card className="p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Activity Level (1-10)</label>
            <Slider min={1} max={10} step={1} value={newActivityLevel} onValueChange={setNewActivityLevel} />
            <div className="text-sm text-gray-500 text-center">
              Current: {newActivityLevel[0]} - {getActivityLabel(newActivityLevel[0])}
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting || !isReady}>
            {isSubmitting ? "Logging..." : "Log Activity"}
          </Button>
        </form>
      </Card>

      {/* Activity History */}
      <div className="space-y-2">
        <h3 className="font-medium text-gray-500 px-1">Logged</h3>
        {loading ? (
          <p className="text-center py-4">Loading activity records...</p>
        ) : error ? (
          <p className="text-red-500 text-center py-4">{error}</p>
        ) : activityRecords.length > 0 ? (
          activityRecords.map((record) => (
            <Card key={record.id} className="p-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                    <Activity className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <span className="font-medium">{getActivityLabel(record.activityLevel)}</span>
                    <div className="text-sm text-gray-500">Level {record.activityLevel}/10</div>
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  {format(new Date(record.date), "h:mm a")}
                  <span className="ml-2 text-xs">
                    {format(new Date(record.date), "MMM d") === format(new Date(), "MMM d")
                      ? "Today"
                      : format(new Date(record.date), "MMM d")}
                  </span>
                </div>
              </div>
            </Card>
          ))
        ) : (
          <p className="text-center py-4 text-gray-500">No activity records found</p>
        )}
      </div>
    </div>
  )
}

export default function ActivityLevelPage() {
  const { user } = useAuth()
  const { selectedPet } = useSelectedPet()

  const currentActivity = "Loading..."

  return (
    <div className="flex flex-col min-h-screen bg-[#FFFFFF]">
      <PetHeader backTo="/" />
      <HealthTrackingLayout
        title="Activity"
        backTo="/"
        currentValue={currentActivity}
        color="green"
        icon={<Activity className="w-5 h-5" />}
      >
        <Suspense
          fallback={
            <div className="space-y-4">
              <Card className="p-4">
                <Skeleton className="h-40 w-full" />
              </Card>
              <div className="space-y-2">
                <Skeleton className="h-8 w-32" />
                <Card className="p-4">
                  <Skeleton className="h-40 w-full" />
                </Card>
              </div>
            </div>
          }
        >
          <ActivityLevelContent />
        </Suspense>
      </HealthTrackingLayout>
    </div>
  )
}
