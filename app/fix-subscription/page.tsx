"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Loader2 } from "lucide-react"
import { toast } from "react-hot-toast"
import Navigation from "@/components/navigation"

export default function FixSubscriptionPage() {
  const { user, isAdmin } = useAuth()
  const [subscriptionId, setSubscriptionId] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const handleFixSubscription = async () => {
    if (!user || !subscriptionId) return

    setLoading(true)
    try {
      const response = await fetch("/api/fix-subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subscriptionId,
          userId: user.uid,
        }),
      })

      const data = await response.json()

      if (data.error) {
        toast.error(data.error)
      } else {
        toast.success("Subscription fixed successfully")
        setResult(data)
      }
    } catch (error) {
      console.error("Error fixing subscription:", error)
      toast.error("Failed to fix subscription")
    } finally {
      setLoading(false)
    }
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col min-h-screen bg-[#FAF9F6]">
        <PageHeader title="Fix Subscription" />
        <main className="flex-grow flex flex-col items-center justify-center p-6">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Access Denied</CardTitle>
              <CardDescription>You need admin access to use this page.</CardDescription>
            </CardHeader>
          </Card>
        </main>
        <Navigation />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#FAF9F6]">
      <PageHeader title="Fix Subscription" />
      <main className="flex-grow flex flex-col items-center p-6 pb-24 lg:pb-6">
        <div className="w-full max-w-md space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Fix User Subscription</CardTitle>
              <CardDescription>Manually sync a Stripe subscription with a user account</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label htmlFor="subscription-id" className="block text-sm font-medium text-gray-700 mb-1">
                  Stripe Subscription ID
                </label>
                <Input
                  id="subscription-id"
                  value={subscriptionId}
                  onChange={(e) => setSubscriptionId(e.target.value)}
                  placeholder="sub_1234567890"
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleFixSubscription} disabled={loading || !subscriptionId} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Fix Subscription"
                )}
              </Button>
            </CardFooter>
          </Card>

          {result && (
            <Card>
              <CardHeader>
                <CardTitle>Result</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-gray-100 p-4 rounded-md overflow-auto text-xs">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      <Navigation />
    </div>
  )
}
