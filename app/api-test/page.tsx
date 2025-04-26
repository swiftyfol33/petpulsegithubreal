"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

export default function ApiTest() {
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const testApi = async () => {
    setLoading(true)
    setResponse(null)
    setError(null)

    try {
      // Log the full URL for debugging
      const apiUrl = "/api/hello-world"
      console.log("Fetching from:", window.location.origin + apiUrl)

      const res = await fetch(apiUrl)

      // Get the raw text response first
      const text = await res.text()
      console.log("Raw response:", text)

      // Try to parse as JSON
      try {
        const data = JSON.parse(text)
        setResponse(JSON.stringify(data, null, 2))
      } catch (parseError) {
        console.error("Failed to parse response as JSON:", parseError)
        setResponse(text)
        setError(`Response is not valid JSON. Raw response shown above.`)
      }
    } catch (fetchError) {
      console.error("Fetch error:", fetchError)
      setError(`Fetch error: ${fetchError.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-4">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Basic API Test</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button onClick={testApi} disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing API...
                </>
              ) : (
                "Test Hello World API"
              )}
            </Button>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">{error}</div>
            )}

            {response && (
              <div className="mt-4">
                <h3 className="text-sm font-medium mb-2">Response:</h3>
                <pre className="p-3 bg-gray-50 border rounded-md text-xs overflow-x-auto">{response}</pre>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
