"use client"

import { useState, useEffect, useCallback, Suspense } from "react"
import { useAuth } from "../../contexts/AuthContext"
import { useSelectedPet } from "../../contexts/PetContext"
import { db } from "../../lib/firebase"
import { collection, query, where, getDocs, orderBy } from "firebase/firestore"
import { PageHeader } from "../../components/page-header"
import { PetHeader } from "../../components/pet-header"
import Navigation from "../../components/navigation"
import { Calendar, momentLocalizer } from "react-big-calendar"
import moment from "moment"
import "react-big-calendar/lib/css/react-big-calendar.css"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { format, isValid } from "date-fns"
import { motion, AnimatePresence } from "framer-motion"
import { Skeleton } from "@/components/ui/skeleton"
import { ChevronLeft, ChevronRight, Syringe } from "lucide-react"
import { useSwipeable } from "react-swipeable"
import { useMediaQuery } from "@/hooks/use-media-query"
import { Badge } from "@/components/ui/badge"

// Setup the localizer for react-big-calendar
const localizer = momentLocalizer(moment)

interface CalendarEvent {
  title: string
  start: Date
  end: Date
  allDay?: boolean
  resource?: {
    type: "healthRecord" | "vaccination"
    data: HealthRecord | Vaccination
  }
}

interface HealthRecord {
  id: string
  date: string
  weight: number
  activityLevel: number
  sleepDuration: number
}

interface Vaccination {
  id: string
  name: string
  dueDate: string
  administeredDate?: string
  petId: string
  userId: string
}

const chartTypes = ["weight", "activity", "sleep"] as const
type ChartType = (typeof chartTypes)[number]

function HistoryContent() {
  const { user } = useAuth()
  const { selectedPet } = useSelectedPet()
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [healthRecords, setHealthRecords] = useState<HealthRecord[]>([])
  const [vaccinations, setVaccinations] = useState<Vaccination[]>([])
  const [activeTab, setActiveTab] = useState("charts")
  const [activeChart, setActiveChart] = useState<ChartType>("weight")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isMobile = useMediaQuery("(max-width: 768px)")

  const handlers = useSwipeable({
    onSwipedLeft: () => {
      const currentIndex = chartTypes.indexOf(activeChart)
      if (currentIndex < chartTypes.length - 1) {
        setActiveChart(chartTypes[currentIndex + 1])
      }
    },
    onSwipedRight: () => {
      const currentIndex = chartTypes.indexOf(activeChart)
      if (currentIndex > 0) {
        setActiveChart(chartTypes[currentIndex - 1])
      }
    },
    preventDefaultTouchmoveEvent: true,
    trackMouse: true,
  })

  const fetchData = useCallback(async () => {
    if (!user || !selectedPet) return

    setIsLoading(true)
    setError(null)

    try {
      const healthRecordsQuery = query(
        collection(db, "healthRecords"),
        where("userId", "==", user.uid),
        where("petId", "==", selectedPet.id),
        orderBy("date"),
      )

      const vaccinationsQuery = query(
        collection(db, "vaccinations"),
        where("userId", "==", user.uid),
        where("petId", "==", selectedPet.id),
        orderBy("dueDate"),
      )

      const medicationsQuery = query(
        collection(db, "medications"),
        where("userId", "==", user.uid),
        where("petId", "==", selectedPet.id),
        orderBy("dueDate"),
      )

      const [healthRecordsSnapshot, vaccinationsSnapshot, medicationsSnapshot] = await Promise.all([
        getDocs(healthRecordsQuery),
        getDocs(vaccinationsQuery),
        getDocs(medicationsQuery),
      ])

      const calendarEvents: CalendarEvent[] = []
      const records: HealthRecord[] = []

      healthRecordsSnapshot.forEach((doc) => {
        const record = doc.data() as HealthRecord
        records.push({ ...record, id: doc.id })
        calendarEvents.push({
          title: "Health Record",
          start: new Date(record.date),
          end: new Date(record.date),
          allDay: true,
          resource: { type: "healthRecord", data: record },
        })
      })

      vaccinationsSnapshot.forEach((doc) => {
        const vaccination = doc.data() as Vaccination
        calendarEvents.push({
          title: `Vaccination: ${vaccination.name}`,
          start: new Date(vaccination.dueDate),
          end: new Date(vaccination.dueDate),
          allDay: true,
          resource: { type: "vaccination", data: vaccination },
        })
      })

      medicationsSnapshot.forEach((doc) => {
        const medication = doc.data()
        calendarEvents.push({
          title: `Medication: ${medication.name}`,
          start: new Date(medication.dueDate),
          end: new Date(medication.dueDate),
          allDay: true,
          resource: { type: "medication", data: medication },
        })
      })

      setEvents(calendarEvents)
      setHealthRecords(records.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()))
    } catch (error) {
      console.error("Error fetching data:", error)
      setError("Failed to load data. Pull down to refresh.")
    } finally {
      setIsLoading(false)
    }
  }, [user, selectedPet])

  const fetchVaccinations = useCallback(async () => {
    if (!user || !selectedPet) return

    try {
      const q = query(
        collection(db, "vaccinations"),
        where("userId", "==", user.uid),
        where("petId", "==", selectedPet.id),
        orderBy("dueDate", "desc"),
      )
      const querySnapshot = await getDocs(q)
      const fetchedVaccinations: Vaccination[] = []
      querySnapshot.forEach((doc) => {
        const data = doc.data() as Vaccination
        if (isValid(new Date(data.dueDate))) {
          fetchedVaccinations.push({ id: doc.id, ...data })
        } else {
          console.warn(`Invalid dueDate for vaccination ${doc.id}: ${data.dueDate}`)
        }
      })
      setVaccinations(fetchedVaccinations)
    } catch (error) {
      console.error("Error fetching vaccinations:", error)
      if (error instanceof Error) {
        console.error("Error name:", error.name)
        console.error("Error message:", error.message)
      }
      setError("Failed to fetch vaccinations. Please try again later.")
    }
  }, [user, selectedPet])

  useEffect(() => {
    if (user && selectedPet) {
      fetchData()
      fetchVaccinations()
    } else {
      setHealthRecords([])
      setVaccinations([])
    }
  }, [user, selectedPet, fetchData, fetchVaccinations])

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const date = new Date(label)
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/10 backdrop-blur-md p-4 rounded-lg border border-white/20 shadow-xl"
        >
          <p className="text-white font-medium">{isValid(date) ? format(date, "MMM d, yyyy") : "Invalid Date"}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-white/80">
              {entry.name === "weight" && `Weight: ${entry.value} kg`}
              {entry.name === "activityLevel" && `Activity: ${entry.value}/10`}
              {entry.name === "sleepDuration" && `Sleep: ${entry.value} hours`}
            </p>
          ))}
        </motion.div>
      )
    }
    return null
  }

  const renderChart = (type: ChartType) => {
    const chartConfig = {
      weight: {
        title: "Weight Progression",
        dataKey: "weight",
        color: "#8884d8",
        gradient: ["#8884d8", "#4834d4"],
        unit: "kg",
        domain: ["auto", "auto"] as const,
      },
      activity: {
        title: "Activity Level",
        dataKey: "activityLevel",
        color: "#4CAF50",
        gradient: ["#4CAF50", "#2E7D32"],
        unit: "/10",
        domain: [0, 10] as const,
      },
      sleep: {
        title: "Sleep Duration",
        dataKey: "sleepDuration",
        color: "#FFC107",
        gradient: ["#FFC107", "#FFA000"],
        unit: " hours",
        domain: [0, 24] as const,
      },
    }

    const config = chartConfig[type]

    return (
      <motion.div
        key={type}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3 }}
        className="h-[400px] md:h-[500px] w-full"
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={healthRecords} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <defs>
              <linearGradient id={`gradient-${type}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={config.gradient[0]} stopOpacity={0.8} />
                <stop offset="95%" stopColor={config.gradient[1]} stopOpacity={0.2} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis
              dataKey="date"
              tickFormatter={(dateString) => {
                const date = new Date(dateString)
                return isValid(date) ? format(date, isMobile ? "M/d" : "MMM d") : "Invalid"
              }}
              stroke="rgba(255,255,255,0.5)"
              fontSize={12}
              tickMargin={8}
            />
            <YAxis stroke="rgba(255,255,255,0.5)" domain={config.domain} fontSize={12} tickMargin={8} />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(255,255,255,0.2)" }} />
            <Line
              type="monotone"
              dataKey={config.dataKey}
              stroke={config.color}
              strokeWidth={3}
              dot={{ fill: config.color, strokeWidth: 2, r: 6, stroke: "#000" }}
              activeDot={{ r: 8, stroke: "#fff", strokeWidth: 2 }}
              fill={`url(#gradient-${type})`}
              animationDuration={1000}
              animationEasing="ease-in-out"
            />
          </LineChart>
        </ResponsiveContainer>
      </motion.div>
    )
  }

  const ChartNavigation = () => (
    <div className="flex items-center justify-between mb-4">
      <button
        onClick={() => {
          const currentIndex = chartTypes.indexOf(activeChart)
          if (currentIndex > 0) {
            setActiveChart(chartTypes[currentIndex - 1])
          }
        }}
        className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-50"
        disabled={chartTypes.indexOf(activeChart) === 0}
      >
        <ChevronLeft className="w-6 h-6 text-white" />
      </button>
      <h3 className="text-xl font-semibold text-white">
        {activeChart === "weight" && "Weight Progression"}
        {activeChart === "activity" && "Activity Level"}
        {activeChart === "sleep" && "Sleep Duration"}
      </h3>
      <button
        onClick={() => {
          const currentIndex = chartTypes.indexOf(activeChart)
          if (currentIndex < chartTypes.length - 1) {
            setActiveChart(chartTypes[currentIndex + 1])
          }
        }}
        className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-50"
        disabled={chartTypes.indexOf(activeChart) === chartTypes.length - 1}
      >
        <ChevronRight className="w-6 h-6 text-white" />
      </button>
    </div>
  )

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="charts">Charts</TabsTrigger>
        <TabsTrigger value="calendar">Calendar</TabsTrigger>
        <TabsTrigger value="vaccinations">Vaccinations</TabsTrigger>
      </TabsList>

      <TabsContent value="charts" className="space-y-4">
        <Card className="bg-black text-white overflow-hidden">
          <CardHeader className="border-b border-white/10">
            <CardTitle>
              <ChartNavigation />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-[400px] w-full bg-white/10" />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-[400px] text-center">
                <p className="text-white/80 mb-4">{error}</p>
                <button
                  onClick={fetchData}
                  className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                >
                  Try Again
                </button>
              </div>
            ) : (
              <div {...handlers}>
                <AnimatePresence mode="wait">{renderChart(activeChart)}</AnimatePresence>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="calendar">
        <Card>
          <CardContent className="p-0 sm:p-6">
            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              style={{ height: 500 }}
              views={["month"]}
              className="rounded-lg overflow-hidden"
              eventPropGetter={(event) => ({
                className: event.resource?.type === "vaccination" ? "bg-blue-500" : "bg-green-500",
              })}
            />
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="vaccinations">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Syringe className="w-6 h-6 mr-2" />
              Vaccination History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {vaccinations.length > 0 ? (
              <ul className="space-y-4">
                {vaccinations.map((vaccination) => {
                  const dueDate = new Date(vaccination.dueDate)
                  const administeredDate = vaccination.administeredDate ? new Date(vaccination.administeredDate) : null
                  return (
                    <li key={vaccination.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{vaccination.name}</p>
                        <p className="text-sm text-gray-500">
                          Due: {isValid(dueDate) ? format(dueDate, "MMMM d, yyyy") : "Invalid Date"}
                        </p>
                      </div>
                      {administeredDate ? (
                        <Badge variant="success">
                          Administered on{" "}
                          {isValid(administeredDate) ? format(administeredDate, "MMMM d, yyyy") : "Invalid Date"}
                        </Badge>
                      ) : (
                        <Badge variant="warning">Pending</Badge>
                      )}
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p>No vaccination records found.</p>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}

export default function HistoryPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#FFFFFF]">
      <PageHeader title="History" />
      <PetHeader />
      <main className="flex-grow flex flex-col items-center p-4 md:p-6">
        <Suspense
          fallback={
            <div className="w-full max-w-4xl">
              <Card>
                <CardContent>
                  <Skeleton className="h-[500px] w-full" />
                </CardContent>
              </Card>
            </div>
          }
        >
          <HistoryContent />
        </Suspense>
      </main>
      <Navigation />
    </div>
  )
}
