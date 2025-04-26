"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { getUserSubscriptionStatus, formatSubscriptionPlan, type SubscriptionStatus } from "@/lib/subscription-utils"
import { Loader2, Crown, RefreshCw } from "lucide-react"
import Link from "next/link"
import toast from "react-hot-toast"

interface SubscriptionStatusProps {
  userId: string
}

export function SubscriptionStatusCard({ userId }: SubscriptionStatusProps) {
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  const fetchSubscription = async () => {
    try {
      setLoading(true)
      const status = await getUserSubscriptionStatus(userId)
      setSubscription(status)
    } catch (error) {
      console.error("Error fetching subscription:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (userId) {
      fetchSubscription()
    }
  }, [userId])

  const handleSyncSubscription = async () => {
    if (!userId) return

    try {
      setSyncing(true)
      const response = await fetch("/api/sync-subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      })

      if (!response.ok) {
        throw new Error("Failed to sync subscription")
      }

      await fetchSubscription()
      toast.success("Subscription status updated successfully")
    } catch (error) {
      console.error("Error syncing subscription:", error)
      toast.error("Failed to sync subscription status")
    } finally {
      setSyncing(false)
    }
  }

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6 flex justify-center items-center h-32">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    )
  }

  if (!subscription) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <p className="text-center text-gray-500">Unable to load subscription information</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`w-full ${subscription.isActive ? "border-2 border-purple-200" : ""}`}>
      <CardHeader className={`pb-2 ${subscription.isActive ? "bg-purple-50" : ""}`}>
        <CardTitle className="flex items-center justify-between">
          <span>Subscription Status</span>
          {subscription.isActive && <Crown className="h-5 w-5 text-purple-600" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-500">Plan:</span>
            <span className="font-medium">{formatSubscriptionPlan(subscription.plan)}</span>
          </div>

          {subscription.isActive && subscription.expiresAt && (
            <div className="flex justify-between">
              <span className="text-gray-500">Renews on:</span>
              <span className="font-medium">{new Date(subscription.expiresAt).toLocaleDateString()}</span>
            </div>
          )}

          <div className="flex justify-between">
            <span className="text-gray-500">Status:</span>
            <span className={`font-medium ${subscription.isActive ? "text-green-600" : "text-gray-600"}`}>
              {subscription.isActive ? "Active" : "Inactive"}
            </span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-2">
        {subscription.isActive ? (
          <Link href="/settings" className="w-full">
            <Button variant="outline" className="w-full">
              Manage Subscription
            </Button>
          </Link>
        ) : (
          <Link href="/subscribe" className="w-full">
            <Button className="w-full">Upgrade to Premium</Button>
          </Link>
        )}

        <Button
          variant="ghost"
          size="sm"
          className="w-full flex items-center gap-1 text-gray-500 hover:text-gray-700"
          onClick={handleSyncSubscription}
          disabled={syncing}
        >
          {syncing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          <span>Refresh Status</span>
        </Button>
      </CardFooter>
    </Card>
  )
}
