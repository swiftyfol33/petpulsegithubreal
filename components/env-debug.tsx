"use client"

import { useState, useEffect } from "react"
import { clientEnv } from "@/lib/env"
import { useStripeConfig } from "@/hooks/use-config"

export function EnvDebug() {
  const [serverStatus, setServerStatus] = useState<Record<string, boolean>>({})
  const [isLoading, setIsLoading] = useState(true)
  const { config: stripeConfig, isLoading: stripeLoading } = useStripeConfig()

  useEffect(() => {
    async function checkServerEnv() {
      try {
        const response = await fetch("/api/env-check")
        if (!response.ok) {
          throw new Error(`Failed to check server environment: ${response.status}`)
        }
        const data = await response.json()
        setServerStatus(data)
      } catch (error) {
        console.error("Error checking server environment:", error)
      } finally {
        setIsLoading(false)
      }
    }

    checkServerEnv()
  }, [])

  // Check client environment variables
  const clientStatus: Record<string, boolean> = {}

  // Check Firebase client variables
  clientStatus.firebase = Object.values(clientEnv.firebase).every(Boolean)

  // Individual Firebase variables
  Object.entries(clientEnv.firebase).forEach(([key, value]) => {
    clientStatus[`firebase.${key}`] = Boolean(value)
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Client Environment</h2>
        {Object.entries(clientStatus).map(([key, value]) => (
          <div key={key} className="flex items-center mb-1">
            <span className={value ? "text-green-500" : "text-red-500"}>{value ? "✓" : "✗"}</span>
            <span className="ml-2">{key}</span>
          </div>
        ))}
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-2">Server Environment</h2>
        {isLoading ? (
          <p>Loading server environment status...</p>
        ) : (
          Object.entries(serverStatus).map(([key, value]) => (
            <div key={key} className="flex items-center mb-1">
              <span className={value ? "text-green-500" : "text-red-500"}>{value ? "✓" : "✗"}</span>
              <span className="ml-2">{key}</span>
            </div>
          ))
        )}
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-2">API-Fetched Configuration</h2>
        <h3 className="text-lg font-medium mb-1">Stripe</h3>
        {stripeLoading ? (
          <p>Loading Stripe configuration...</p>
        ) : (
          <div className="pl-4">
            <div className="flex items-center mb-1">
              <span className={stripeConfig?.publishableKey ? "text-green-500" : "text-red-500"}>
                {stripeConfig?.publishableKey ? "✓" : "✗"}
              </span>
              <span className="ml-2">publishableKey</span>
            </div>
            <div className="flex items-center mb-1">
              <span className={stripeConfig?.monthlyPriceId ? "text-green-500" : "text-red-500"}>
                {stripeConfig?.monthlyPriceId ? "✓" : "✗"}
              </span>
              <span className="ml-2">monthlyPriceId</span>
            </div>
            <div className="flex items-center mb-1">
              <span className={stripeConfig?.yearlyPriceId ? "text-green-500" : "text-red-500"}>
                {stripeConfig?.yearlyPriceId ? "✓" : "✗"}
              </span>
              <span className="ml-2">yearlyPriceId</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
