"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

export default function AdminTest() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    message: string
    data?: any
    error?: string
  } | null>(null)
  const [rawResponse, setRawResponse] = useState<string | null>(null)

  const testAuthEndpoint = async () => {
    setLoading(true)
    setResult(null)
    setRawResponse(null)

    try {
      console.log("Testing simple auth API endpoint...")
      const response = await fetch("/api/simple-auth-test")

      // Log raw response for debugging
      console.log("API response status:", response.status)
      console.log("API response headers:", Object.fromEntries(response.headers.entries()))

      // Get raw text first for debugging
      const rawText = await response.text()
      setRawResponse(rawText)
      console.log("Raw response:", rawText)

      // Try to parse as JSON
      try {
        const data = JSON.parse(rawText)
        setResult(data)
      } catch (parseError) {
        console.error("Failed to parse JSON response:", parseError)
        setResult({
          success: false,
          message: "Failed to parse JSON response",
          error: `Parse error: ${parseError.message}. Raw response: ${rawText.substring(0, 100)}...`,
        })
      }
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
            <CardTitle>Firebase Auth Test</CardTitle>
            <CardDescription>Simple test to verify Firebase Authentication API is working</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={testAuthEndpoint} disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Testing...
                </>
              ) : (
                "Test Firebase Auth API"
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

                {result.data && (
                  <div className="mt-4">
                    <h4 className="font-medium mb-1">User Count: {result.data.userCount}</h4>
                    {result.data.users && result.data.users.length > 0 && (
                      <div className="mt-2 max-h-60 overflow-y-auto">
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2">UID</th>
                              <th className="text-left py-2">Email</th>
                              <th className="text-left py-2">Name</th>
                            </tr>
                          </thead>
                          <tbody>
                            {result.data.users.map((user: any) => (
                              <tr key={user.uid} className="border-b">
                                <td className="py-2">{user.uid}</td>
                                <td className="py-2">{user.email || "—"}</td>
                                <td className="py-2">{user.displayName || "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {rawResponse && !result && (
              <div className="mt-6 p-4 rounded-md border bg-gray-50">
                <h3 className="font-medium mb-2">Raw Response:</h3>
                <pre className="text-xs overflow-x-auto whitespace-pre-wrap">{rawResponse}</pre>
              </div>
            )}
          </CardContent>
          <CardFooter className="text-xs text-gray-500">
            Check the browser console for additional debugging information
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
