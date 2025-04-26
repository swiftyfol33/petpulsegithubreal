"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

export default function EnvCheck() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    message: string
    envVars?: Record<string, string>
    error?: string
  } | null>(null)

  const checkEnvironment = async () => {
    setLoading(true)
    setResult(null)

    try {
      console.log("Checking environment variables...")
      const response = await fetch("/api/test-env")

      // Log response for debugging
      console.log("API response status:", response.status)

      if (!response.ok) {
        throw new Error(`API returned status ${response.status}`)
      }

      const data = await response.json()
      setResult(data)
    } catch (error) {
      console.error("API test error:", error)
      setResult({
        success: false,
        message: "API request failed",
        error: error.message,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen p-6">
      <div className="max-w-2xl mx-auto w-full">
        <Card>
          <CardHeader>
            <CardTitle>Environment Variables Check</CardTitle>
            <CardDescription>Check if required environment variables are set</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={checkEnvironment} disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Checking...
                </>
              ) : (
                "Check Environment Variables"
              )}
            </Button>

            {result && (
              <div className="mt-6 p-4 rounded-md border">
                <h3 className="font-medium mb-2">{result.success ? "✅ Success" : "❌ Error"}</h3>
                <p className="text-sm mb-2">{result.message}</p>

                {result.error && (
                  <div className="mt-2 p-2 bg-red-50 rounded text-sm text-red-700">
                    <strong>Error:</strong> {result.error}
                  </div>
                )}

                {result.envVars && (
                  <div className="mt-4">
                    <h4 className="font-medium mb-1">Environment Variables:</h4>
                    <div className="mt-2 max-h-60 overflow-y-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2">Variable</th>
                            <th className="text-left py-2">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(result.envVars).map(([key, value]) => (
                            <tr key={key} className="border-b">
                              <td className="py-2 font-mono text-xs">{key}</td>
                              <td className={`py-2 ${value === "NOT SET" ? "text-red-500" : "text-green-500"}`}>
                                {value === "NOT SET" ? "❌ Not Set" : "✅ Set"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
          <CardFooter className="text-xs text-gray-500">
            <p>
              Make sure to set the required environment variables in your .env.local file or in your hosting
              environment.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
