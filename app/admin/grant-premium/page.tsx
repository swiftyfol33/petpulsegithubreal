"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { db } from "@/lib/firebase"
import { doc, updateDoc, getDoc } from "firebase/firestore"
import { AdminGuard } from "@/components/admin-guard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/use-toast"

export default function GrantPremiumPage() {
  const [userId, setUserId] = useState("")
  const [loading, setLoading] = useState(false)
  const [userDetails, setUserDetails] = useState<any>(null)
  const { user } = useAuth()

  const lookupUser = async () => {
    if (!userId.trim()) {
      toast({
        title: "Error",
        description: "Please enter a user ID",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const userDoc = await getDoc(doc(db, "users", userId))
      if (userDoc.exists()) {
        setUserDetails(userDoc.data())
      } else {
        toast({
          title: "User not found",
          description: "No user exists with this ID",
          variant: "destructive",
        })
        setUserDetails(null)
      }
    } catch (error) {
      console.error("Error looking up user:", error)
      toast({
        title: "Error",
        description: "Failed to look up user",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const grantPremium = async () => {
    if (!userId.trim() || !userDetails) return

    setLoading(true)
    try {
      await updateDoc(doc(db, "users", userId), {
        adminGrantedPremium: true,
        premiumGrantedBy: user?.uid,
        premiumGrantedAt: new Date().toISOString(),
      })

      toast({
        title: "Success",
        description: "Premium access granted to user",
      })
    } catch (error) {
      console.error("Error granting premium:", error)
      toast({
        title: "Error",
        description: "Failed to grant premium access",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const revokePremium = async () => {
    if (!userId.trim() || !userDetails) return

    setLoading(true)
    try {
      await updateDoc(doc(db, "users", userId), {
        adminGrantedPremium: false,
        premiumRevokedBy: user?.uid,
        premiumRevokedAt: new Date().toISOString(),
      })

      toast({
        title: "Success",
        description: "Premium access revoked from user",
      })
    } catch (error) {
      console.error("Error revoking premium:", error)
      toast({
        title: "Error",
        description: "Failed to revoke premium access",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AdminGuard>
      <div className="container mx-auto py-8 max-w-4xl">
        <h1 className="text-2xl font-bold mb-6">Grant Premium Access</h1>

        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex gap-4 mb-4">
            <Input
              placeholder="Enter user ID"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="flex-1"
            />
            <Button onClick={lookupUser} disabled={loading}>
              {loading ? "Loading..." : "Look Up User"}
            </Button>
          </div>

          {userDetails && (
            <div className="mt-6">
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <h3 className="font-semibold mb-2">User Details</h3>
                <p>
                  <strong>Name:</strong> {userDetails.displayName || "N/A"}
                </p>
                <p>
                  <strong>Email:</strong> {userDetails.email || "N/A"}
                </p>
                <p>
                  <strong>Premium Status:</strong>{" "}
                  {userDetails.adminGrantedPremium
                    ? "Admin-granted Premium"
                    : userDetails.subscriptionStatus === "active" ||
                        (userDetails.subscription && userDetails.subscription.status === "active")
                      ? "Subscription Premium"
                      : "No Premium"}
                </p>
              </div>

              <div className="flex gap-4">
                <Button
                  onClick={grantPremium}
                  disabled={loading || userDetails.adminGrantedPremium === true}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Grant Premium Access
                </Button>
                <Button
                  onClick={revokePremium}
                  disabled={loading || userDetails.adminGrantedPremium !== true}
                  variant="destructive"
                >
                  Revoke Premium Access
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminGuard>
  )
}
