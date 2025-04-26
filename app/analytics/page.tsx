"use client"

import { useState, useEffect, useCallback } from "react"
import { PetHeader } from "@/components/pet-header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar } from "@/components/analytics/calendar"
import { HealthCharts } from "@/components/analytics/health-charts"
import { ActivitySummary } from "@/components/analytics/activity-summary"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/contexts/AuthContext"
import { useSelectedPet } from "@/contexts/PetContext"
import { db } from "@/firebase"
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore"
import { Spinner } from "@/components/ui/spinner"
import { PageHeader } from "@/components/page-header"
import { PremiumBanner } from "@/components/premium-banner"

interface HealthRecord {
  id: string
  date: string
  weight: number
  activityLevel: number
  foodIntake: string
  sleepDuration: number
  behavior: string
  notes: string
  medications?: any[]
  vaccinations?: any[]
}

export default function AnalyticsPage() {
  const { user } = useAuth()
  const { selectedPet } = useSelectedPet()
  const [date, setDate] = useState<Date>(new Date())
  const [healthRecords, setHealthRecords] = useState<HealthRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dataFetched, setDataFetched] = useState(false)

  const fetchHealthRecords = useCallback(async () => {
    if (!user || !selectedPet) {
      setHealthRecords([])
      setLoading(false)
      return []
    }
    setLoading(true)
    try {
      // Fetch health records
      const healthQuery = query(
        collection(db, "healthRecords"),
        where("userId", "==", user.uid),
        where("petId", "==", selectedPet.id),
        orderBy("date", "desc"),
        limit(30), // Get more records for analytics
      )

      // Fetch medications
      const medicationsQuery = query(
        collection(db, "medications"),
        where("userId", "==", user.uid),
        where("petId", "==", selectedPet.id),
        orderBy("dueDate"),
        limit(10),
      )

      // Fetch vaccinations
      const vaccinationsQuery = query(
        collection(db, "vaccinations"),
        where("userId", "==", user.uid),
        where("petId", "==", selectedPet.id),
        orderBy("dueDate"),
        limit(10),
      )

      const [healthSnapshot, medicationsSnapshot, vaccinationsSnapshot] = await Promise.all([
        getDocs(healthQuery),
        getDocs(medicationsQuery),
        getDocs(vaccinationsQuery),
      ])

      const records: HealthRecord[] = []
      healthSnapshot.forEach((doc) => {
        records.push({ id: doc.id, ...doc.data() } as HealthRecord)
      })

      // Add medications and vaccinations to the first health record if it exists
      if (records.length > 0) {
        records[0].medications = []
        records[0].vaccinations = []

        medicationsSnapshot.forEach((doc) => {
          records[0].medications?.push({ id: doc.id, ...doc.data() })
        })

        vaccinationsSnapshot.forEach((doc) => {
          records[0].vaccinations?.push({ id: doc.id, ...doc.data() })
        })
      }

      setHealthRecords(records)
      setDataFetched(true)
      setLoading(false)
      return records
    } catch (error) {
      console.error("Error fetching health records:", error)
      setError("Failed to fetch health records. Please try again later.")
      setHealthRecords([])
      setLoading(false)
      return []
    }
  }, [user, selectedPet])

  useEffect(() => {
    if (user && selectedPet) {
      fetchHealthRecords()
    } else {
      // Clear data when user or pet is not selected
      setHealthRecords([])
      setLoading(false)
    }
  }, [user, selectedPet, fetchHealthRecords])

  // Convert health records to the format needed for charts
  const convertToChartData = useCallback(() => {
    const weightData = healthRecords
      .filter((record) => record.weight)
      .map((record) => ({
        id: record.id,
        date: record.date,
        value: record.weight,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    const sleepData = healthRecords
      .filter((record) => record.sleepDuration)
      .map((record) => ({
        id: record.id,
        date: record.date,
        value: record.sleepDuration,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    const activityData = healthRecords
      .filter((record) => record.activityLevel)
      .map((record) => ({
        id: record.id,
        date: record.date,
        value: record.activityLevel,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    const foodData = healthRecords
      .filter((record) => record.foodIntake)
      .map((record) => ({
        id: record.id,
        date: record.date,
        value: record.foodIntake,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    const behaviorData = healthRecords
      .filter((record) => record.behavior)
      .map((record) => ({
        id: record.id,
        date: record.date,
        value: record.behavior,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    return {
      weight: weightData,
      sleep: sleepData,
      activity: activityData,
      food: foodData,
      behavior: behaviorData,
      analyses: [],
    }
  }, [healthRecords])

  const healthData = convertToChartData()

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <PetHeader />
        <div className="flex justify-center items-center h-[60vh]">
          <Spinner size="lg" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-6">
        <PetHeader />
        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button onClick={() => fetchHealthRecords()} className="px-4 py-2 bg-primary text-white rounded-md">
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-white to-gray-50">
      <PageHeader title="Analytics" />
      <PetHeader />

      {selectedPet && <PremiumBanner className="mb-6" />}

      <div className="container mx-auto px-4 pb-12">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-3 mb-8 rounded-lg bg-gray-100 p-1">
            <TabsTrigger
              value="overview"
              className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="calendar"
              className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              Calendar
            </TabsTrigger>
            <TabsTrigger
              value="charts"
              className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              Charts
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-8">
            <Card className="overflow-hidden border-none shadow-md">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 pb-8">
                <CardTitle className="text-2xl font-bold text-gray-800">Activity Summary</CardTitle>
                <CardDescription className="text-gray-600">
                  Overview of {selectedPet?.name || "your pet's"} health and activity
                </CardDescription>
              </CardHeader>
              <CardContent className="px-6 py-8">
                <ActivitySummary data={healthData} />
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card className="overflow-hidden border-none shadow-md">
                <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
                  <CardTitle className="text-xl font-bold text-gray-800">Recent Activities</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <Calendar data={healthData} selectedDate={date} onDateChange={setDate} view="list" />
                </CardContent>
              </Card>

              <Card className="overflow-hidden border-none shadow-md">
                <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
                  <CardTitle className="text-xl font-bold text-gray-800">Weight Trend</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="h-[300px]">
                    {healthData.weight.length > 0 ? (
                      <HealthCharts data={healthData.weight} type="weight" />
                    ) : (
                      <div className="flex justify-center items-center h-full text-muted-foreground">
                        <div className="text-center">
                          <p className="text-gray-500 mb-2">No weight data available</p>
                          <p className="text-sm text-gray-400">Track your pet's weight to see trends here</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="calendar">
            <Card className="overflow-hidden border-none shadow-md">
              <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50">
                <CardTitle className="text-2xl font-bold text-gray-800">Health Calendar</CardTitle>
                <CardDescription className="text-gray-600">View all health events and analyses by date</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <Calendar data={healthData} selectedDate={date} onDateChange={setDate} view="calendar" />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="charts" className="space-y-8">
            <Card className="overflow-hidden border-none shadow-md">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50">
                <CardTitle className="text-xl font-bold text-gray-800">Weight Tracking</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="h-[300px]">
                  {healthData.weight.length > 0 ? (
                    <HealthCharts data={healthData.weight} type="weight" />
                  ) : (
                    <div className="flex justify-center items-center h-full">
                      <div className="text-center">
                        <p className="text-gray-500 mb-2">No weight data available</p>
                        <p className="text-sm text-gray-400">Track your pet's weight to see trends here</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-none shadow-md">
              <CardHeader className="bg-gradient-to-r from-indigo-50 to-violet-50">
                <CardTitle className="text-xl font-bold text-gray-800">Sleep Tracking</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="h-[300px]">
                  {healthData.sleep.length > 0 ? (
                    <HealthCharts data={healthData.sleep} type="sleep" />
                  ) : (
                    <div className="flex justify-center items-center h-full">
                      <div className="text-center">
                        <p className="text-gray-500 mb-2">No sleep data available</p>
                        <p className="text-sm text-gray-400">Track your pet's sleep to see trends here</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-none shadow-md">
              <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50">
                <CardTitle className="text-xl font-bold text-gray-800">Activity Tracking</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="h-[300px]">
                  {healthData.activity.length > 0 ? (
                    <HealthCharts data={healthData.activity} type="activity" />
                  ) : (
                    <div className="flex justify-center items-center h-full">
                      <div className="text-center">
                        <p className="text-gray-500 mb-2">No activity data available</p>
                        <p className="text-sm text-gray-400">Track your pet's activity to see trends here</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
