"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useAuth } from "../../contexts/AuthContext"
import { useSelectedPet } from "../../contexts/PetContext"
import { HealthTrackingLayout } from "@/components/health-tracking-layout"
import { db } from "../../lib/firebase"
import { collection, query, where, orderBy, limit, getDocs, addDoc } from "firebase/firestore"
import { Smile, Weight, Moon, Activity, Utensils, PenTool } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PetHeader } from "../../components/pet-header"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { useRouter } from "next/navigation"

interface BehaviorRecord {
  id: string
  date: string
  behavior: string
}

export default function TrackAllPage() {
  const { user } = useAuth()
  const { selectedPet } = useSelectedPet()
  const [behaviorRecords, setBehaviorRecords] = useState<BehaviorRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newBehavior, setNewBehavior] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  // New state for health tracking
  const [weight, setWeight] = useState("")
  const [activityLevel, setActivityLevel] = useState<number[] | null>(null)
  const [foodIntake, setFoodIntake] = useState("")
  const [sleepDuration, setSleepDuration] = useState("")
  const [behavior, setBehavior] = useState("")
  const [notes, setNotes] = useState("")

  useEffect(() => {
    if (user && selectedPet) {
      fetchBehaviorRecords()
    }
  }, [user, selectedPet]) //Fixed useEffect dependency

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
    if (!user || !selectedPet) {
      setError("You must be logged in and have a pet selected to track health")
      return
    }

    setIsSubmitting(true)
    setError("")

    try {
      const healthRecord: any = {
        userId: user.uid,
        petId: selectedPet.id,
        date: new Date().toISOString(),
      }

      if (weight) {
        const weightValue = Number.parseFloat(weight)
        if (isNaN(weightValue) || weightValue <= 0) {
          throw new Error("Please enter a valid weight")
        }
        healthRecord.weight = weightValue
      }

      if (activityLevel !== null && activityLevel[0] !== 5) {
        healthRecord.activityLevel = activityLevel[0]
      }

      if (foodIntake) {
        healthRecord.foodIntake = foodIntake
      }

      if (sleepDuration) {
        healthRecord.sleepDuration = Number(sleepDuration)
      }

      if (behavior) {
        healthRecord.behavior = behavior
      }

      if (notes) {
        healthRecord.notes = notes
      }

      await addDoc(collection(db, "healthRecords"), healthRecord)
      await fetchBehaviorRecords()
      router.push("/")
    } catch (error) {
      console.error("Error adding health record:", error)
      if (error instanceof Error) {
        setError(error.message)
      } else {
        setError("Failed to add health record. Please try again.")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const currentBehavior = behaviorRecords[0]?.behavior || "No data"

  return (
    <div className="flex flex-col min-h-screen bg-[#FFFFFF] pb-20">
      <PetHeader backTo="/" />
      <HealthTrackingLayout
        title="Track All"
        currentValue="All Health Metrics"
        color="blue"
        icon={<Activity className="w-5 h-5" />}
      >
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold mb-6 text-[#2D57ED]">Track Health</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex space-x-4">
              <div className="flex-1 bg-[#EEF1FF] rounded-lg p-4 flex flex-col min-h-[120px]">
                <label htmlFor="weight" className="block text-sm font-medium text-blue-800 mb-1 flex items-center">
                  <Weight className="w-5 h-5 mr-2" />
                  Weight (kg)
                </label>
                <Input
                  type="number"
                  id="weight"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  required
                  step="0.1"
                  min="0"
                  className="w-full bg-white mt-auto"
                />
              </div>

              <div className="flex-1 bg-[#F8ECFF] rounded-lg p-4 flex flex-col min-h-[120px]">
                <label
                  htmlFor="sleepDuration"
                  className="block text-sm font-medium text-purple-800 mb-1 flex items-center"
                >
                  <Moon className="w-5 h-5 mr-2" />
                  Sleep (hours)
                </label>
                <Input
                  type="number"
                  id="sleepDuration"
                  value={sleepDuration}
                  onChange={(e) => setSleepDuration(e.target.value)}
                  min="0"
                  max="24"
                  step="0.5"
                  className="w-full bg-white mt-auto"
                />
              </div>
            </div>

            <div className="bg-green-100 rounded-lg p-4">
              <label
                htmlFor="activityLevel"
                className="block text-sm font-medium text-green-800 mb-1 flex items-center"
              >
                <Activity className="w-5 h-5 mr-2" />
                Activity Level (1-10)
              </label>
              <Slider
                id="activityLevel"
                min={1}
                max={10}
                step={1}
                value={activityLevel || [5]}
                onValueChange={setActivityLevel}
                className="w-full"
              />
              <span className="text-sm text-green-700 mt-1">
                {activityLevel === null ? "Move to set level" : `Current: ${activityLevel[0]}`}
              </span>
            </div>

            <div className="bg-yellow-100 rounded-lg p-4">
              <label htmlFor="foodIntake" className="block text-sm font-medium text-yellow-800 mb-1 flex items-center">
                <Utensils className="w-5 h-5 mr-2" />
                Food Intake
              </label>
              <Select value={foodIntake} onValueChange={setFoodIntake}>
                <SelectTrigger id="foodIntake" className="w-full bg-white">
                  <SelectValue placeholder="Select food intake" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="less">Less than usual</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="more">More than usual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-pink-100 rounded-lg p-4">
              <label htmlFor="behavior" className="block text-sm font-medium text-pink-800 mb-1 flex items-center">
                <Smile className="w-5 h-5 mr-2" />
                Behavior
              </label>
              <Select value={behavior} onValueChange={setBehavior}>
                <SelectTrigger id="behavior" className="w-full bg-white">
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
            </div>

            <div className="bg-gray-100 rounded-lg p-4">
              <label htmlFor="notes" className="block text-sm font-medium text-gray-800 mb-1 flex items-center">
                <PenTool className="w-5 h-5 mr-2" />
                Notes
              </label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="w-full bg-white"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full px-4 py-2 text-white rounded-lg transition-colors ${
                isSubmitting ? "bg-gray-400" : "bg-[#2D57ED] hover:bg-opacity-90"
              }`}
            >
              {isSubmitting ? "Saving..." : "Save Health Record"}
            </button>
          </form>
        </div>
      </HealthTrackingLayout>
    </div>
  )
}
