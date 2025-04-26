"use client"

import type React from "react"

import { useEffect, useState, Suspense } from "react"
import { useAuth } from "../../contexts/AuthContext"
import { useSelectedPet } from "../../contexts/PetContext"
import { HealthTrackingLayout } from "@/components/health-tracking-layout"
import { db } from "../../lib/firebase"
import { collection, query, where, orderBy, limit, getDocs, addDoc } from "firebase/firestore"
import { format } from "date-fns"
import { Moon, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { PetHeader } from "../../components/pet-header"
import { Skeleton } from "@/components/ui/skeleton"

interface SleepRecord {
  id: string
  date: string
  sleepDuration: number
}

function SleepTrackingContent() {
  const { user } = useAuth()
  const { selectedPet } = useSelectedPet()
  const [sleepRecords, setSleepRecords] = useState<SleepRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newSleepDuration, setNewSleepDuration] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    fetchSleepRecords()
  }, [selectedPet]) //Fixed useEffect dependency

  const fetchSleepRecords = async () => {
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
        orderBy("date", "desc"),
        limit(30),
      )

      const querySnapshot = await getDocs(q)
      const records: SleepRecord[] = []
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        if (data.sleepDuration) {
          records.push({
            id: doc.id,
            date: data.date,
            sleepDuration: data.sleepDuration,
          })
        }
      })
      setSleepRecords(records)
    } catch (err) {
      console.error("Error fetching sleep records:", err)
      setError("Failed to fetch sleep records.")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !selectedPet) return

    setIsSubmitting(true)
    try {
      const sleepValue = Number.parseFloat(newSleepDuration)
      if (isNaN(sleepValue) || sleepValue < 0 || sleepValue > 24) {
        throw new Error("Please enter a valid sleep duration (0-24 hours)")
      }

      await addDoc(collection(db, "healthRecords"), {
        userId: user.uid,
        petId: selectedPet.id,
        date: new Date().toISOString(),
        sleepDuration: sleepValue,
      })

      setNewSleepDuration("")
      await fetchSleepRecords()
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to add sleep record")
    } finally {
      setIsSubmitting(false)
    }
  }

  const currentSleep = sleepRecords[0]?.sleepDuration.toFixed(1) || "No data"

  return (
    <div className="space-y-4">
      {/* Log New Sleep Duration */}
      <Card className="p-4">
        <form onSubmit={handleSubmit} className="flex items-center gap-2" noValidate>
          <div className="flex-1">
            <Input
              type="number"
              placeholder="Enter sleep duration in hours"
              value={newSleepDuration}
              onChange={(e) => setNewSleepDuration(e.target.value)}
              step="0.5"
              min="0"
              max="24"
              required
            />
          </div>
          <Button type="submit" size="icon" disabled={isSubmitting}>
            <Plus className="w-4 h-4" />
          </Button>
        </form>
      </Card>

      {/* Sleep History */}
      <div className="space-y-2">
        <h3 className="font-medium text-gray-500 px-1">Logged</h3>
        {loading ? (
          <p className="text-center py-4">Loading sleep records...</p>
        ) : error ? (
          <p className="text-red-500 text-center py-4">{error}</p>
        ) : sleepRecords.length > 0 ? (
          sleepRecords.map((record) => (
            <Card key={record.id} className="p-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                    <Moon className="w-4 h-4 text-purple-600" />
                  </div>
                  <span className="font-medium">{record.sleepDuration.toFixed(1)} hours</span>
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
          <p className="text-center py-4 text-gray-500">No sleep records found</p>
        )}
      </div>
    </div>
  )
}

export default function SleepTrackingPage() {
  const { user } = useAuth()
  const { selectedPet } = useSelectedPet()

  const currentSleep = "Loading..."

  return (
    <div className="flex flex-col min-h-screen bg-[#FFFFFF]">
      <PetHeader backTo="/" />
      <HealthTrackingLayout
        title="Sleep"
        currentValue={currentSleep}
        unit="hours"
        color="purple"
        icon={<Moon className="w-5 h-5" />}
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
          <SleepTrackingContent />
        </Suspense>
      </HealthTrackingLayout>
    </div>
  )
}
