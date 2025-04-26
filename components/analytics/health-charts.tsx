"use client"

import { useEffect, useRef } from "react"

interface HealthChartsProps {
  data: Array<{ date: string; value: number }>
  type: "weight" | "sleep" | "activity"
}

export function HealthCharts({ data, type }: HealthChartsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Define colors and labels based on type
  const getChartConfig = () => {
    switch (type) {
      case "weight":
        return {
          lineColor: "#3b82f6", // blue-500
          fillColor: "rgba(59, 130, 246, 0.15)", // blue-500 with opacity
          label: "Weight (kg)",
        }
      case "sleep":
        return {
          lineColor: "#8b5cf6", // violet-500
          fillColor: "rgba(139, 92, 246, 0.15)", // violet-500 with opacity
          label: "Sleep (hours)",
        }
      case "activity":
        return {
          lineColor: "#10b981", // emerald-500
          fillColor: "rgba(16, 185, 129, 0.15)", // emerald-500 with opacity
          label: "Activity Level",
        }
      default:
        return {
          lineColor: "#3b82f6",
          fillColor: "rgba(59, 130, 246, 0.15)",
          label: "Value",
        }
    }
  }

  useEffect(() => {
    if (!canvasRef.current) return

    // If no data or empty data, render "No data available" message
    if (!data || data.length === 0) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Set canvas dimensions
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()

      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr

      ctx.scale(dpr, dpr)

      // Draw "No data" message with better styling
      ctx.fillStyle = "#9ca3af" // gray-400
      ctx.font = "16px Inter, system-ui, sans-serif"
      ctx.textAlign = "center"
      ctx.fillText("No data available", rect.width / 2, rect.height / 2 - 10)
      ctx.font = "14px Inter, system-ui, sans-serif"
      ctx.fillStyle = "#d1d5db" // gray-300
      ctx.fillText("Add data to see your pet's progress", rect.width / 2, rect.height / 2 + 15)
      return
    }

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    try {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Set canvas dimensions
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()

      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr

      ctx.scale(dpr, dpr)

      // Chart dimensions
      const padding = 40
      const chartWidth = rect.width - padding * 2
      const chartHeight = rect.height - padding * 2

      // Find min and max values
      const values = data.map((item) => item.value)
      let min = Math.min(...values)
      let max = Math.max(...values)

      // Add some padding to min/max
      const range = max - min
      min = Math.max(0, min - range * 0.1)
      max = max + range * 0.1

      // Draw axes
      ctx.beginPath()
      ctx.strokeStyle = "#e5e7eb" // gray-200
      ctx.lineWidth = 1

      // X-axis
      ctx.moveTo(padding, rect.height - padding)
      ctx.lineTo(rect.width - padding, rect.height - padding)

      // Y-axis
      ctx.moveTo(padding, padding)
      ctx.lineTo(padding, rect.height - padding)
      ctx.stroke()

      // Draw grid lines
      const gridLines = 5
      ctx.beginPath()
      ctx.strokeStyle = "#f3f4f6" // gray-100
      ctx.lineWidth = 1

      for (let i = 1; i <= gridLines; i++) {
        const y = padding + (chartHeight / gridLines) * i
        ctx.moveTo(padding, y)
        ctx.lineTo(rect.width - padding, y)
      }
      ctx.stroke()

      // Draw data points
      const config = getChartConfig()

      if (data.length > 1) {
        // Draw filled area
        ctx.beginPath()
        ctx.fillStyle = config.fillColor

        // Start at the bottom left
        ctx.moveTo(padding, rect.height - padding)

        // Draw points
        data.forEach((point, index) => {
          const x = padding + index * (chartWidth / (data.length - 1))
          const y = padding + chartHeight - ((point.value - min) / (max - min)) * chartHeight
          ctx.lineTo(x, y)
        })

        // Complete the path to the bottom right
        ctx.lineTo(rect.width - padding, rect.height - padding)
        ctx.closePath()
        ctx.fill()

        // Draw line
        ctx.beginPath()
        ctx.strokeStyle = config.lineColor
        ctx.lineWidth = 2

        data.forEach((point, index) => {
          const x = padding + index * (chartWidth / (data.length - 1))
          const y = padding + chartHeight - ((point.value - min) / (max - min)) * chartHeight

          if (index === 0) {
            ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }
        })

        ctx.stroke()

        // Draw points
        data.forEach((point, index) => {
          const x = padding + index * (chartWidth / (data.length - 1))
          const y = padding + chartHeight - ((point.value - min) / (max - min)) * chartHeight

          ctx.beginPath()
          ctx.fillStyle = "white"
          ctx.strokeStyle = config.lineColor
          ctx.lineWidth = 2
          ctx.arc(x, y, 4, 0, Math.PI * 2)
          ctx.fill()
          ctx.stroke()
        })
      } else if (data.length === 1) {
        // If there's only one data point, draw a single point
        const point = data[0]
        const x = rect.width / 2
        const y = rect.height / 2

        ctx.beginPath()
        ctx.fillStyle = "white"
        ctx.strokeStyle = config.lineColor
        ctx.lineWidth = 2
        ctx.arc(x, y, 6, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()

        // Add label
        ctx.fillStyle = "#111827" // gray-900
        ctx.font = "14px sans-serif"
        ctx.textAlign = "center"
        ctx.fillText(`${point.value}`, x, y - 15)
      }

      // Draw labels
      ctx.fillStyle = "#6b7280" // gray-500
      ctx.font = "12px sans-serif"
      ctx.textAlign = "center"

      // X-axis labels (dates)
      if (data.length <= 7) {
        // Show all dates if there are 7 or fewer
        data.forEach((point, index) => {
          const x = padding + index * (chartWidth / (data.length - 1))
          const date = new Date(point.date)
          const label = `${date.getMonth() + 1}/${date.getDate()}`
          ctx.fillText(label, x, rect.height - padding + 20)
        })
      } else {
        // Show only some dates if there are more than 7
        const step = Math.ceil(data.length / 5)
        for (let i = 0; i < data.length; i += step) {
          const x = padding + i * (chartWidth / (data.length - 1))
          const date = new Date(data[i].date)
          const label = `${date.getMonth() + 1}/${date.getDate()}`
          ctx.fillText(label, x, rect.height - padding + 20)
        }
      }

      // Y-axis labels
      ctx.textAlign = "right"
      for (let i = 0; i <= gridLines; i++) {
        const y = rect.height - padding - (chartHeight / gridLines) * i
        const value = min + (max - min) * (i / gridLines)
        const label = value.toFixed(1)
        ctx.fillText(label, padding - 10, y + 4)
      }

      // Chart title with better styling
      ctx.fillStyle = "#111827" // gray-900
      ctx.font = "bold 16px Inter, system-ui, sans-serif"
      ctx.textAlign = "left"
      ctx.fillText(config.label, padding, 24)
    } catch (error) {
      console.error("Error rendering chart:", error)

      // Clear canvas and show error message with better styling
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = "#ef4444" // red-500
      ctx.font = "16px Inter, system-ui, sans-serif"
      ctx.textAlign = "center"
      const rect = canvas.getBoundingClientRect()
      ctx.fillText("Error rendering chart", rect.width / 2, rect.height / 2 - 10)
      ctx.font = "14px Inter, system-ui, sans-serif"
      ctx.fillStyle = "#9ca3af" // gray-400
      ctx.fillText("Please try refreshing the page", rect.width / 2, rect.height / 2 + 15)
    }
  }, [data, type])

  return (
    <div className="w-full h-full rounded-lg overflow-hidden bg-white p-2">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  )
}
