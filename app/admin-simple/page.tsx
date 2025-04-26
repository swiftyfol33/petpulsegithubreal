"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, AlertCircle, CheckCircle } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { useAuth } from "@/contexts/AuthContext"

export default function SimpleAdminPanel() {
  const { user, isAdmin } = useAuth()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [adminKey, setAdminKey] = useState("")
  const [testMode, setTestMode] = useState(true)

  // Load admin key from localStorage if available
  useEffect(() => {
    const savedKey = localStorage.getItem("admin_api_key")
    if (savedKey) {
      setAdminKey(savedKey)
    }
  }, [])

  const testFirebaseConnection = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      // Save the admin key to localStorage
      if (adminKey) {
        localStorage.setItem("admin_api_key", adminKey)
      }

      // First, test a simple fetch to see if the network is working
      const testResponse = await fetch("https://httpbin.org/get")
      if (!testResponse.ok) {
        throw new Error(`Network test failed: ${testResponse.status}`)
      }

      // If we're in test mode, just show success for the network test
      if (testMode) {
        setResult({
          success: true,
          message: "Network connection test successful!",
          details: "This is just a test of your network connection. No Firebase operations were performed.",
        })
        return
      }

      // Try to fetch users from Firebase
      const response = await fetch("/api/list-auth-users", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminKey}`,
        },
      })

      // Get the raw text first to check if it's HTML
      const text = await response.text()

      // Check if the response is HTML (indicating an error)
      if (text.trim().startsWith("<!DOCTYPE") || text.trim().startsWith("<html")) {
        throw new Error("Received HTML response instead of JSON. API routes may not be supported in your deployment.")
      }

      // Try to parse as JSON
      try {
        const data = JSON.parse(text)
        setResult({
          success: true,
          userCount: data.userCount || 0,
          users: data.users || [],
        })
      } catch (parseError) {
        throw new Error(`Failed to parse response as JSON: ${parseError.message}`)
      }
    } catch (error) {
      console.error("Error:", error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="flex flex-col min-h-screen">
        <PageHeader title="Simple Admin Panel" />
        <main className="flex-grow flex items-center justify-center p-6">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
                <p className="text-gray-500 mb-4">Please log in to access the admin panel.</p>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader title="Simple Admin Panel" />
      <main className="flex-grow p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Firebase Authentication Test</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {!isAdmin && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-md">
                    <div className="flex items-start">
                      <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 mr-2" />
                      <div>
                        <h3 className="font-medium text-amber-800">Admin Access Required</h3>
                        <p className="text-sm text-amber-700 mt-1">
                          You are logged in but don't have admin privileges. Some functionality may be limited.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="test-mode"
                    checked={testMode}
                    onChange={(e) => setTestMode(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="test-mode" className="text-sm text-gray-700">
                    Test Mode (Only check network connection)
                  </label>
                </div>

                <div className="space-y-2">
                  <label htmlFor="admin-key" className="text-sm font-medium">
                    Admin API Key (Optional)
                  </label>
                  <input
                    id="admin-key"
                    type="password"
                    value={adminKey}
                    onChange={(e) => setAdminKey(e.target.value)}
                    placeholder="Enter your admin API key"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <p className="text-xs text-gray-500">Please enter your admin API key to access admin features</p>
                </div>

                <Button onClick={testFirebaseConnection} disabled={loading} className="w-full">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    "Test Firebase Connection"
                  )}
                </Button>

                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                    <div className="flex items-start">
                      <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 mr-2" />
                      <div>
                        <h3 className="font-medium text-red-800">Error</h3>
                        <p className="text-sm text-red-700 mt-1">{error}</p>
                      </div>
                    </div>
                  </div>
                )}

                {result && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                    <div className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-2" />
                      <div>
                        <h3 className="font-medium text-green-800">Success</h3>
                        {result.message ? (
                          <p className="text-sm text-green-700 mt-1">{result.message}</p>
                        ) : (
                          <p className="text-sm text-green-700 mt-1">
                            Successfully connected to Firebase. Found {result.userCount} users.
                          </p>
                        )}

                        {result.details && <p className="text-sm text-green-700 mt-1">{result.details}</p>}
                      </div>
                    </div>

                    {result.users && result.users.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium mb-2">Users:</h4>
                        <div className="border rounded-md overflow-hidden">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                  Email
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                  Name
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {result.users.slice(0, 10).map((user: any) => (
                                <tr key={user.uid}>
                                  <td className="px-4 py-2 text-sm text-gray-900">{user.email || "No email"}</td>
                                  <td className="px-4 py-2 text-sm text-gray-500">{user.displayName || "No name"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {result.users.length > 10 && (
                            <div className="px-4 py-2 text-sm text-gray-500 bg-gray-50 border-t">
                              Showing 10 of {result.users.length} users
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Troubleshooting</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                  <h3 className="font-medium text-blue-800 mb-2">Common Issues</h3>
                  <ul className="list-disc pl-5 text-sm text-blue-700 space-y-1">
                    <li>
                      <strong>API routes not working:</strong> Your deployment might not support API routes. Try
                      enabling "Test Mode" above to check basic connectivity.
                    </li>
                    <li>
                      <strong>Authentication errors:</strong> Make sure your admin API key is correct and that you have
                      admin privileges.
                    </li>
                    <li>
                      <strong>Firebase configuration:</strong> Ensure your Firebase project is properly configured and
                      that the service account has the necessary permissions.
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
