"use client"

import { format, subDays, isSameDay } from "date-fns"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { Weight, Moon, Utensils, Smile, Activity } from "lucide-react"

interface DayData {
  date: Date
  weight?: number
  sleep?: number
  food?: string
  behavior?: string
  activity?: number
}

export function WeeklyHealthCalendar() {
  // Generate last 7 days
  const today = new Date()
  const last7Days = Array.from({ length: 7 }, (_, i) => subDays(today, 6 - i))

  // Mock data - in real app, this would come from your database
  const mockData: DayData[] = last7Days.map((date) => ({
    date,
    weight: Math.random() > 0.5 ? 10 + Math.random() * 2 : undefined,
    sleep: Math.random() > 0.5 ? 6 + Math.random() * 4 : undefined,
    food: Math.random() > 0.5 ? ["Normal", "High", "Low"][Math.floor(Math.random() * 3)] : undefined,
    behavior: Math.random() > 0.5 ? ["Happy", "Tired", "Energetic"][Math.floor(Math.random() * 3)] : undefined,
    activity: Math.random() > 0.5 ? Math.floor(Math.random() * 10) + 1 : undefined,
  }))

  return (
    <div className="w-full mb-6">
      <h3 className="text-xl font-semibold text-gray-600 mb-4">Weekly Overview</h3>
      <div className="grid grid-cols-7 gap-1">
        {mockData.map((day, index) => (
          <Card
            key={index}
            className={cn(
              "p-2 min-h-[120px]",
              isSameDay(day.date, today)
                ? "bg-blue-50 border-blue-200 shadow-[inset_0px_-19px_50px_-20px_rgba(59,130,246,0.5)]"
                : "bg-white",
            )}
          >
            <div className="text-center mb-2">
              <div className="text-sm font-medium">{format(day.date, "EEE")}</div>
              <div className="text-lg font-bold">{format(day.date, "d")}</div>
            </div>
            <div className="space-y-1">
              {day.weight && (
                <div className="flex items-center text-blue-600">
                  <Weight className="w-3 h-3" />
                </div>
              )}
              {day.sleep && (
                <div className="flex items-center text-purple-600">
                  <Moon className="w-3 h-3" />
                </div>
              )}
              {day.food && (
                <div className="flex items-center text-orange-600">
                  <Utensils className="w-3 h-3" />
                </div>
              )}
              {day.behavior && (
                <div className="flex items-center text-pink-600">
                  <Smile className="w-3 h-3" />
                </div>
              )}
              {day.activity && (
                <div className="flex items-center text-green-600">
                  <Activity className="w-3 h-3" />
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
