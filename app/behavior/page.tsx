"use client"

import type React from "react"

import { useEffect, useState, Suspense } from "react"
import { useAuth } from "../../contexts/AuthContext"
import { useSelectedPet } from "../../contexts/PetContext"
import { HealthTrackingLayout } from "@/components/health-tracking-layout"
import { db } from "../../lib/firebase"
import { collection, query, where, orderBy, limit, getDocs, addDoc } from "firebase/firestore"
import { format } from "date-fns"
import { Smile } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PetHeader } from "../../components/pet-header"
import { Skeleton } from "@/components/ui/skeleton"

interface BehaviorRecord {
  id: string
  date: string
  behavior: string
}

function BehaviorContent() {
  const { user } = useAuth()
  const { selectedPet } = useSelectedPet()
  const [behaviorRecords, setBehaviorRecords] = useState<BehaviorRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newBehavior, setNewBehavior] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    fetchBehaviorRecords()
  }, [selectedPet])

  const fetchBehaviorRecords = async () => {
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
      const records: BehaviorRecord[] = []
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        if (data.behavior) {
          records.push({
            id: doc.id,
            date: data.date,
            behavior: data.behavior,
          })
        }
      })
      setBehaviorRecords(records)
    } catch (err) {
      console.error("Error fetching behavior records:", err)
      setError("Failed to fetch behavior records.")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !selectedPet || !newBehavior) return

    setIsSubmitting(true)
    try {
      await addDoc(collection(db, "healthRecords"), {
        userId: user.uid,
        petId: selectedPet.id,
        date: new Date().toISOString(),
        behavior: newBehavior,
      })

      setNewBehavior("")
      await fetchBehaviorRecords()
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to add behavior record")
    } finally {
      setIsSubmitting(false)
    }
  }

  const currentBehavior = behaviorRecords[0]?.behavior || "No data"

  return (
    <div className="space-y-4">
      {/* Log New Behavior */}
      <Card className="p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select value={newBehavior} onValueChange={setNewBehavior}>
            <SelectTrigger>
              <SelectValue placeholder="Select behavior" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="lethargic">Lethargic</SelectItem>
              <SelectItem value="hyperactive">Hyperactive</SelectItem>
              <SelectItem value="anxious">Anxious</SelectItem>
              <SelectItem value="aggressive">Aggressive</SelectItem>
            </SelectContent>
          </Select>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            Log Behavior
          </Button>
        </form>
      </Card>

      {/* Behavior History */}
      <div className="space-y-2">
        <h3 className="font-medium text-gray-500 px-1">Logged</h3>
        {loading ? (
          <p className="text-center py-4">Loading behavior records...</p>
        ) : error ? (
          <p className="text-red-500 text-center py-4">{error}</p>
        ) : behaviorRecords.length > 0 ? (
          behaviorRecords.map((record) => (
            <Card key={record.id} className="p-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center">
                    <Smile className="w-4 h-4 text-pink-600" />
                  </div>
                  <span className="font-medium capitalize">{record.behavior}</span>
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
          <p className="text-center py-4 text-gray-500">No behavior records found</p>
        )}
      </div>
    </div>
  )
}

export default function BehaviorPage() {
  const { user } = useAuth()
  const { selectedPet } = useSelectedPet()

  const currentBehavior = "Loading..."

  return (
    <div className="flex flex-col min-h-screen bg-[#FFFFFF]">
      <PetHeader backTo="/" />
      <HealthTrackingLayout
        title="Behavior"
        currentValue={currentBehavior}
        color="pink"
        icon={<Smile className="w-5 h-5" />}
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
          <BehaviorContent />
        </Suspense>
      </HealthTrackingLayout>
    </div>
  )
}
