"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useAuth } from "../../contexts/AuthContext"
import { useSelectedPet } from "../../contexts/PetContext"
import { HealthTrackingLayout } from "@/components/health-tracking-layout"
import { db } from "../../lib/firebase"
import { collection, query, where, orderBy, getDocs, addDoc, deleteDoc, doc, updateDoc } from "firebase/firestore"
import { format, isBefore, parseISO } from "date-fns"
import { Pill, Plus, Trash2, Check, Clock } from "lucide-react"
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

interface Medication {
  id: string
  name: string
  dueDate: string
  frequency: string
  repeat: boolean
  repeatInterval?: number
  completed?: boolean
  expirationDate?: string | null
}

export default function MedicationPage() {
  const { user } = useAuth()
  const { selectedPet } = useSelectedPet()
  const [medications, setMedications] = useState<Medication[]>([])
  const [completedMedications, setCompletedMedications] = useState<Medication[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [medicationName, setMedicationName] = useState("")
  const [medicationDate, setMedicationDate] = useState("")
  const [medicationFrequency, setMedicationFrequency] = useState("")
  const [medicationRepeat, setMedicationRepeat] = useState(false)
  const [medicationRepeatInterval, setMedicationRepeatInterval] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [medicationTime, setMedicationTime] = useState("")
  const [activeTab, setActiveTab] = useState("upcoming")
  const [expirationDate, setExpirationDate] = useState("")

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingMedication, setEditingMedication] = useState<Medication | null>(null)
  const [newDateTime, setNewDateTime] = useState("")

  const searchParams = useSearchParams()
  const action = searchParams.get("action")

  useEffect(() => {
    if (user && selectedPet) {
      fetchMedications()
    }
  }, [user, selectedPet])

  useEffect(() => {
    if (action === "add") {
      // Scroll to the add medication form
      const addForm = document.getElementById("add-medication-form")
      if (addForm) {
        addForm.scrollIntoView({ behavior: "smooth" })
      }
    }
  }, [action])

  const fetchMedications = async () => {
    if (!user || !selectedPet) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const q = query(
        collection(db, "medications"),
        where("userId", "==", user.uid),
        where("petId", "==", selectedPet.id),
        orderBy("dueDate"),
      )

      const querySnapshot = await getDocs(q)
      const medicationData: Medication[] = []
      const completedData: Medication[] = []
      querySnapshot.forEach((doc) => {
        const data = { id: doc.id, ...doc.data() } as Medication
        if (data.completed) {
          completedData.push(data)
        } else {
          medicationData.push(data)
        }
      })
      setMedications(medicationData)
      setCompletedMedications(completedData)
    } catch (err) {
      console.error("Error fetching medications:", err)
      setError("Failed to fetch medications.")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !selectedPet || !medicationDate) return

    setIsSubmitting(true)
    try {
      let medicationDateTime: Date

      if (medicationTime) {
        medicationDateTime = new Date(`${medicationDate}T${medicationTime}`)
      } else {
        medicationDateTime = new Date(`${medicationDate}T00:00:00`)
      }

      if (isNaN(medicationDateTime.getTime())) {
        throw new Error("Invalid date entered")
      }

      // Check if the medication date is before the pet's birth date
      const petBirthDate = new Date(selectedPet.birthDate)
      if (isBefore(medicationDateTime, petBirthDate)) {
        throw new Error("Medication date cannot be before the pet's birth date")
      }

      const isInPast = isBefore(medicationDateTime, new Date())

      const medication: any = {
        userId: user.uid,
        petId: selectedPet.id,
        name: medicationName,
        dueDate: medicationDateTime.toISOString(),
        frequency: medicationFrequency,
        repeat: medicationRepeat,
        completed: isInPast, // Mark as completed if the date is in the past
        expirationDate: expirationDate ? new Date(expirationDate).toISOString() : null,
      }

      if (medicationRepeat && medicationRepeatInterval) {
        const repeatInterval = Number.parseInt(medicationRepeatInterval, 10)
        if (!isNaN(repeatInterval) && repeatInterval > 0) {
          medication.repeatInterval = repeatInterval
        }
      }

      await addDoc(collection(db, "medications"), medication)
      setMedicationName("")
      setMedicationDate("")
      setMedicationTime("")
      setMedicationFrequency("")
      setMedicationRepeat(false)
      setMedicationRepeatInterval("")
      setExpirationDate("")
      await fetchMedications()
      toast.success(isInPast ? "Medication added to completed list" : "Medication added successfully")
      setActiveTab(isInPast ? "completed" : "upcoming")
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to add medication")
      toast.error(error instanceof Error ? error.message : "Failed to add medication")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (medicationId: string) => {
    if (!user || !selectedPet) return

    try {
      await deleteDoc(doc(db, "medications", medicationId))
      await fetchMedications()
      toast.success("Medication deleted successfully")
    } catch (error) {
      console.error("Error deleting medication:", error)
      toast.error("Failed to delete medication")
    }
  }

  const handleComplete = async (medication: Medication) => {
    try {
      if (medication.repeat && medication.repeatInterval) {
        const newDueDate = new Date(medication.dueDate)
        newDueDate.setDate(newDueDate.getDate() + medication.repeatInterval)

        // Mark the current medication as completed
        await updateDoc(doc(db, "medications", medication.id), {
          completed: true,
        })

        // Create a new medication for the next due date
        await addDoc(collection(db, "medications"), {
          ...medication,
          id: undefined,
          dueDate: newDueDate.toISOString(),
          completed: false,
        })
      } else {
        // For non-repeating medications, just mark as completed
        await updateDoc(doc(db, "medications", medication.id), {
          completed: true,
        })
      }
      await fetchMedications()
      toast.success("Medication marked as completed")
    } catch (error) {
      console.error("Error completing medication:", error)
      toast.error("Failed to complete medication")
    }
  }

  const handleOpenModal = (medication: Medication) => {
    setEditingMedication(medication)
    setNewDateTime(format(new Date(medication.dueDate), "yyyy-MM-dd'T'HH:mm"))
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingMedication(null)
    setNewDateTime("")
  }

  const handleUpdateDateTime = async () => {
    if (!editingMedication) return

    const newDate = parseISO(newDateTime)
    if (isBefore(newDate, new Date())) {
      toast.error("New date and time must be in the future")
      return
    }

    try {
      await updateDoc(doc(db, "medications", editingMedication.id), {
        dueDate: newDate.toISOString(),
        // Preserve other fields
        expirationDate: editingMedication.expirationDate || null,
      })

      // Update the local state
      setMedications((prev) =>
        prev
          .map((m) => (m.id === editingMedication.id ? { ...m, dueDate: newDate.toISOString() } : m))
          .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()),
      )

      toast.success("Medication rescheduled")
      handleCloseModal()
    } catch (error) {
      console.error("Error updating medication:", error)
      toast.error("Failed to reschedule medication")
    }
  }

  const isExpired = (expirationDate: string): boolean => {
    if (!expirationDate) return false
    return isBefore(new Date(expirationDate), new Date())
  }

  const isExpirationWarning = (expirationDate: string): boolean => {
    if (!expirationDate) return false
    const expDate = new Date(expirationDate)
    const today = new Date()
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(today.getDate() + 30)

    return isBefore(expDate, thirtyDaysFromNow) && !isBefore(expDate, today)
  }

  const renderMedicationItem = (medication: Medication, isCompleted = false) => {
    const isOverdue = isBefore(new Date(medication.dueDate), new Date())
    const dueDate = new Date(medication.dueDate)
    const hasTime = dueDate.getHours() !== 0 || dueDate.getMinutes() !== 0
    return (
      <Card key={medication.id} className={`p-4 mb-2 ${isOverdue && !isCompleted ? "border-l-4 border-red-500" : ""}`}>
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold">{medication.name}</h4>
            <p className="text-sm text-gray-500">
              {isCompleted ? "Completed on: " : isOverdue ? "Overdue since: " : "Due: "}
              {format(dueDate, hasTime ? "MMM d, yyyy h:mm a" : "MMM d, yyyy")}
            </p>
            {medication.expirationDate && (
              <p
                className={`text-sm ${isExpirationWarning(medication.expirationDate) ? "text-orange-500 font-medium" : "text-gray-500"}`}
              >
                Expires: {format(new Date(medication.expirationDate), "MMM d, yyyy")}
                {isExpired(medication.expirationDate) && " (EXPIRED)"}
              </p>
            )}
            <p className="text-sm text-gray-500">Frequency: {medication.frequency}</p>
            {medication.repeat && (
              <p className="text-sm text-gray-500">Repeats every {medication.repeatInterval} days</p>
            )}
          </div>
          {!isCompleted && (
            <div className="flex space-x-2">
              <Button size="sm" variant="outline" onClick={() => handleOpenModal(medication)}>
                <Clock className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleDelete(medication.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleComplete(medication)}>
                <Check className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </Card>
    )
  }

  const currentMedication = medications.length > 0 ? "Current medications" : "No medications"

  return (
    <div className="flex flex-col min-h-screen bg-[#FFFFFF]">
      <PetHeader backTo="/" />
      <HealthTrackingLayout
        title="Medication"
        color="blue"
        icon={<Pill className="w-5 h-5" />}
        showCurrentValueCard={false} // Add this line to hide the Current Value Card
      >
        <div className="space-y-4">
          <Card className="p-4">
            <form id="add-medication-form" onSubmit={handleSubmit} className="space-y-4">
              <Input
                type="text"
                placeholder="Medication Name"
                value={medicationName}
                onChange={(e) => setMedicationName(e.target.value)}
                required
              />
              <Input type="date" value={medicationDate} onChange={(e) => setMedicationDate(e.target.value)} required />
              <Input
                type="time"
                value={medicationTime}
                onChange={(e) => setMedicationTime(e.target.value)}
                className="mt-2"
              />
              <Input
                type="text"
                placeholder="Frequency (e.g., Once daily)"
                value={medicationFrequency}
                onChange={(e) => setMedicationFrequency(e.target.value)}
                required
              />
              <div className="flex items-center space-x-2">
                <Switch id="medication-repeat" checked={medicationRepeat} onCheckedChange={setMedicationRepeat} />
                <Label htmlFor="medication-repeat">Repeat</Label>
              </div>
              {medicationRepeat && (
                <Input
                  type="number"
                  placeholder="Repeat every X days"
                  value={medicationRepeatInterval}
                  onChange={(e) => setMedicationRepeatInterval(e.target.value)}
                  required
                />
              )}
              <div className="mt-4">
                <label htmlFor="expiration-date" className="block text-sm font-medium text-gray-700 mb-1">
                  Expiration Date (optional)
                </label>
                <Input
                  id="expiration-date"
                  type="date"
                  value={expirationDate}
                  onChange={(e) => setExpirationDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                <Plus className="w-4 h-4 mr-2" />
                Add Medication
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
                <h3 className="font-medium text-gray-500 px-1">Upcoming Medications</h3>
                {loading ? (
                  <p className="text-center py-4">Loading medications...</p>
                ) : error ? (
                  <p className="text-red-500 text-center py-4">{error}</p>
                ) : medications.length > 0 ? (
                  medications.map((medication) => renderMedicationItem(medication))
                ) : (
                  <p className="text-center py-4 text-gray-500">No upcoming medications found</p>
                )}
              </div>
            </TabsContent>
            <TabsContent value="completed">
              <div className="space-y-2">
                <h3 className="font-medium text-gray-500 px-1">Completed Medications</h3>
                {loading ? (
                  <p className="text-center py-4">Loading completed medications...</p>
                ) : completedMedications.length > 0 ? (
                  completedMedications.map((medication) => renderMedicationItem(medication, true))
                ) : (
                  <p className="text-center py-4 text-gray-500">No completed medications found</p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </HealthTrackingLayout>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule Medication</DialogTitle>
            <DialogDescription>
              Choose a new date and time for {editingMedication?.name}. The new time must be in the future.
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
