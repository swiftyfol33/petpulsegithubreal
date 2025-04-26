"use client"

import { useState } from "react"
import { format, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addDays, parseISO } from "date-fns"
import { Card, CardContent } from "@/components/ui/card"
import {
  Weight,
  Moon,
  Utensils,
  Brain,
  Activity,
  Pill,
  Syringe,
  ChevronDown,
  ChevronUp,
  ArrowUp,
  ArrowDown,
  Minus,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

interface CalendarProps {
  data: any
  selectedDate: Date
  onDateChange: (date: Date) => void
  view: "calendar" | "list"
}

// Update the renderTrendIcon function to have better styling
const renderTrendIcon = (trend: string) => {
  switch (trend) {
    case "up":
      return <ArrowUp className="h-5 w-5 text-emerald-500" />
    case "down":
      return <ArrowDown className="h-5 w-5 text-rose-500" />
    default:
      return <Minus className="h-5 w-5 text-gray-400" />
  }
}

export function Calendar({ data, selectedDate, onDateChange, view }: CalendarProps) {
  const [showAllEntries, setShowAllEntries] = useState(false)
  const [filters, setFilters] = useState({
    weight: true,
    sleep: true,
    food: true,
    behavior: true,
    activity: true,
    medication: true,
    vaccine: true,
  })

  // Toggle filter function
  const toggleFilter = (filter: keyof typeof filters) => {
    setFilters((prev) => ({
      ...prev,
      [filter]: !prev[filter],
    }))
  }

  // Function to format time from date string
  const formatTime = (dateString: string) => {
    try {
      const date = parseISO(dateString)
      return format(date, "h:mm a")
    } catch (error) {
      console.error("Error parsing date:", dateString, error)
      return "Unknown time"
    }
  }

  // Get events for the selected date
  const eventsForSelectedDate = [
    ...(filters.weight
      ? data.weight
          .filter((item: any) => {
            try {
              return isSameDay(parseISO(item.date), selectedDate)
            } catch (error) {
              console.error("Error parsing date in weight filter:", item.date)
              return false
            }
          })
          .map((item: any) => ({
            type: "Weight",
            value: `${item.value} kg`,
            time: formatTime(item.date),
            icon: <Weight className="h-4 w-4 text-blue-500" />,
          }))
      : []),
    ...(filters.sleep
      ? data.sleep
          .filter((item: any) => isSameDay(parseISO(item.date), selectedDate))
          .map((item: any) => ({
            type: "Sleep",
            value: `${item.value} hours`,
            time: formatTime(item.date),
            icon: <Moon className="h-4 w-4 text-purple-500" />,
          }))
      : []),
    ...(filters.activity
      ? data.activity
          .filter((item: any) => isSameDay(parseISO(item.date), selectedDate))
          .map((item: any) => ({
            type: "Activity",
            value: `${item.value}/10`,
            time: formatTime(item.date),
            icon: <Activity className="h-4 w-4 text-green-500" />,
          }))
      : []),
    ...(filters.food
      ? data.food
          .filter((item: any) => isSameDay(parseISO(item.date), selectedDate))
          .map((item: any) => ({
            type: "Food",
            value: `${item.type}: ${item.value}`,
            time: formatTime(item.date),
            icon: <Utensils className="h-4 w-4 text-orange-500" />,
          }))
      : []),
    ...(filters.behavior
      ? data.behavior
          .filter((item: any) => isSameDay(parseISO(item.date), selectedDate))
          .map((item: any) => ({
            type: "Behavior",
            value: item.value,
            notes: item.notes,
            time: formatTime(item.date),
            icon: <Brain className="h-4 w-4 text-pink-500" />,
          }))
      : []),
  ]

  // Function to check if a date has events
  const hasEvents = (date: Date) => {
    return [
      ...(filters.weight ? data.weight : []),
      ...(filters.sleep ? data.sleep : []),
      ...(filters.activity ? data.activity : []),
      ...(filters.food ? data.food : []),
      ...(filters.behavior ? data.behavior : []),
    ].some((item: any) => isSameDay(parseISO(item.date), date))
  }

  // Function to get event icons for a date
  const getEventIcons = (date: Date) => {
    const icons = []

    if (filters.weight && data.weight.some((item: any) => isSameDay(parseISO(item.date), date))) {
      icons.push(<Weight key="weight" className="h-4 w-4 text-blue-500" />)
    }

    if (filters.sleep && data.sleep.some((item: any) => isSameDay(parseISO(item.date), date))) {
      icons.push(<Moon key="sleep" className="h-4 w-4 text-purple-500" />)
    }

    if (filters.activity && data.activity.some((item: any) => isSameDay(parseISO(item.date), date))) {
      icons.push(<Activity key="activity" className="h-4 w-4 text-green-500" />)
    }

    if (filters.food && data.food.some((item: any) => isSameDay(parseISO(item.date), date))) {
      icons.push(<Utensils key="food" className="h-4 w-4 text-orange-500" />)
    }

    if (filters.behavior && data.behavior.some((item: any) => isSameDay(parseISO(item.date), date))) {
      icons.push(<Brain key="behavior" className="h-4 w-4 text-pink-500" />)
    }

    return icons
  }

  // Generate calendar days
  const generateCalendarDays = () => {
    const monthStart = startOfMonth(selectedDate)
    const monthEnd = endOfMonth(selectedDate)
    const startDate = monthStart
    const endDate = monthEnd

    const dateFormat = "d"
    const days = []
    const daysInMonth = eachDayOfInterval({ start: startDate, end: endDate })

    // Create header with days of week
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    const header = dayNames.map((day) => (
      <div key={day} className="text-center font-medium py-2">
        {day}
      </div>
    ))
    days.push(
      <div key="header" className="grid grid-cols-7 mb-2">
        {header}
      </div>,
    )

    // Create calendar grid
    let rows = []
    let day = startDate
    let formattedDate = ""
    const startingDayOfWeek = getDay(startDate)

    // Add empty cells for days before the first of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      rows.push(<div key={`empty-${i}`} className="border p-2 h-24"></div>)
    }

    // Add days of the month
    while (day <= endDate) {
      formattedDate = format(day, dateFormat)
      const cloneDay = day
      const eventIcons = getEventIcons(cloneDay)

      rows.push(
        <div
          key={day.toString()}
          className={`border p-2 h-24 relative cursor-pointer transition-colors hover:bg-gray-50 ${
            isSameDay(day, selectedDate) ? "border-blue-500 border-2 bg-blue-50" : ""
          }`}
          onClick={() => onDateChange(cloneDay)}
        >
          <div className={`font-medium ${isSameDay(day, new Date()) ? "text-blue-600" : ""}`}>{formattedDate}</div>
          <div className="flex flex-wrap gap-1 mt-1">
            {eventIcons.map((icon, i) => (
              <div key={i} className="animate-in fade-in duration-300">
                {icon}
              </div>
            ))}
          </div>
        </div>,
      )

      // If we've reached the end of a week, wrap to a new row
      if (getDay(day) === 6) {
        days.push(
          <div key={day.toString()} className="grid grid-cols-7">
            {rows}
          </div>,
        )
        rows = []
      }

      day = addDays(day, 1)
    }

    // Add empty cells for days after the last day of the month
    const remainingCells = 7 - rows.length
    for (let i = 0; i < remainingCells; i++) {
      rows.push(<div key={`empty-end-${i}`} className="border p-2 h-24"></div>)
    }

    // Add the last row if it's not empty
    if (rows.length > 0) {
      days.push(
        <div key={`last-row`} className="grid grid-cols-7">
          {rows}
        </div>,
      )
    }

    return days
  }

  return (
    <div>
      {/* Filter controls */}
      <div className="flex flex-wrap gap-4 mb-6 bg-gray-50 p-4 rounded-lg border border-gray-100">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="filter-weight"
            checked={filters.weight}
            onCheckedChange={() => toggleFilter("weight")}
            className="data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
          />
          <Label htmlFor="filter-weight" className="flex items-center gap-1 cursor-pointer">
            <Weight className="h-4 w-4 text-blue-500" /> <span className="text-gray-700">Weight</span>
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="filter-sleep"
            checked={filters.sleep}
            onCheckedChange={() => toggleFilter("sleep")}
            className="data-[state=checked]:bg-purple-500 data-[state=checked]:border-purple-500"
          />
          <Label htmlFor="filter-sleep" className="flex items-center gap-1 cursor-pointer">
            <Moon className="h-4 w-4 text-purple-500" /> <span className="text-gray-700">Sleep</span>
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="filter-food"
            checked={filters.food}
            onCheckedChange={() => toggleFilter("food")}
            className="data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
          />
          <Label htmlFor="filter-food" className="flex items-center gap-1 cursor-pointer">
            <Utensils className="h-4 w-4 text-orange-500" /> <span className="text-gray-700">Food</span>
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="filter-behavior"
            checked={filters.behavior}
            onCheckedChange={() => toggleFilter("behavior")}
            className="data-[state=checked]:bg-pink-500 data-[state=checked]:border-pink-500"
          />
          <Label htmlFor="filter-behavior" className="flex items-center gap-1 cursor-pointer">
            <Brain className="h-4 w-4 text-pink-500" /> <span className="text-gray-700">Behavior</span>
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="filter-activity"
            checked={filters.activity}
            onCheckedChange={() => toggleFilter("activity")}
            className="data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
          />
          <Label htmlFor="filter-activity" className="flex items-center gap-1 cursor-pointer">
            <Activity className="h-4 w-4 text-green-500" /> <span className="text-gray-700">Activity</span>
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="filter-medication"
            checked={filters.medication}
            onCheckedChange={() => toggleFilter("medication")}
            className="data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500"
          />
          <Label htmlFor="filter-medication" className="flex items-center gap-1 cursor-pointer">
            <Pill className="h-4 w-4 text-red-500" /> <span className="text-gray-700">Medication</span>
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="filter-vaccine"
            checked={filters.vaccine}
            onCheckedChange={() => toggleFilter("vaccine")}
            className="data-[state=checked]:bg-yellow-500 data-[state=checked]:border-yellow-500"
          />
          <Label htmlFor="filter-vaccine" className="flex items-center gap-1 cursor-pointer">
            <Syringe className="h-4 w-4 text-yellow-500" /> <span className="text-gray-700">Vaccine</span>
          </Label>
        </div>
      </div>

      {view === "calendar" ? (
        <div className="space-y-6">
          {/* Timeline view */}
          <Card>
            <CardContent className="p-4">
              <h3 className="text-lg font-medium mb-4 text-gray-800">
                {format(selectedDate, "MMMM d, yyyy")} Timeline
              </h3>

              <div className="space-y-4">
                {eventsForSelectedDate.slice(0, showAllEntries ? undefined : 5).map((event, index) => (
                  <div key={index} className="flex items-start p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="mr-3 mt-1">{event.icon}</div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-800">{event.value}</div>
                      {event.notes && <div className="text-sm text-gray-600 mt-1">{event.notes}</div>}
                      <div className="text-sm text-gray-500 mt-1">{event.time}</div>
                    </div>
                  </div>
                ))}

                {eventsForSelectedDate.length > 5 && (
                  <Button
                    variant="ghost"
                    className="w-full text-blue-600 flex items-center justify-center hover:bg-blue-50 hover:text-blue-700"
                    onClick={() => setShowAllEntries(!showAllEntries)}
                  >
                    {showAllEntries ? (
                      <>
                        Show Less <ChevronUp className="ml-1 h-4 w-4" />
                      </>
                    ) : (
                      <>
                        Show More ({eventsForSelectedDate.length - 5} more) <ChevronDown className="ml-1 h-4 w-4" />
                      </>
                    )}
                  </Button>
                )}

                {eventsForSelectedDate.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <p className="text-gray-500 mb-2">No events for this date</p>
                    <p className="text-sm text-gray-400">Select a different date or adjust filters</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Calendar view */}
          <div>
            <h3 className="text-lg font-medium mb-4">{format(selectedDate, "MMMM yyyy")}</h3>

            <div className="border-t border-l">{generateCalendarDays()}</div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 mt-4">
              <div className="flex items-center gap-1">
                <Weight className="h-4 w-4 text-blue-500" /> Weight
              </div>
              <div className="flex items-center gap-1">
                <Moon className="h-4 w-4 text-purple-500" /> Sleep
              </div>
              <div className="flex items-center gap-1">
                <Utensils className="h-4 w-4 text-orange-500" /> Food
              </div>
              <div className="flex items-center gap-1">
                <Brain className="h-4 w-4 text-pink-500" /> Behavior
              </div>
              <div className="flex items-center gap-1">
                <Activity className="h-4 w-4 text-green-500" /> Activity
              </div>
              <div className="flex items-center gap-1">
                <Pill className="h-4 w-4 text-red-500" /> Medication
              </div>
              <div className="flex items-center gap-1">
                <Syringe className="h-4 w-4 text-yellow-500" /> Vaccine
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          {eventsForSelectedDate.length > 0 ? (
            eventsForSelectedDate.map((event, index) => (
              <Card key={index} className="border border-gray-200 hover:border-gray-300 transition-all hover:shadow-sm">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-full bg-gray-100">{event.icon}</div>
                      <span className="font-medium text-gray-800">{event.type}</span>
                    </div>
                    <span className="font-semibold text-gray-700">{event.value}</span>
                  </div>
                  {event.notes && <p className="text-sm mt-2 text-gray-600 bg-gray-50 p-2 rounded">{event.notes}</p>}
                  <p className="text-gray-500 text-sm mt-2 flex items-center">
                    <span className="inline-block w-3 h-3 rounded-full bg-green-500 mr-2"></span>
                    {event.time}
                  </p>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-gray-500 mb-2">No events match your filters</p>
              <p className="text-sm text-gray-400">Try adjusting your filter settings</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
