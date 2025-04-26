"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

export default function StaticApiAlternative() {
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)

  // This is a client-side only approach that doesn't use API routes
  const fetchUsers = async () => {
    setLoading(true)
    setError(null)

    try {
      // Initialize Firebase on the client side
      // Note: This is just a demonstration - in a real app, you'd use your existing Firebase setup
      const { initializeApp } = await import("firebase/app")
      const { getAuth, listUsers } = await import("firebase/auth")

      // Display a message about the approach
      setError(
        "Note: This is a client-side demo. In a real app, you would need to use Firebase Admin SDK on the server side to list users. Client-side Firebase SDK doesn't allow listing all users for security reasons.",
      )

      // Simulate some users for demonstration
      setUsers([
        { uid: "user1", email: "user1@example.com", displayName: "User One" },
        { uid: "user2", email: "user2@example.com", displayName: "User Two" },
        { uid: "user3", email: "user3@example.com", displayName: "User Three" },
      ])
    } catch (err) {
      console.error("Error:", err)
      setError(`Error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-4">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>Static Deployment Alternative</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
              <h3 className="font-medium text-blue-800 mb-2">Static Deployment Information</h3>
              <p className="text-sm text-blue-700">
                If your site is deployed to a static hosting provider (like GitHub Pages), API routes won't work. Here
                are alternatives:
              </p>
              <ul className="list-disc pl-5 mt-2 text-sm text-blue-700 space-y-1">
                <li>Use Firebase client SDK directly (with limited admin capabilities)</li>
                <li>Create a separate serverless function (AWS Lambda, Vercel Functions, etc.)</li>
                <li>Use Firebase Cloud Functions for admin operations</li>
                <li>Move to a hosting provider that supports API routes (Vercel, Netlify with functions)</li>
              </ul>
            </div>

            <Button onClick={fetchUsers} disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Simulating User Fetch...
                </>
              ) : (
                "Simulate Fetching Users"
              )}
            </Button>

            {error && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-700 text-sm">
                {error}
              </div>
            )}

            {users.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-medium mb-2">Simulated Users:</h3>
                <div className="border rounded-md overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {users.map((user) => (
                        <tr key={user.uid}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.uid}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.displayName}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
