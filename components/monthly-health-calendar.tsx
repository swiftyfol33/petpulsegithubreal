"use client"

import type React from "react"

import { useState, useEffect } from "react"
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addDays,
  isBefore,
  parseISO,
} from "date-fns"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import {
  Weight,
  Moon,
  Utensils,
  Smile,
  Activity,
  Pill,
  Syringe,
  ChevronDown,
  ChevronUp,
  Check,
  Clock,
  Trash2,
} from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { useSelectedPet } from "@/contexts/PetContext"
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs, orderBy, updateDoc, doc, deleteDoc } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { toast } from "react-hot-toast"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useMediaQuery } from "@/hooks/use-media-query"

interface ActivityType {
  type: "weight" | "sleep" | "food" | "behavior" | "activity" | "medication" | "vaccine"
  color: string
  label: string
  icon: React.ReactNode
}

interface Activity extends ActivityType {
  value?: string | number
  date?: string
  repeat?: boolean
  repeatInterval?: number
}

interface TimelineEvent {
  time: Date
  type: "weight" | "sleep" | "food" | "behavior" | "activity" | "medication" | "vaccine"
  value: string | number
  id: string
}

interface TodoItem {
  id: string
  type: "medication" | "vaccine"
  name: string
  dueDate: Date
  repeat?: boolean
  repeatInterval?: number
  completed?: boolean
}

const ACTIVITIES: ActivityType[] = [
  { type: "weight", color: "text-blue-500", label: "Weight", icon: <Weight className="w-4 h-4" /> },
  { type: "sleep", color: "text-purple-500", label: "Sleep", icon: <Moon className="w-4 h-4" /> },
  { type: "food", color: "text-orange-500", label: "Food", icon: <Utensils className="w-4 h-4" /> },
  { type: "behavior", color: "text-pink-500", label: "Behavior", icon: <Smile className="w-4 h-4" /> },
  { type: "activity", color: "text-green-500", label: "Activity", icon: <Activity className="w-4 h-4" /> },
  { type: "medication", color: "text-red-500", label: "Medication", icon: <Pill className="w-4 h-4" /> },
  { type: "vaccine", color: "text-yellow-500", label: "Vaccine", icon: <Syringe className="w-4 h-4" /> },
]

interface TimelineEventProps {
  event: TimelineEvent
}

const TimelineEvent: React.FC<TimelineEventProps> = ({ event }) => {
  const activity = ACTIVITIES.find((a) => a.type === event.type)

  if (!activity) {
    return null
  }

  return (
    <div className="flex items-center space-x-3">
      <div className={`p-1 rounded-full ${activity.color} bg-opacity-20`}>{activity.icon}</div>
      <div>
        <p className="text-sm font-medium text-gray-700">{event.value}</p>
        <p className="text-xs text-gray-500">{format(event.time, "h:mm a")}</p>
      </div>
    </div>
  )
}

export function MonthlyHealthCalendar() {
  const { user } = useAuth()
  const { selectedPet } = useSelectedPet()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [activities, setActivities] = useState<Map<string, Set<string>>>(new Map())
  const [selectedDay, setSelectedDay] = useState<Date>(new Date())
  const [loading, setLoading] = useState(true)
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([])
  const [isTimelineExpanded, setIsTimelineExpanded] = useState(false)
  const [todoItems, setTodoItems] = useState<TodoItem[]>([])

  const router = useRouter()
  const isWide = useMediaQuery("(min-width: 800px)")

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<TodoItem | null>(null)
  const [newDateTime, setNewDateTime] = useState("")

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

  useEffect(() => {
    if (user && selectedPet) {
      fetchActivities()
    }
  }, [user, selectedPet])

  useEffect(() => {
    if (user && selectedPet) {
      handleDayClick(selectedDay)
    }
  }, [user, selectedPet, selectedDay])

  const fetchActivities = async () => {
    if (!user || !selectedPet) return

    setLoading(true)
    const activitiesMap = new Map<string, Set<string>>()

    try {
      const healthRecordsRef = collection(db, "healthRecords")
      const medicationsRef = collection(db, "medications")
      const vaccinationsRef = collection(db, "vaccinations")

      const [healthRecordsSnapshot, medicationsSnapshot, vaccinationsSnapshot] = await Promise.all([
        getDocs(
          query(
            healthRecordsRef,
            where("userId", "==", user.uid),
            where("petId", "==", selectedPet.id),
            orderBy("date"),
          ),
        ),
        getDocs(
          query(
            medicationsRef,
            where("userId", "==", user.uid),
            where("petId", "==", selectedPet.id),
            orderBy("dueDate"),
          ),
        ),
        getDocs(
          query(
            vaccinationsRef,
            where("userId", "==", user.uid),
            where("petId", "==", selectedPet.id),
            orderBy("dueDate"),
          ),
        ),
      ])

      healthRecordsSnapshot.forEach((doc) => {
        const data = doc.data()
        const date = format(new Date(data.date), "yyyy-MM-dd")
        const dayActivities = activitiesMap.get(date) || new Set()

        if (data.weight) dayActivities.add("weight")
        if (data.sleepDuration) dayActivities.add("sleep")
        if (data.foodIntake) dayActivities.add("food")
        if (data.behavior) dayActivities.add("behavior")
        if (data.activityLevel) dayActivities.add("activity")

        activitiesMap.set(date, dayActivities)
      })

      const todoItems: TodoItem[] = []

      medicationsSnapshot.forEach((doc) => {
        const data = doc.data()
        if (!data.completed) {
          todoItems.push({
            id: doc.id,
            type: "medication",
            name: data.name,
            dueDate: new Date(data.dueDate),
            repeat: data.repeat,
            repeatInterval: data.repeatInterval,
            completed: data.completed,
          })

          if (data.dueDate) {
            let currentDate = new Date(data.dueDate)
            while (currentDate <= monthEnd) {
              const dateKey = format(currentDate, "yyyy-MM-dd")
              const dayActivities = activitiesMap.get(dateKey) || new Set()
              dayActivities.add("medication")
              activitiesMap.set(dateKey, dayActivities)

              if (data.repeat && data.repeatInterval) {
                currentDate = addDays(currentDate, data.repeatInterval)
              } else {
                break
              }
            }
          }
        }
      })

      vaccinationsSnapshot.forEach((doc) => {
        const data = doc.data()
        if (!data.completed) {
          todoItems.push({
            id: doc.id,
            type: "vaccine",
            name: data.name,
            dueDate: new Date(data.dueDate),
            repeat: data.repeat,
            repeatInterval: data.repeatInterval,
            completed: data.completed,
          })

          if (data.dueDate) {
            let currentDate = new Date(data.dueDate)
            while (currentDate <= monthEnd) {
              const dateKey = format(currentDate, "yyyy-MM-dd")
              const dayActivities = activitiesMap.get(dateKey) || new Set()
              dayActivities.add("vaccine")
              activitiesMap.set(dateKey, dayActivities)

              if (data.repeat && data.repeatInterval) {
                currentDate = addDays(currentDate, data.repeatInterval)
              } else {
                break
              }
            }
          }
        }
      })

      setActivities(activitiesMap)
      setTodoItems(todoItems.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime()))
    } catch (error) {
      console.error("Error fetching health records:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDayClick = async (day: Date) => {
    setSelectedDay(day)
    const dateKey = format(day, "yyyy-MM-dd")

    if (user && selectedPet) {
      const healthRecordsRef = collection(db, "healthRecords")
      const medicationsRef = collection(db, "medications")
      const vaccinationsRef = collection(db, "vaccinations")

      const startOfDay = new Date(dateKey)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(dateKey)
      endOfDay.setHours(23, 59, 59, 999)

      const [healthRecordsSnapshot, medicationsSnapshot, vaccinationsSnapshot] = await Promise.all([
        getDocs(
          query(
            healthRecordsRef,
            where("userId", "==", user.uid),
            where("petId", "==", selectedPet.id),
            where("date", ">=", startOfDay.toISOString()),
            where("date", "<=", endOfDay.toISOString()),
            orderBy("date", "desc"),
          ),
        ),
        getDocs(query(medicationsRef, where("userId", "==", user.uid), where("petId", "==", selectedPet.id))),
        getDocs(query(vaccinationsRef, where("userId", "==", user.uid), where("petId", "==", selectedPet.id))),
      ])

      const events: TimelineEvent[] = []

      healthRecordsSnapshot.forEach((doc) => {
        const data = doc.data()
        const recordDate = new Date(data.date)

        if (data.weight) {
          events.push({
            id: doc.id + "-weight",
            time: recordDate,
            type: "weight",
            value: `${data.weight} kg`,
          })
        }
        if (data.sleepDuration) {
          events.push({
            id: doc.id + "-sleep",
            time: recordDate,
            type: "sleep",
            value: `${data.sleepDuration} hours`,
          })
        }
        if (data.foodIntake) {
          events.push({
            id: doc.id + "-food",
            time: recordDate,
            type: "food",
            value: data.foodIntake,
          })
        }
        if (data.behavior) {
          events.push({
            id: doc.id + "-behavior",
            time: recordDate,
            type: "behavior",
            value: data.behavior,
          })
        }
        if (data.activityLevel) {
          events.push({
            id: doc.id + "-activity",
            time: recordDate,
            type: "activity",
            value: `${data.activityLevel}/10`,
          })
        }
      })

      medicationsSnapshot.forEach((doc) => {
        const data = doc.data()
        if (isActivityDueOnDate(data, day)) {
          const dueDateTime = new Date(data.dueDate)
          events.push({
            id: doc.id,
            time: dueDateTime,
            type: "medication",
            value: `${data.name} (${format(dueDateTime, "h:mm a")})`,
          })
        }
      })

      vaccinationsSnapshot.forEach((doc) => {
        const data = doc.data()
        if (isActivityDueOnDate(data, day)) {
          const dueDateTime = new Date(data.dueDate)
          events.push({
            id: doc.id,
            time: dueDateTime,
            type: "vaccine",
            value: `${data.name} (${format(dueDateTime, "h:mm a")})`,
          })
        }
      })

      setTimelineEvents(events)
    }
  }

  const isActivityDueOnDate = (activity: any, date: Date) => {
    const activityDate = new Date(activity.dueDate)
    if (isSameDay(activityDate, date)) {
      return true
    }
    if (activity.repeat && activity.repeatInterval) {
      const daysSinceStart = Math.floor((date.getTime() - activityDate.getTime()) / (1000 * 60 * 60 * 24))
      return daysSinceStart % activity.repeatInterval === 0 && daysSinceStart >= 0
    }
    return false
  }

  const handleOpenModal = (item: TodoItem) => {
    setEditingItem(item)
    setNewDateTime(format(item.dueDate, "yyyy-MM-dd'T'HH:mm"))
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingItem(null)
    setNewDateTime("")
  }

  const handleUpdateDateTime = async () => {
    if (!editingItem) return

    const newDate = parseISO(newDateTime)
    if (isBefore(newDate, new Date())) {
      toast.error("New date and time must be in the future")
      return
    }

    try {
      await updateDoc(doc(db, editingItem.type === "medication" ? "medications" : "vaccinations", editingItem.id), {
        dueDate: newDate.toISOString(),
      })
      setTodoItems((prev) =>
        prev
          .map((i) => (i.id === editingItem.id ? { ...i, dueDate: newDate } : i))
          .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime()),
      )
      toast.success(`${editingItem.type === "medication" ? "Medication" : "Vaccination"} rescheduled`)
      handleCloseModal()
      fetchActivities()
    } catch (error) {
      console.error("Error updating item:", error)
      toast.error("Failed to reschedule item")
    }
  }

  const handleComplete = async (item: TodoItem) => {
    try {
      if (item.repeat && item.repeatInterval) {
        const newDueDate = addDays(item.dueDate, item.repeatInterval)
        await updateDoc(doc(db, item.type === "medication" ? "medications" : "vaccinations", item.id), {
          dueDate: newDueDate.toISOString(),
          completed: true,
        })
        setTodoItems((prev) =>
          prev
            .map((i) => (i.id === item.id ? { ...i, dueDate: newDueDate, completed: true } : i))
            .filter((i) => !i.completed)
            .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime()),
        )
      } else {
        await deleteDoc(doc(db, item.type === "medication" ? "medications" : "vaccinations", item.id))
        setTodoItems((prev) => prev.filter((i) => i.id !== item.id))
      }
      toast.success(`${item.type === "medication" ? "Medication" : "Vaccination"} completed`)
      fetchActivities()
    } catch (error) {
      console.error("Error completing item:", error)
      toast.error("Failed to complete item")
    }
  }

  const handleDelay = async (item: TodoItem) => {
    try {
      const newDueDate = addDays(item.dueDate, 1)
      await updateDoc(doc(db, item.type === "medication" ? "medications" : "vaccinations", item.id), {
        dueDate: newDueDate.toISOString(),
      })
      setTodoItems((prev) =>
        prev
          .map((i) => (i.id === item.id ? { ...i, dueDate: newDueDate } : i))
          .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime()),
      )
      toast.success(`${item.type === "medication" ? "Medication" : "Vaccination"} delayed by 1 day`)
    } catch (error) {
      console.error("Error delaying item:", error)
      toast.error("Failed to delay item")
    }
  }

  const handleCancel = async (item: TodoItem) => {
    try {
      await deleteDoc(doc(db, item.type === "medication" ? "medications" : "vaccinations", item.id))
      setTodoItems((prev) => prev.filter((i) => i.id !== item.id))
      toast.success(`${item.type === "medication" ? "Medication" : "Vaccination"} cancelled`)
    } catch (error) {
      console.error("Error cancelling item:", error)
      toast.error("Failed to cancel item")
    }
  }

  const handleDelete = async (item: TodoItem) => {
    try {
      await deleteDoc(doc(db, item.type === "medication" ? "medications" : "vaccinations", item.id))
      setTodoItems((prev) => prev.filter((i) => i.id !== item.id))
      toast.success(`${item.type === "medication" ? "Medication" : "Vaccination"} deleted`)
      fetchActivities()
    } catch (error) {
      console.error("Error deleting item:", error)
      toast.error("Failed to delete item")
    }
  }

  const renderTodoItem = (item: TodoItem) => {
    const isOverdue = isBefore(item.dueDate, new Date())
    return (
      <motion.div
        key={item.id}
        layout
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        className={`bg-white rounded-lg shadow-md p-4 mb-2 ${isOverdue ? "border-l-4 border-red-500" : ""}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {item.type === "medication" ? (
              <Pill className="w-5 h-5 text-blue-500 mr-2" />
            ) : (
              <Syringe className="w-5 h-5 text-green-500 mr-2" />
            )}
            <div>
              <h4 className="font-semibold">{item.name}</h4>
              <p className="text-sm text-gray-500">
                {isOverdue ? "Overdue" : "Due"}: {format(item.dueDate, "MMM d, yyyy h:mm a")}
              </p>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button size="sm" variant="outline" onClick={() => handleOpenModal(item)}>
              <Clock className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleDelete(item)}>
              <Trash2 className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleComplete(item)}>
              <Check className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </motion.div>
    )
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="w-full mb-6">
      <h3 className="text-xl font-semibold text-gray-600 mb-4">Vaccination & Medication Tracking</h3>
      <Card className="w-full bg-white rounded-lg border mb-6 p-4">
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-lg font-semibold">Upcoming</h4>
        </div>
        <AnimatePresence>
          {todoItems.filter((item) => isBefore(item.dueDate, new Date())).map(renderTodoItem)}
          {todoItems.some((item) => isBefore(item.dueDate, new Date())) &&
            todoItems.some((item) => !isBefore(item.dueDate, new Date())) && (
              <div className="text-center text-gray-500 my-2">Today - {format(new Date(), "h:mm a")}</div>
            )}
          {todoItems.filter((item) => !isBefore(item.dueDate, new Date())).map(renderTodoItem)}
        </AnimatePresence>
        {todoItems.length === 0 && (
          <p className="text-gray-500 text-center py-4">No upcoming vaccinations or medications</p>
        )}
        <div className="mt-4 flex flex-col items-center space-y-4">
          <div className="flex justify-center space-x-4">
            <Link href="/vaccines?action=add" passHref>
              <Button variant="outline">
                <Syringe className="w-4 h-4 mr-2" />
                Add Vaccination
              </Button>
            </Link>
            <Link href="/medication?action=add" passHref>
              <Button variant="outline">
                <Pill className="w-4 h-4 mr-2" />
                Add Medication
              </Button>
            </Link>
          </div>
          <div className="flex justify-center space-x-4">
            <Button onClick={() => router.push("/vaccines")} variant="outline" size="sm">
              View All Vaccinations
            </Button>
            <Button onClick={() => router.push("/medication")} variant="outline" size="sm">
              View All Medications
            </Button>
          </div>
        </div>
      </Card>

      {/* Removed the ref from the timeline div */}
      <div>
        <h3 className="text-xl font-semibold text-gray-600 mb-4">{format(selectedDay, "MMMM d, yyyy")} Timeline</h3>
        <Card className="w-full bg-white rounded-lg border mb-6 p-4">
          <div className="space-y-2">
            {timelineEvents.length > 0 ? (
              <>
                <div className={cn("space-y-2", !isTimelineExpanded && "overflow-hidden")}>
                  {timelineEvents
                    .sort((a, b) => a.time.getTime() - b.time.getTime())
                    .slice(0, isTimelineExpanded ? undefined : 5)
                    .map((event) => (
                      <TimelineEvent key={event.id} event={event} />
                    ))}
                </div>
                {timelineEvents.length > 5 && (
                  <Button
                    variant="ghost"
                    className="w-full mt-4 text-blue-600 hover:text-blue-800"
                    onClick={() => setIsTimelineExpanded(!isTimelineExpanded)}
                  >
                    {isTimelineExpanded ? (
                      <>
                        Show Less <ChevronUp className="ml-2 h-4 w-4" />
                      </>
                    ) : (
                      <>
                        Show More ({timelineEvents.length - 5} more) <ChevronDown className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                )}
              </>
            ) : (
              <p className="text-gray-500 text-center py-4">No events or metrics recorded for this day</p>
            )}
          </div>
        </Card>
      </div>

      <h3 className="text-xl font-semibold text-gray-600 mb-4">{format(currentMonth, "MMMM yyyy")}</h3>

      <div className="grid grid-cols-7 mb-2">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="text-center text-sm font-medium text-gray-600">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: new Date(monthStart).getDay() }).map((_, index) => (
          <div key={`empty-${index}`} className="h-24" />
        ))}

        {days.map((day) => {
          const dateKey = format(day, "yyyy-MM-dd")
          const dayActivities = activities.get(dateKey) || new Set()
          const isToday = isSameDay(day, new Date())

          return (
            <Card
              key={dateKey}
              className={cn(
                "h-24 p-2 cursor-pointer hover:bg-gray-100 transition-colors",
                isToday
                  ? "bg-blue-50 border-blue-200 shadow-[inset_0px_-19px_50px_-20px_rgba(59,130,246,0.5)]"
                  : "bg-white",
                !isSameMonth(day, currentMonth) && "opacity-50",
                isSameDay(day, selectedDay) && "ring-2 ring-black",
              )}
              onClick={() => handleDayClick(day)}
            >
              <div className="h-full flex flex-col">
                <div className={cn("text-right mb-2", isToday && "font-bold text-blue-600")}>{format(day, "d")}</div>
                <div className="flex-grow grid grid-cols-3 gap-1">
                  {ACTIVITIES.map(
                    (activity) =>
                      dayActivities.has(activity.type) && (
                        <div
                          key={`${dateKey}-${activity.type}`}
                          className={cn(
                            "w-2 h-2 rounded-full",
                            isWide ? activity.color : activity.color.replace("text-", "bg-"),
                            isWide && "w-4 h-4",
                          )}
                        >
                          {isWide && activity.icon}
                        </div>
                      ),
                  )}
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-4">
        {ACTIVITIES.map((activity) => (
          <div key={activity.type} className="flex items-center gap-2">
            <div className={`${activity.color}`}>{activity.icon}</div>
            <span className="text-sm text-gray-600">{activity.label}</span>
          </div>
        ))}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule {editingItem?.type}</DialogTitle>
            <DialogDescription>
              Choose a new date and time for {editingItem?.name}. The new time must be in the future.
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
