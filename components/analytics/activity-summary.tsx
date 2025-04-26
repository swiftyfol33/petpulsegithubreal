import { ArrowDown, ArrowUp, Minus, Activity, Moon, Weight, Utensils, Brain } from "lucide-react"

interface ActivitySummaryProps {
  data: {
    weight: Array<{ date: string; value: number }>
    sleep: Array<{ date: string; value: number }>
    activity: Array<{ date: string; value: number }>
    food: Array<{ date: string; value: string; type: string }>
    behavior: Array<{ date: string; value: string; notes: string }>
    analyses: Array<{ date: string; type: string; result: string }>
  }
}

export function ActivitySummary({ data }: ActivitySummaryProps) {
  // Get the most recent value and trend
  const getRecentStats = (dataArray: Array<{ date: string; value: number }>) => {
    if (dataArray.length === 0) return { recentValue: null, trend: "neutral" }

    // Sort by date descending to ensure we get the most recent first
    const sortedData = [...dataArray].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    const recentValue = sortedData[0].value

    // Determine trend based on last two entries
    let trend = "neutral"
    if (sortedData.length >= 2) {
      const mostRecentValue = sortedData[0].value
      const secondMostRecentValue = sortedData[1].value

      if (mostRecentValue > secondMostRecentValue) trend = "up"
      else if (mostRecentValue < secondMostRecentValue) trend = "down"
    }

    return { recentValue, trend }
  }

  const weightStats = getRecentStats(data.weight)
  const sleepStats = getRecentStats(data.sleep)
  const activityStats = getRecentStats(data.activity)

  // Get the latest food and behavior data
  const sortedFood = [...data.food].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const sortedBehavior = [...data.behavior].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const latestFood = sortedFood.length > 0 ? sortedFood[0] : null
  const latestBehavior = sortedBehavior.length > 0 ? sortedBehavior[0] : null

  // Render trend icon
  const renderTrendIcon = (trend: string) => {
    switch (trend) {
      case "up":
        return <ArrowUp className="h-4 w-4 text-green-500" />
      case "down":
        return <ArrowDown className="h-4 w-4 text-red-500" />
      default:
        return <Minus className="h-4 w-4 text-gray-500" />
    }
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
      <div className="flex items-center p-6 rounded-xl bg-blue-50 border border-blue-100 transition-all hover:shadow-md">
        <Weight className="h-10 w-10 text-blue-500 mr-4" />
        <div>
          <p className="text-sm font-medium text-blue-700 mb-1">Weight</p>
          <div className="flex items-center">
            <p className="text-2xl font-bold text-gray-800 mr-2">
              {weightStats.recentValue !== null ? `${weightStats.recentValue.toFixed(1)} kg` : "No data"}
            </p>
            {weightStats.recentValue !== null && renderTrendIcon(weightStats.trend)}
          </div>
        </div>
      </div>

      <div className="flex items-center p-6 rounded-xl bg-purple-50 border border-purple-100 transition-all hover:shadow-md">
        <Moon className="h-10 w-10 text-purple-500 mr-4" />
        <div>
          <p className="text-sm font-medium text-purple-700 mb-1">Sleep</p>
          <div className="flex items-center">
            <p className="text-2xl font-bold text-gray-800 mr-2">
              {sleepStats.recentValue !== null ? `${sleepStats.recentValue.toFixed(1)} hrs` : "No data"}
            </p>
            {sleepStats.recentValue !== null && renderTrendIcon(sleepStats.trend)}
          </div>
        </div>
      </div>

      <div className="flex items-center p-6 rounded-xl bg-green-50 border border-green-100 transition-all hover:shadow-md">
        <Activity className="h-10 w-10 text-green-500 mr-4" />
        <div>
          <p className="text-sm font-medium text-green-700 mb-1">Activity</p>
          <div className="flex items-center">
            <p className="text-2xl font-bold text-gray-800 mr-2">
              {activityStats.recentValue !== null ? `${activityStats.recentValue.toFixed(1)}/10` : "No data"}
            </p>
            {activityStats.recentValue !== null && renderTrendIcon(activityStats.trend)}
          </div>
        </div>
      </div>

      <div className="flex items-center p-6 rounded-xl bg-pink-50 border border-pink-100 transition-all hover:shadow-md">
        {latestBehavior ? (
          <>
            <Brain className="h-10 w-10 text-pink-500 mr-4" />
            <div>
              <p className="text-sm font-medium text-pink-700 mb-1">Behavior</p>
              <div className="flex items-center">
                <p className="text-2xl font-bold text-gray-800">{latestBehavior.value}</p>
              </div>
            </div>
          </>
        ) : (
          <>
            <Utensils className="h-10 w-10 text-orange-500 mr-4" />
            <div>
              <p className="text-sm font-medium text-orange-700 mb-1">Food</p>
              <div className="flex items-center">
                <p className="text-2xl font-bold text-gray-800">{latestFood ? latestFood.type : "No data"}</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
