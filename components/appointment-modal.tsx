"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { CalendarIcon, Loader2 } from "lucide-react"
import { format, parse, isValid } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { addDoc, collection, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useToast } from "@/hooks/use-toast"

interface AppointmentModalProps {
  isOpen: boolean
  onClose: () => void
  vetId: string
}

export function AppointmentModal({ isOpen, onClose, vetId }: AppointmentModalProps) {
  const { toast } = useToast()
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [dateInput, setDateInput] = useState(format(new Date(), "MM/dd/yyyy"))
  const [time, setTime] = useState("09:00")
  const [clientName, setClientName] = useState("")
  const [petName, setPetName] = useState("")
  const [petType, setPetType] = useState("")
  const [appointmentType, setAppointmentType] = useState("Check-up")
  const [notes, setNotes] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)

  // Update dateInput when date changes (from calendar)
  useEffect(() => {
    if (date) {
      setDateInput(format(date, "MM/dd/yyyy"))
    }
  }, [date])

  // Update date when dateInput changes (from manual input)
  const handleDateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setDateInput(value)

    // Try to parse the date
    try {
      const parsedDate = parse(value, "MM/dd/yyyy", new Date())
      if (isValid(parsedDate)) {
        setDate(parsedDate)
      }
    } catch (error) {
      // Invalid date format, don't update date
    }
  }

  const appointmentTypes = ["Check-up", "Vaccination", "Surgery", "Dental", "Follow-up", "Emergency", "Other"]

  const timeSlots = Array.from({ length: 18 }, (_, i) => {
    const hour = Math.floor(i / 2) + 9 // Start at 9 AM
    const minute = i % 2 === 0 ? "00" : "30"
    const formattedHour = hour > 12 ? hour - 12 : hour
    const period = hour >= 12 ? "PM" : "AM"
    return {
      value: `${hour.toString().padStart(2, "0")}:${minute}`,
      label: `${formattedHour}:${minute} ${period}`,
    }
  })

  const resetForm = () => {
    const now = new Date()
    setDate(now)
    setDateInput(format(now, "MM/dd/yyyy"))
    setTime("09:00")
    setClientName("")
    setPetName("")
    setPetType("")
    setAppointmentType("Check-up")
    setNotes("")
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleSubmit = async () => {
    if (!date || !time || !clientName || !petName || !appointmentType) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSubmitting(true)

      // Create appointment date by combining the selected date and time
      const [hours, minutes] = time.split(":").map(Number)
      const appointmentDate = new Date(date)
      appointmentDate.setHours(hours, minutes, 0, 0)

      // Add appointment to Firestore
      await addDoc(collection(db, "appointments"), {
        vetId,
        clientName,
        petName,
        petType,
        appointmentType,
        notes,
        appointmentDate,
        createdAt: serverTimestamp(),
        status: "scheduled",
      })

      toast({
        title: "Appointment scheduled",
        description: `Appointment for ${petName} on ${format(appointmentDate, "PPP")} at ${format(appointmentDate, "h:mm a")} has been scheduled.`,
      })

      handleClose()
    } catch (error) {
      console.error("Error adding appointment:", error)
      toast({
        title: "Error",
        description: "There was an error scheduling the appointment. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Schedule New Appointment</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Date Picker with Manual Input */}
            <div className="grid gap-2">
              <Label htmlFor="date" className="text-left">
                Date *
              </Label>
              <div className="flex">
                <Input
                  id="date"
                  value={dateInput}
                  onChange={handleDateInputChange}
                  placeholder="MM/DD/YYYY"
                  className="rounded-r-none"
                />
                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="rounded-l-none border-l-0 px-3"
                      onClick={() => setIsCalendarOpen(true)}
                    >
                      <CalendarIcon className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={(newDate) => {
                        setDate(newDate)
                        setIsCalendarOpen(false)
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <p className="text-xs text-gray-500">Format: MM/DD/YYYY</p>
            </div>

            {/* Time Picker */}
            <div className="grid gap-2">
              <Label htmlFor="time" className="text-left">
                Time *
              </Label>
              <Select value={time} onValueChange={setTime}>
                <SelectTrigger id="time" className="w-full">
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.map((slot) => (
                    <SelectItem key={slot.value} value={slot.value}>
                      {slot.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Client Name */}
          <div className="grid gap-2">
            <Label htmlFor="clientName" className="text-left">
              Client Name *
            </Label>
            <Input
              id="clientName"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Enter client name"
            />
          </div>

          {/* Pet Information */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="petName" className="text-left">
                Pet Name *
              </Label>
              <Input
                id="petName"
                value={petName}
                onChange={(e) => setPetName(e.target.value)}
                placeholder="Enter pet name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="petType" className="text-left">
                Pet Type/Breed
              </Label>
              <Input
                id="petType"
                value={petType}
                onChange={(e) => setPetType(e.target.value)}
                placeholder="E.g., Dog, Cat, etc."
              />
            </div>
          </div>

          {/* Appointment Type */}
          <div className="grid gap-2">
            <Label htmlFor="appointmentType" className="text-left">
              Appointment Type *
            </Label>
            <Select value={appointmentType} onValueChange={setAppointmentType}>
              <SelectTrigger id="appointmentType">
                <SelectValue placeholder="Select appointment type" />
              </SelectTrigger>
              <SelectContent>
                {appointmentTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="grid gap-2">
            <Label htmlFor="notes" className="text-left">
              Notes
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional notes here"
              className="min-h-[80px]"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Scheduling...
              </>
            ) : (
              "Schedule Appointment"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
