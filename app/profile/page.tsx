"use client"

import { useState, useEffect, Suspense } from "react"
import { useAuth } from "../../contexts/AuthContext"
import { db } from "../../lib/firebase"
import { doc, getDoc } from "firebase/firestore"
import Navigation from "../../components/navigation"
import { PageHeader } from "../../components/page-header"
import { User, Phone, MapPin, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "react-hot-toast"
import Link from "next/link"
import { Skeleton } from "@/components/ui/skeleton"
import { SubscriptionStatusCard } from "../../components/subscription-status"

interface UserProfile {
  fullName: string
  phoneCountryCode: string
  phoneNumber: string
  email: string
  street: string
  city: string
  state: string
  zipCode: string
  country: string
}

function ProfileContent() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCheckingSubscription, setIsCheckingSubscription] = useState(false)

  useEffect(() => {
    if (user) {
      fetchProfile()
      // Check subscription status on mount
      checkSubscriptionStatus()
    }
  }, [user])

  const fetchProfile = async () => {
    if (!user) return
    setIsLoading(true)
    try {
      const docRef = doc(db, "users", user.uid)
      const docSnap = await getDoc(docRef)
      if (docSnap.exists()) {
        setProfile(docSnap.data() as UserProfile)
      } else {
        toast.error("Profile not found. Please complete your profile setup.")
      }
    } catch (error) {
      console.error("Error fetching profile:", error)
      toast.error("Failed to fetch profile. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  // Add a function to check subscription status
  const checkSubscriptionStatus = async () => {
    if (!user) return

    try {
      setIsCheckingSubscription(true)
      // Silently check subscription status in the background
      await fetch("/api/sync-subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: user.uid }),
      })
    } catch (error) {
      console.error("Error checking subscription status:", error)
    } finally {
      setIsCheckingSubscription(false)
    }
  }

  if (isLoading) {
    return (
      <div className="w-full max-w-md space-y-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="space-y-4">
            <div className="flex items-center">
              <User className="w-5 h-5 mr-2 text-gray-500" />
              <Skeleton className="w-40 h-5" />
            </div>
            <div className="flex items-center">
              <Phone className="w-5 h-5 mr-2 text-gray-500" />
              <Skeleton className="w-40 h-5" />
            </div>
            <div className="flex items-center">
              <Mail className="w-5 h-5 mr-2 text-gray-500" />
              <Skeleton className="w-40 h-5" />
            </div>
            <div className="flex items-start">
              <MapPin className="w-5 h-5 mr-2 mt-1 text-gray-500" />
              <div>
                <Skeleton className="w-20 h-5" />
                <Skeleton className="w-40 h-5 mt-1" />
                <Skeleton className="w-32 h-5 mt-1" />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        {profile ? (
          <>
            <div className="space-y-4">
              <div className="flex items-center">
                <User className="w-5 h-5 mr-2 text-gray-500" />
                <p>
                  <span className="font-semibold">Name:</span> {profile.fullName}
                </p>
              </div>
              <div className="flex items-center">
                <Phone className="w-5 h-5 mr-2 text-gray-500" />
                <p>
                  <span className="font-semibold">Phone:</span> {profile.phoneCountryCode} {profile.phoneNumber}
                </p>
              </div>
              <div className="flex items-center">
                <Mail className="w-5 h-5 mr-2 text-gray-500" />
                <p>
                  <span className="font-semibold">Email:</span> {profile.email}
                </p>
              </div>
              <div className="flex items-start">
                <MapPin className="w-5 h-5 mr-2 mt-1 text-gray-500" />
                <div>
                  <p className="font-semibold">Address:</p>
                  <p>{profile.street}</p>
                  <p>
                    {profile.city}, {profile.state} {profile.zipCode}
                  </p>
                  <p>{profile.country}</p>
                </div>
              </div>
            </div>
            <Link href="/settings" passHref>
              <Button className="w-full mt-6">Edit Profile</Button>
            </Link>
          </>
        ) : (
          <p className="text-center text-gray-500">Profile not found. Please complete your profile setup.</p>
        )}
      </div>

      {/* Add subscription status card */}
      {user && <SubscriptionStatusCard userId={user.uid} />}
    </div>
  )
}

export default function Profile() {
  return (
    <div className="flex flex-col min-h-screen bg-[#FAF9F6]">
      <PageHeader title="Your Profile" />
      <main className="flex-grow flex flex-col items-center p-6">
        <Suspense
          fallback={
            <div className="w-full max-w-md space-y-6">
              <div className="bg-white rounded-lg shadow-md p-6">
                <Skeleton className="w-full h-[200px]" />
              </div>
            </div>
          }
        >
          <ProfileContent />
        </Suspense>
      </main>
      <Navigation />
    </div>
  )
}
