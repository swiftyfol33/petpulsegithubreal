"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, AlertCircle, CheckCircle } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { useAuth } from "@/contexts/AuthContext"
import { collection, getDocs, db } from "@/lib/firebase"
import { Timestamp } from "firebase/firestore"

export default function AdminDirectPage() {
  const { user, isAdmin } = useAuth()
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState<any[]>([])
  const [userCount, setUserCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const fetchUsers = async () => {
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      // Fetch users from Firestore instead of Auth
      const usersCollection = collection(db, "users")
      const usersSnapshot = await getDocs(usersCollection)

      const usersData = usersSnapshot.docs.map((doc) => ({
        uid: doc.id,
        ...doc.data(),
      }))

      setUsers(usersData)
      setUserCount(usersData.length)
      setSuccess(true)
    } catch (err: any) {
      console.error("Error fetching users:", err)
      setError(err.message || "Failed to fetch users")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Check if Firebase is initialized
    if (!db) {
      setError("Firebase Firestore is not initialized")
    }
  }, [])

  if (!user) {
    return (
      <div className="flex flex-col min-h-screen">
        <PageHeader title="Admin Panel" />
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
      <PageHeader title="Admin Panel" />
      <main className="flex-grow p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Firestore Users</CardTitle>
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

                <Button onClick={fetchUsers} disabled={loading} className="w-full">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading Users...
                    </>
                  ) : (
                    "Load Users from Firestore"
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

                {success && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                    <div className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-2" />
                      <div>
                        <h3 className="font-medium text-green-800">Success</h3>
                        <p className="text-sm text-green-700 mt-1">
                          Successfully loaded {userCount} users from Firestore.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {users.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium mb-2">Users ({userCount}):</h4>
                    <div className="border rounded-md overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {users.map((user) => (
                            <tr key={user.uid}>
                              <td className="px-4 py-2 text-sm text-gray-900">{user.email || "No email"}</td>
                              <td className="px-4 py-2 text-sm text-gray-500">
                                {user.displayName || user.name || "No name"}
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-500">
                                {user.createdAt
                                  ? new Date(
                                      user.createdAt instanceof Timestamp ? user.createdAt.toDate() : user.createdAt,
                                    ).toLocaleDateString()
                                  : "Unknown"}
                              </td>
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
      </main>
    </div>
  )
}
