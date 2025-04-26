"use client"

import { useState } from "react"
import { format, addDays, startOfWeek } from "date-fns"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type React from "react"

interface HealthTrackingLayoutProps {
  title: string
  children: React.ReactNode
  currentValue?: string | number // Make currentValue optional
  unit?: string
  color: "blue" | "purple" | "green" | "orange" | "pink"
  icon: React.ReactNode
  showCurrentValueCard?: boolean // Add this prop to control the visibility of the card
}

const colorStyles = {
  blue: "bg-blue-50 text-blue-700",
  purple: "bg-purple-50 text-purple-700",
  green: "bg-green-50 text-green-700",
  orange: "bg-orange-50 text-orange-700",
  pink: "bg-pink-50 text-pink-700",
}

export function HealthTrackingLayout({
  title,
  children,
  currentValue,
  unit,
  color,
  icon,
  showCurrentValueCard = true, // Default to true for backwards compatibility
}: HealthTrackingLayoutProps) {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const startOfCurrentWeek = startOfWeek(selectedDate)
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startOfCurrentWeek, i))

  return (
    <div className="flex flex-col min-h-screen bg-[#FAF9F6]">
      {/* Date Selector */}
      <div className="bg-white border-b">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="text-center mb-4">
            <h2 className="text-lg font-semibold">Today, {format(selectedDate, "MMMM d")}</h2>
          </div>
          <div className="flex justify-between items-center">
            {weekDays.map((date, index) => {
              const isSelected = format(date, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd")
              const isPast = date < new Date()
              return (
                <div key={index} className="flex flex-col items-center">
                  <div className="text-xs text-gray-500 mb-1">{format(date, "EEE")[0]}</div>
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm",
                      isSelected ? "bg-blue-500 text-white" : isPast ? "bg-blue-100" : "bg-gray-100 text-gray-400",
                    )}
                  >
                    {format(date, "d")}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Current Value Card */}
      {showCurrentValueCard && currentValue && (
        <div className="max-w-md mx-auto w-full px-4 py-4">
          <Card className={cn("p-4", colorStyles[color])}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {icon}
                <h2 className="font-medium">Current {title}</h2>
              </div>
              <div className="text-[1.7rem] font-bold">
                {currentValue}
                {unit && <span className="text-base ml-1">{unit}</span>}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 max-w-md mx-auto w-full px-4 py-4">{children}</div>
    </div>
  )
}
