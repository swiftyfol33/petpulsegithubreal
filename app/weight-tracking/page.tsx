"use client"

import type React from "react"

import { useEffect, useState, Suspense } from "react"
import { useAuth } from "../../contexts/AuthContext"
import { useSelectedPet } from "../../contexts/PetContext"
import { HealthTrackingLayout } from "@/components/health-tracking-layout"
import { db } from "../../lib/firebase"
import { collection, query, where, orderBy, limit, getDocs, addDoc } from "firebase/firestore"
import { format } from "date-fns"
import { Weight, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { PetHeader } from "../../components/pet-header"
import { Skeleton } from "@/components/ui/skeleton"

interface WeightRecord {
  id: string
  date: string
  weight: number
}

function WeightTrackingContent() {
  const { user } = useAuth()
  const { selectedPet } = useSelectedPet()
  const [weightRecords, setWeightRecords] = useState<WeightRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newWeight, setNewWeight] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    fetchWeightRecords()
  }, [selectedPet]) //Fixed useEffect dependency

  const fetchWeightRecords = async () => {
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
      const records: WeightRecord[] = []
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        if (data.weight) {
          records.push({
            id: doc.id,
            date: data.date,
            weight: data.weight,
          })
        }
      })
      setWeightRecords(records)
    } catch (err) {
      console.error("Error fetching weight records:", err)
      setError("Failed to fetch weight records.")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !selectedPet) return

    setIsSubmitting(true)
    try {
      const weightValue = Number.parseFloat(newWeight)
      if (isNaN(weightValue) || weightValue <= 0) {
        throw new Error("Please enter a valid weight")
      }

      await addDoc(collection(db, "healthRecords"), {
        userId: user.uid,
        petId: selectedPet.id,
        date: new Date().toISOString(),
        weight: weightValue,
      })

      setNewWeight("")
      await fetchWeightRecords()
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to add weight record")
    } finally {
      setIsSubmitting(false)
    }
  }

  const currentWeight = weightRecords[0]?.weight.toFixed(1) || "No data"

  return (
    <div className="space-y-4">
      {/* Log New Weight */}
      <Card className="p-4">
        <form onSubmit={handleSubmit} className="flex items-center gap-2" noValidate>
          <div className="flex-1">
            <Input
              type="number"
              placeholder="Enter weight in kg"
              value={newWeight}
              onChange={(e) => setNewWeight(e.target.value)}
              step="0.1"
              min="0"
              required
            />
          </div>
          <Button type="submit" size="icon" disabled={isSubmitting}>
            <Plus className="w-4 h-4" />
          </Button>
        </form>
      </Card>

      {/* Weight History */}
      <div className="space-y-2">
        <h3 className="font-medium text-gray-500 px-1">Logged</h3>
        {loading ? (
          <p className="text-center py-4">Loading weight records...</p>
        ) : error ? (
          <p className="text-red-500 text-center py-4">{error}</p>
        ) : weightRecords.length > 0 ? (
          weightRecords.map((record) => (
            <Card key={record.id} className="p-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <Weight className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className="font-medium">{record.weight.toFixed(1)} kg</span>
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
          <p className="text-center py-4 text-gray-500">No weight records found</p>
        )}
      </div>
    </div>
  )
}

export default function WeightTrackingPage() {
  const { user } = useAuth()
  const { selectedPet } = useSelectedPet()

  const currentWeight = "Loading..."

  return (
    <div className="flex flex-col min-h-screen bg-[#FFFFFF]">
      <PetHeader backTo="/" />
      <HealthTrackingLayout
        title="Weight"
        currentValue={currentWeight}
        unit="kg"
        color="blue"
        icon={<Weight className="w-5 h-5" />}
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
          <WeightTrackingContent />
        </Suspense>
      </HealthTrackingLayout>
    </div>
  )
}
