"use client"

import type React from "react"

import { useEffect, useState, Suspense } from "react"
import { useAuth } from "../../contexts/AuthContext"
import { useSelectedPet } from "../../contexts/PetContext"
import { HealthTrackingLayout } from "@/components/health-tracking-layout"
import { db } from "../../lib/firebase"
import { collection, query, where, orderBy, limit, getDocs, addDoc } from "firebase/firestore"
import { format } from "date-fns"
import { Utensils } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PetHeader } from "../../components/pet-header"
import { Skeleton } from "@/components/ui/skeleton"

interface FoodRecord {
  id: string
  date: string
  foodIntake: string
}

function FoodIntakeContent() {
  const { user } = useAuth()
  const { selectedPet } = useSelectedPet()
  const [foodRecords, setFoodRecords] = useState<FoodRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newFoodIntake, setNewFoodIntake] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    fetchFoodRecords()
  }, [user, selectedPet]) //Fixed useEffect dependency

  const fetchFoodRecords = async () => {
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
      const records: FoodRecord[] = []
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        if (data.foodIntake) {
          records.push({
            id: doc.id,
            date: data.date,
            foodIntake: data.foodIntake,
          })
        }
      })
      setFoodRecords(records)
    } catch (err) {
      console.error("Error fetching food records:", err)
      setError("Failed to fetch food records.")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !selectedPet || !newFoodIntake) return

    setIsSubmitting(true)
    try {
      await addDoc(collection(db, "healthRecords"), {
        userId: user.uid,
        petId: selectedPet.id,
        date: new Date().toISOString(),
        foodIntake: newFoodIntake,
      })

      setNewFoodIntake("")
      await fetchFoodRecords()
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to add food record")
    } finally {
      setIsSubmitting(false)
    }
  }

  const currentFood = foodRecords[0]?.foodIntake || "No data"

  return (
    <div className="space-y-4">
      {/* Log New Food Intake */}
      <Card className="p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select value={newFoodIntake} onValueChange={setNewFoodIntake}>
            <SelectTrigger>
              <SelectValue placeholder="Select food intake" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="less">Less than usual</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="more">More than usual</SelectItem>
            </SelectContent>
          </Select>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            Log Food Intake
          </Button>
        </form>
      </Card>

      {/* Food History */}
      <div className="space-y-2">
        <h3 className="font-medium text-gray-500 px-1">Logged</h3>
        {loading ? (
          <p className="text-center py-4">Loading food records...</p>
        ) : error ? (
          <p className="text-red-500 text-center py-4">{error}</p>
        ) : foodRecords.length > 0 ? (
          foodRecords.map((record) => (
            <Card key={record.id} className="p-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                    <Utensils className="w-4 h-4 text-orange-600" />
                  </div>
                  <span className="font-medium capitalize">{record.foodIntake}</span>
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
          <p className="text-center py-4 text-gray-500">No food records found</p>
        )}
      </div>
    </div>
  )
}

export default function FoodIntakePage() {
  const { user } = useAuth()
  const { selectedPet } = useSelectedPet()

  const currentFood = "Loading..."

  return (
    <div className="flex flex-col min-h-screen bg-[#FFFFFF]">
      <PetHeader backTo="/" />
      <HealthTrackingLayout
        title="Food Intake"
        currentValue={currentFood}
        color="orange"
        icon={<Utensils className="w-5 h-5" />}
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
          <FoodIntakeContent />
        </Suspense>
      </HealthTrackingLayout>
    </div>
  )
}
