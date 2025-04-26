"use client"

import { useState, useEffect } from "react"

interface StripeConfig {
  publishableKey: string
  monthlyPriceId: string
  yearlyPriceId: string
}

export function useStripeConfig() {
  const [config, setConfig] = useState<StripeConfig | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function fetchConfig() {
      try {
        const response = await fetch("/api/config/stripe")
        if (!response.ok) {
          throw new Error(`Failed to fetch Stripe config: ${response.status}`)
        }
        const data = await response.json()
        setConfig(data)
      } catch (err) {
        console.error("Error fetching Stripe config:", err)
        setError(err instanceof Error ? err : new Error(String(err)))
      } finally {
        setIsLoading(false)
      }
    }

    fetchConfig()
  }, [])

  return { config, isLoading, error }
}
