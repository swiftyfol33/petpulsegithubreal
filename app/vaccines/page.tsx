"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useAuth } from "../../contexts/AuthContext"
import { useSelectedPet } from "../../contexts/PetContext"
import { HealthTrackingLayout } from "@/components/health-tracking-layout"
import { db } from "../../lib/firebase"
import { collection, query, where, orderBy, getDocs, addDoc, deleteDoc, doc, updateDoc } from "firebase/firestore"
import { format, isBefore, parseISO } from "date-fns"
import { Syringe, Plus, Trash2, Check, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { PetHeader } from "../../components/pet-header"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { toast } from "react-hot-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useSearchParams } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

interface Vaccination {
  id: string
  name: string
  dueDate: string
  repeat: boolean
  repeatInterval?: number
  completed?: boolean
}

export default function VaccinesPage() {
  const { user } = useAuth()
  const { selectedPet } = useSelectedPet()
  const [vaccinations, setVaccinations] = useState<Vaccination[]>([])
  const [completedVaccinations, setCompletedVaccinations] = useState<Vaccination[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [vaccinationName, setVaccinationName] = useState("")
  const [vaccinationDate, setVaccinationDate] = useState("")
  const [vaccinationTime, setVaccinationTime] = useState("")
  const [vaccinationRepeat, setVaccinationRepeat] = useState(false)
  const [vaccinationRepeatInterval, setVaccinationRepeatInterval] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState("upcoming")

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingVaccination, setEditingVaccination] = useState<Vaccination | null>(null)
  const [newDateTime, setNewDateTime] = useState("")

  const searchParams = useSearchParams()
  const action = searchParams.get("action")

  useEffect(() => {
    if (user && selectedPet) {
      fetchVaccinations()
    }
  }, [user, selectedPet])

  useEffect(() => {
    if (action === "add") {
      // Scroll to the add vaccination form
      const addForm = document.getElementById("add-vaccination-form")
      if (addForm) {
        addForm.scrollIntoView({ behavior: "smooth" })
      }
    }
  }, [action])

  const fetchVaccinations = async () => {
    if (!user || !selectedPet) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const q = query(
        collection(db, "vaccinations"),
        where("userId", "==", user.uid),
        where("petId", "==", selectedPet.id),
        orderBy("dueDate"),
      )

      const querySnapshot = await getDocs(q)
      const vaccinationData: Vaccination[] = []
      const completedData: Vaccination[] = []
      querySnapshot.forEach((doc) => {
        const data = { id: doc.id, ...doc.data() } as Vaccination
        if (data.completed) {
          completedData.push(data)
        } else {
          vaccinationData.push(data)
        }
      })
      setVaccinations(vaccinationData)
      setCompletedVaccinations(completedData)
    } catch (err) {
      console.error("Error fetching vaccinations:", err)
      setError("Failed to fetch vaccinations.")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !selectedPet || !vaccinationDate) return

    setIsSubmitting(true)
    try {
      let vaccinationDateTime: Date

      if (vaccinationTime) {
        vaccinationDateTime = new Date(`${vaccinationDate}T${vaccinationTime}`)
      } else {
        vaccinationDateTime = new Date(`${vaccinationDate}T00:00:00`)
      }

      if (isNaN(vaccinationDateTime.getTime())) {
        throw new Error("Invalid date entered")
      }

      // Check if the vaccination date is before the pet's birth date
      const petBirthDate = new Date(selectedPet.birthDate)
      if (isBefore(vaccinationDateTime, petBirthDate)) {
        throw new Error("Vaccination date cannot be before the pet's birth date")
      }

      const isInPast = isBefore(vaccinationDateTime, new Date())

      const vaccination: any = {
        userId: user.uid,
        petId: selectedPet.id,
        name: vaccinationName,
        dueDate: vaccinationDateTime.toISOString(),
        repeat: vaccinationRepeat,
        completed: isInPast, // Mark as completed if the date is in the past
      }

      if (vaccinationRepeat && vaccinationRepeatInterval) {
        const repeatInterval = Number.parseInt(vaccinationRepeatInterval)
        if (!isNaN(repeatInterval) && repeatInterval > 0) {
          vaccination.repeatInterval = repeatInterval
        }
      }

      await addDoc(collection(db, "vaccinations"), vaccination)
      setVaccinationName("")
      setVaccinationDate("")
      setVaccinationTime("")
      setVaccinationRepeat(false)
      setVaccinationRepeatInterval("")
      await fetchVaccinations()
      toast.success(isInPast ? "Vaccination added to completed list" : "Vaccination added successfully")
      setActiveTab(isInPast ? "completed" : "upcoming")
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to add vaccination")
      toast.error(error instanceof Error ? error.message : "Failed to add vaccination")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (vaccinationId: string) => {
    if (!user || !selectedPet) return

    try {
      await deleteDoc(doc(db, "vaccinations", vaccinationId))
      await fetchVaccinations()
      toast.success("Vaccination deleted successfully")
    } catch (error) {
      console.error("Error deleting vaccination:", error)
      toast.error("Failed to delete vaccination")
    }
  }

  const handleComplete = async (vaccination: Vaccination) => {
    try {
      if (vaccination.repeat && vaccination.repeatInterval) {
        const newDueDate = new Date(vaccination.dueDate)
        newDueDate.setDate(newDueDate.getDate() + vaccination.repeatInterval)

        // Mark the current vaccination as completed
        await updateDoc(doc(db, "vaccinations", vaccination.id), {
          completed: true,
        })

        // Create a new vaccination for the next due date
        await addDoc(collection(db, "vaccinations"), {
          ...vaccination,
          id: undefined,
          dueDate: newDueDate.toISOString(),
          completed: false,
        })
      } else {
        // For non-repeating vaccinations, just mark as completed
        await updateDoc(doc(db, "vaccinations", vaccination.id), {
          completed: true,
        })
      }
      await fetchVaccinations()
      toast.success("Vaccination marked as completed")
    } catch (error) {
      console.error("Error completing vaccination:", error)
      toast.error("Failed to complete vaccination")
    }
  }

  const handleOpenModal = (vaccination: Vaccination) => {
    setEditingVaccination(vaccination)
    setNewDateTime(format(new Date(vaccination.dueDate), "yyyy-MM-dd'T'HH:mm"))
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingVaccination(null)
    setNewDateTime("")
  }

  const handleUpdateDateTime = async () => {
    if (!editingVaccination) return

    const newDate = parseISO(newDateTime)
    if (isBefore(newDate, new Date())) {
      toast.error("New date and time must be in the future")
      return
    }

    try {
      await updateDoc(doc(db, "vaccinations", editingVaccination.id), {
        dueDate: newDate.toISOString(),
      })

      // Update the local state
      setVaccinations((prev) =>
        prev
          .map((v) => (v.id === editingVaccination.id ? { ...v, dueDate: newDate.toISOString() } : v))
          .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()),
      )

      toast.success("Vaccination rescheduled")
      handleCloseModal()
    } catch (error) {
      console.error("Error updating vaccination:", error)
      toast.error("Failed to reschedule vaccination")
    }
  }

  const renderVaccinationItem = (vaccination: Vaccination, isCompleted = false) => {
    const isOverdue = isBefore(new Date(vaccination.dueDate), new Date())
    const dueDate = new Date(vaccination.dueDate)
    const hasTime = dueDate.getHours() !== 0 || dueDate.getMinutes() !== 0
    return (
      <Card key={vaccination.id} className={`p-4 mb-2 ${isOverdue && !isCompleted ? "border-l-4 border-red-500" : ""}`}>
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold">{vaccination.name}</h4>
            <p className="text-sm text-gray-500">
              {isCompleted ? "Completed on: " : isOverdue ? "Overdue since: " : "Due: "}
              {format(dueDate, hasTime ? "MMM d, yyyy h:mm a" : "MMM d, yyyy")}
            </p>
            {vaccination.repeat && (
              <p className="text-sm text-gray-500">Repeats every {vaccination.repeatInterval} days</p>
            )}
          </div>
          {!isCompleted && (
            <div className="flex space-x-2">
              <Button size="sm" variant="outline" onClick={() => handleOpenModal(vaccination)}>
                <Clock className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleDelete(vaccination.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleComplete(vaccination)}>
                <Check className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </Card>
    )
  }

  const currentVaccination = vaccinations.length > 0 ? "Current vaccinations" : "No vaccinations"

  return (
    <div className="flex flex-col min-h-screen bg-[#FFFFFF]">
      <PetHeader backTo="/" />
      <HealthTrackingLayout
        title="Vaccinations"
        color="green"
        icon={<Syringe className="w-5 h-5" />}
        showCurrentValueCard={false}
      >
        <div className="space-y-4">
          <Card className="p-4">
            <form id="add-vaccination-form" onSubmit={handleSubmit} className="space-y-4">
              <Input
                type="text"
                placeholder="Vaccination Name"
                value={vaccinationName}
                onChange={(e) => setVaccinationName(e.target.value)}
                required
              />
              <Input
                type="date"
                value={vaccinationDate}
                onChange={(e) => setVaccinationDate(e.target.value)}
                required
              />
              <Input
                type="time"
                value={vaccinationTime}
                onChange={(e) => setVaccinationTime(e.target.value)}
                className="mt-2"
              />
              <div className="flex items-center space-x-2">
                <Switch id="vaccination-repeat" checked={vaccinationRepeat} onCheckedChange={setVaccinationRepeat} />
                <Label htmlFor="vaccination-repeat">Repeat</Label>
              </div>
              {vaccinationRepeat && (
                <Input
                  type="number"
                  placeholder="Repeat every X days"
                  value={vaccinationRepeatInterval}
                  onChange={(e) => setVaccinationRepeatInterval(e.target.value)}
                  min="1"
                  required
                />
              )}
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                <Plus className="w-4 h-4 mr-2" />
                Add Vaccination
              </Button>
            </form>
          </Card>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
            </TabsList>
            <TabsContent value="upcoming">
              <div className="space-y-2">
                <h3 className="font-medium text-gray-500 px-1">Upcoming Vaccinations</h3>
                {loading ? (
                  <p className="text-center py-4">Loading vaccinations...</p>
                ) : error ? (
                  <p className="text-red-500 text-center py-4">{error}</p>
                ) : vaccinations.length > 0 ? (
                  vaccinations.map((vaccination) => renderVaccinationItem(vaccination))
                ) : (
                  <p className="text-center py-4 text-gray-500">No upcoming vaccinations found</p>
                )}
              </div>
            </TabsContent>
            <TabsContent value="completed">
              <div className="space-y-2">
                <h3 className="font-medium text-gray-500 px-1">Completed Vaccinations</h3>
                {loading ? (
                  <p className="text-center py-4">Loading completed vaccinations...</p>
                ) : completedVaccinations.length > 0 ? (
                  completedVaccinations.map((vaccination) => renderVaccinationItem(vaccination, true))
                ) : (
                  <p className="text-center py-4 text-gray-500">No completed vaccinations found</p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </HealthTrackingLayout>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule Vaccination</DialogTitle>
            <DialogDescription>
              Choose a new date and time for {editingVaccination?.name}. The new time must be in the future.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-date-time" className="text-right">
                New Date and Time
              </Label>
              <Input
                id="new-date-time"
                type="datetime-local"
                value={newDateTime}
                onChange={(e) => setNewDateTime(e.target.value)}
                className="col-span-3"
                min={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button onClick={handleUpdateDateTime}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
