"use client"

import type React from "react"
import { useEffect, useState, Suspense, lazy } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { doc, getDoc, updateDoc, deleteDoc, setDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { deleteUser } from "firebase/auth"
import { toast } from "react-hot-toast"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2, Crown } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import DeleteAccountModal from "@/components/DeleteAccountModal"
import Link from "next/link"
import { stripeAuth as auth } from "@/lib/stripe-auth-wrapper"
import { getUserSubscriptionStatus } from "@/lib/subscription-utils"

// Lazy load subscription-related components to ensure Firebase Auth is fully initialized
const SubscriptionSection = lazy(() =>
  import("@/components/subscription-section").then((mod) => ({
    default: mod.SubscriptionSection,
  })),
)

interface UserProfile {
  firstName: string
  middleName: string
  lastName: string
  phoneCountryCode: string
  phoneNumber: string
  email: string
  street: string
  city: string
  state: string
  zipCode: string
  country: string
  interests: string[]
  role: string
}

const interests = [
  "Health Tracking",
  "AI Advice",
  "Shopping Recommendations",
  "Activity & Fitness Tracking",
  "Training & Behavior Tips",
  "Reminders & Scheduling",
  "Vet & Emergency Assistance",
  "Pet Social Media & Sharing",
  "Pet Sitting & Boarding Services",
  "Pet Communication Analysis",
  "Smart Device Integration",
  "Community & Forums",
  "Food & Nutrition",
  "Health & Wellness",
  "Grooming & Hygiene",
  "Toys & Entertainment",
  "Training & Behavior",
  "Bedding & Comfort",
  "Travel & Outdoor Essentials",
  "Litter & Waste Management",
]

export default function Settings() {
  const [profile, setProfile] = useState<UserProfile>({
    firstName: "",
    middleName: "",
    lastName: "",
    phoneCountryCode: "+",
    phoneNumber: "",
    email: "",
    street: "",
    city: "",
    state: "",
    zipCode: "",
    country: "",
    interests: [],
    role: "pet_owner",
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const { user, loading, error, signOut, isAdmin } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("profile")
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [subscriptionStatus, setSubscriptionStatus] = useState({
    isActive: false,
    plan: "free" as const,
    adminGranted: false,
  })
  const [isTrialActive, setIsTrialActive] = useState(false)
  const [trialEndDate, setTrialEndDate] = useState<string | null>(null)
  const [syncingSubscriptions, setSyncingSubscriptions] = useState(false)
  const [syncResult, setSyncResult] = useState<any>(null)
  const [subscriptionDataLoaded, setSubscriptionDataLoaded] = useState(false)

  const handleLogout = async () => {
    try {
      await signOut(auth)
      router.push("/")
      toast.success("Logged out successfully")
    } catch (error) {
      console.error("Error logging out", error)
      toast.error("Failed to log out. Please try again.")
    }
  }

  useEffect(() => {
    console.log("Settings page useEffect running")
    console.log("User state:", user ? "Logged in" : "Not logged in")
    console.log("Loading state:", loading)

    if (user) {
      console.log("User found, fetching profile")
      fetchProfile().catch((error) => {
        console.error("Error in fetchProfile", error)
      })
    } else if (!loading) {
      // If not loading and no user, redirect to login
      console.log("No user and not loading, redirecting to login")
      router.push("/login")
    }
  }, [user, loading])

  const fetchProfile = async () => {
    console.log("fetchProfile called")
    if (!user) {
      console.log("No user in fetchProfile, returning early")
      return
    }

    setIsLoading(true)
    try {
      console.log("Fetching user document from Firestore")
      const docRef = doc(db, "users", user.uid)
      const docSnap = await getDoc(docRef)

      if (docSnap.exists()) {
        const data = docSnap.data()
        console.log("User data from Firestore:", data)

        // Set profile data with fallbacks for all fields
        setProfile({
          firstName: data.firstName || "",
          middleName: data.middleName || "",
          lastName: data.lastName || "",
          phoneCountryCode: data.phoneCountryCode || "+1",
          phoneNumber: data.phoneNumber || "",
          email: user.email || "",
          street: data.address?.street || "",
          city: data.address?.city || "",
          state: data.address?.state || "",
          zipCode: data.address?.zipCode || "",
          country: data.address?.country || "",
          interests: data.interests || [],
          role: data.role || "pet_owner",
        })

        // Check for trial status
        setIsTrialActive(data.trialActive || false)
        setTrialEndDate(data.trialEndDate || null)
        console.log("Trial status:", data.trialActive || false)
        console.log("Trial end date:", data.trialEndDate || null)

        // Check for premium status
        if (data.subscription && data.subscription.adminGranted) {
          console.log("User has admin-granted subscription")
          setSubscriptionStatus({
            isActive: true,
            plan: "free",
            adminGranted: true,
          })
        }
      } else {
        console.log("No user document found, creating one")
        // Create a basic user document if none exists
        try {
          await setDoc(doc(db, "users", user.uid), {
            firstName: "",
            lastName: "",
            email: user.email,
            role: "pet_owner",
            createdAt: new Date(),
          })
          console.log("Created new user document")
        } catch (createError) {
          console.error("Error creating user document", createError)
        }
      }
    } catch (error) {
      console.error("Error fetching profile", error)
      toast.error("Failed to load profile. Please try again.")
    }

    try {
      console.log("Fetching subscription status")
      if (user) {
        console.log("Calling getUserSubscriptionStatus")
        const subStatus = await getUserSubscriptionStatus(user.uid)
        console.log("Subscription status:", subStatus)

        // Only update if not admin-granted
        if (!subscriptionStatus.adminGranted) {
          setSubscriptionStatus(subStatus)
        }

        // Mark subscription data as loaded
        setSubscriptionDataLoaded(true)
      }
    } catch (subError) {
      console.error("Error fetching subscription status", subError)
      // Still mark as loaded even if there was an error
      setSubscriptionDataLoaded(true)
    } finally {
      console.log("Finished loading profile and subscription data")
      setIsLoading(false)
    }
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    if (!profile.phoneCountryCode.startsWith("+") || profile.phoneCountryCode.length < 2) {
      toast.error("Please enter a valid country code starting with '+'")
      return
    }

    if (profile.phoneNumber.length < 8) {
      toast.error("Phone number must be at least 8 digits long")
      return
    }

    setIsSaving(true)
    try {
      const updatedProfile = {
        firstName: profile.firstName,
        middleName: profile.middleName,
        lastName: profile.lastName,
        phoneCountryCode: profile.phoneCountryCode,
        phoneNumber: profile.phoneNumber,
        address: {
          street: profile.street,
          city: profile.city,
          state: profile.state,
          zipCode: profile.zipCode,
          country: profile.country,
        },
        interests: profile.interests,
      }

      await updateDoc(doc(db, "users", user.uid), updatedProfile)
      toast.success("Profile updated successfully!")
    } catch (error) {
      console.error("Error updating profile", error)
      toast.error("Failed to update profile. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!user) {
      toast.error("You must be logged in to delete your account.")
      return
    }

    try {
      setIsLoading(true)

      // First, reauthenticate the user if needed
      const currentUser = auth.currentUser
      if (!currentUser) {
        throw new Error("User authentication state is invalid")
      }

      // Delete user data from Firestore first
      try {
        await deleteDoc(doc(db, "users", user.uid))
        console.log("User document deleted successfully")
      } catch (firestoreError) {
        console.error("Error deleting user document", firestoreError)
        toast.error("Failed to delete user data. Please try again.")
        setIsLoading(false)
        setIsDeleteModalOpen(false)
        return
      }

      // Delete user authentication with better error handling
      try {
        await deleteUser(currentUser)
        console.log("User authentication deleted successfully")

        // Only proceed to logout and redirect if deletion was successful
        toast.success("Your account has been successfully deleted.")
        router.push("/")
      } catch (authError) {
        console.error("Error deleting user authentication", authError)

        // Handle specific Firebase auth errors
        if (authError.code === "auth/requires-recent-login") {
          toast.error("For security reasons, please log out and log back in before deleting your account.")
        } else {
          toast.error(`Authentication error: ${authError.message}`)
        }
      }
    } catch (error) {
      console.error("Error deleting account", error)
      if (error instanceof Error) {
        toast.error(`Failed to delete account: ${error.message}`)
      } else {
        toast.error("Failed to delete account due to an unknown error. Please try again.")
      }
    } finally {
      setIsLoading(false)
      setIsDeleteModalOpen(false)
    }
  }

  const handleInterestToggle = (interest: string) => {
    setProfile((prev) => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter((i) => i !== interest)
        : [...prev.interests, interest],
    }))
  }

  // Determine if the user has an active premium status (either subscription or trial)
  const isPremium = subscriptionStatus.isActive || isTrialActive

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-[#FAF9F6]">
        <PageHeader title="Settings" />
        <main className="flex-grow flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </main>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#FAF9F6]">
      <PageHeader title="Settings" />
      <main className={`flex-grow flex flex-col items-center p-6 pb-24 lg:pb-6`}>
        <div className="w-full max-w-4xl space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="account">Account</TabsTrigger>
            </TabsList>

            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Profile Settings</CardTitle>
                      <CardDescription>Update your personal information here.</CardDescription>
                    </div>
                    {isPremium && (
                      <div className="flex items-center gap-1 bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">
                        <Crown className="h-4 w-4" />
                        <span>{isTrialActive ? "Trial" : "Premium"}</span>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleUpdateProfile} className="space-y-4">
                    <div>
                      <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                        First Name
                      </label>
                      <Input
                        id="firstName"
                        type="text"
                        value={profile.firstName}
                        onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                        required
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label htmlFor="middleName" className="block text-sm font-medium text-gray-700">
                        Middle Name
                      </label>
                      <Input
                        id="middleName"
                        type="text"
                        value={profile.middleName}
                        onChange={(e) => setProfile({ ...profile, middleName: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                        Last Name
                      </label>
                      <Input
                        id="lastName"
                        type="text"
                        value={profile.lastName}
                        onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                        required
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                        Email
                      </label>
                      <Input id="email" type="email" value={profile.email} disabled className="mt-1 bg-gray-100" />
                    </div>
                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                        Phone
                      </label>
                      <div className="flex space-x-2 mt-1">
                        <Input
                          id="phoneCountryCode"
                          type="text"
                          value={profile.phoneCountryCode}
                          onChange={(e) => {
                            const value = e.target.value
                            if (value === "" || (value.startsWith("+") && /^\+\d*$/.test(value))) {
                              setProfile({ ...profile, phoneCountryCode: value })
                            }
                          }}
                          placeholder="+1"
                          className="w-1/3"
                        />
                        <Input
                          id="phoneNumber"
                          type="tel"
                          value={profile.phoneNumber}
                          onChange={(e) => setProfile({ ...profile, phoneNumber: e.target.value.replace(/\D/g, "") })}
                          placeholder="Enter your phone number"
                          required
                          minLength={8}
                          className="w-2/3"
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="street" className="block text-sm font-medium text-gray-700">
                        Street
                      </label>
                      <Input
                        id="street"
                        type="text"
                        value={profile.street}
                        onChange={(e) => setProfile({ ...profile, street: e.target.value })}
                        required
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                        City
                      </label>
                      <Input
                        id="city"
                        type="text"
                        value={profile.city}
                        onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                        required
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label htmlFor="state" className="block text-sm font-medium text-gray-700">
                        State
                      </label>
                      <Input
                        id="state"
                        type="text"
                        value={profile.state}
                        onChange={(e) => setProfile({ ...profile, state: e.target.value })}
                        required
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700">
                        Zip Code
                      </label>
                      <Input
                        id="zipCode"
                        type="text"
                        value={profile.zipCode}
                        onChange={(e) => setProfile({ ...profile, zipCode: e.target.value })}
                        required
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label htmlFor="country" className="block text-sm font-medium text-gray-700">
                        Country
                      </label>
                      <Input
                        id="country"
                        type="text"
                        value={profile.country}
                        onChange={(e) => setProfile({ ...profile, country: e.target.value })}
                        required
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Interests</label>
                      <div className="flex flex-wrap gap-2">
                        {interests.map((interest) => (
                          <button
                            key={interest}
                            type="button"
                            onClick={() => handleInterestToggle(interest)}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                              profile.interests.includes(interest)
                                ? "bg-blue-600 text-white"
                                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                          >
                            {interest}
                          </button>
                        ))}
                      </div>
                    </div>
                    <Button type="submit" disabled={isSaving} className="w-full">
                      {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="account">
              <Card>
                <CardHeader>
                  <CardTitle>Account Settings</CardTitle>
                  <CardDescription>Manage your account settings and preferences.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="pb-4 border-b border-gray-200">
                      <h3 className="text-lg font-medium mb-2">Account Type</h3>
                      <div className="flex items-center">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            profile.role === "vet" ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"
                          }`}
                        >
                          {profile.role === "vet" ? "Veterinarian Account" : "Pet Owner Account"}
                        </span>
                      </div>
                    </div>

                    {/* Lazy load subscription section to avoid Firebase Auth initialization issues */}
                    <Suspense
                      fallback={
                        <div className="pb-4 border-b border-gray-200">
                          <h3 className="text-lg font-medium mb-2">Subscription</h3>
                          <div className="flex justify-center py-4">
                            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                          </div>
                        </div>
                      }
                    >
                      {subscriptionDataLoaded && (
                        <div className="pb-4 border-b border-gray-200">
                          <h3 className="text-lg font-medium mb-2">Subscription</h3>
                          <div className="flex flex-col space-y-3">
                            <div className="flex items-center">
                              {isPremium ? (
                                <span className="flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                                  <Crown className="h-4 w-4" />
                                  {subscriptionStatus.adminGranted
                                    ? "Admin Granted Subscription"
                                    : isTrialActive
                                      ? "Premium Trial"
                                      : subscriptionStatus.plan === "monthly"
                                        ? "Monthly Subscription"
                                        : "Yearly Subscription"}
                                </span>
                              ) : (
                                <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                                  Free Plan
                                </span>
                              )}
                            </div>
                            {isPremium && (
                              <Link href="/settings/subscription" className="w-full">
                                <Button variant="outline" className="w-full flex items-center justify-center gap-2">
                                  <Crown className="h-4 w-4" />
                                  Manage Subscription
                                </Button>
                              </Link>
                            )}
                            {!isPremium && (
                              <Link href="/subscribe" className="w-full">
                                <Button className="w-full flex items-center justify-center gap-2">
                                  <Crown className="h-4 w-4" />
                                  Upgrade to Premium
                                </Button>
                              </Link>
                            )}
                          </div>
                        </div>
                      )}
                    </Suspense>

                    <div>
                      <h3 className="text-lg font-medium">Delete Account</h3>
                      <p className="text-sm text-gray-500">
                        Once you delete your account, there is no going back. Please be certain.
                      </p>
                    </div>
                    <Button variant="destructive" onClick={() => setIsDeleteModalOpen(true)} className="w-full mt-4">
                      Delete Account
                    </Button>
                    <Button onClick={handleLogout} className="w-full mt-4">
                      Log Out
                    </Button>
                    {isAdmin && (
                      <Link href="/admin" className="w-full mt-4 block">
                        <Button variant="outline" className="w-full flex items-center justify-center gap-2">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="lucide lucide-shield"
                          >
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
                          </svg>
                          Admin Panel
                        </Button>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <DeleteAccountModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteAccount}
        isLoading={isLoading}
      />
    </div>
  )
}
