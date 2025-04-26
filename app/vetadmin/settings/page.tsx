"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { signOut } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { toast } from "react-hot-toast"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface VetProfile {
  firstName: string
  lastName: string
  phoneCountryCode: string
  phoneNumber: string
  email: string
  practiceLocation: {
    formattedAddress: string
    placeId?: string
    lat?: number
    lng?: number
  }
  specializations: {
    animals: string[]
    services: string[]
  }
}

const animalTypes = ["Dogs", "Cats", "Birds", "Small Mammals", "Reptiles", "Exotic Pets", "Farm Animals", "Horses"]

const serviceTypes = [
  "General Practice",
  "Emergency Care",
  "Surgery",
  "Dental",
  "Dermatology",
  "Cardiology",
  "Orthopedics",
  "Neurology",
  "Oncology",
  "Ophthalmology",
  "Behavioral Medicine",
  "Nutrition",
  "Preventive Care",
  "Radiology",
  "Laboratory Services",
  "Pharmacy",
  "Boarding",
  "Grooming",
]

export default function VetSettings() {
  const [profile, setProfile] = useState<VetProfile>({
    firstName: "",
    lastName: "",
    phoneCountryCode: "+",
    phoneNumber: "",
    email: "",
    practiceLocation: {
      formattedAddress: "",
    },
    specializations: {
      animals: [],
      services: [],
    },
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const { user } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("profile")

  const handleLogout = async () => {
    try {
      await signOut(auth)
      router.push("/")
      toast.success("Logged out successfully")
    } catch (error) {
      console.error("Error logging out:", error)
      toast.error("Failed to log out. Please try again.")
    }
  }

  useEffect(() => {
    const checkUserAndFetchProfile = async () => {
      if (!user) {
        router.push("/login")
        return
      }

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid))
        if (userDoc.exists()) {
          const userData = userDoc.data()

          if (userData.role !== "vet") {
            // Redirect non-vet users to the regular settings page
            router.push("/settings")
            return
          }

          setProfile({
            firstName: userData.firstName || "",
            lastName: userData.lastName || "",
            phoneCountryCode: userData.phoneCountryCode || "+",
            phoneNumber: userData.phoneNumber || "",
            email: user.email || "",
            practiceLocation: userData.practiceLocation || { formattedAddress: "" },
            specializations: {
              animals: userData.specializations?.animals || [],
              services: userData.specializations?.services || [],
            },
          })
        }
      } catch (error) {
        console.error("Error fetching profile:", error)
        toast.error("Failed to load profile. Please try again.")
      } finally {
        setIsLoading(false)
      }
    }

    checkUserAndFetchProfile()
  }, [user, router])

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
      await updateDoc(doc(db, "users", user.uid), {
        firstName: profile.firstName,
        lastName: profile.lastName,
        phoneCountryCode: profile.phoneCountryCode,
        phoneNumber: profile.phoneNumber,
        practiceLocation: profile.practiceLocation,
        specializations: profile.specializations,
      })
      toast.success("Profile updated successfully!")
    } catch (error) {
      console.error("Error updating profile:", error)
      toast.error("Failed to update profile. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleSpecializationToggle = (type: "animals" | "services", item: string) => {
    setProfile((prev) => {
      // Ensure the arrays exist
      const currentItems = [...(prev.specializations[type] || [])]
      const updatedItems = currentItems.includes(item)
        ? currentItems.filter((i) => i !== item)
        : [...currentItems, item]

      return {
        ...prev,
        specializations: {
          ...prev.specializations,
          [type]: updatedItems,
        },
      }
    })
  }

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <PageHeader title="Vet Settings" />
        <main className="flex-grow flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </main>
      </div>
    )
  }

  // Ensure specializations arrays exist
  const animalSpecializations = profile.specializations?.animals || []
  const serviceSpecializations = profile.specializations?.services || []

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader title="Vet Settings" />
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
                  <CardTitle>Vet Profile Settings</CardTitle>
                  <CardDescription>Update your professional information here.</CardDescription>
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
                      <label htmlFor="practiceLocation" className="block text-sm font-medium text-gray-700">
                        Practice Location
                      </label>
                      <Input
                        id="practiceLocation"
                        type="text"
                        value={profile.practiceLocation.formattedAddress}
                        disabled
                        className="mt-1 bg-gray-100"
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        To update your practice location, please contact support.
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Animal Specializations</label>
                      <div className="flex flex-wrap gap-2">
                        {animalTypes.map((animal) => (
                          <button
                            key={animal}
                            type="button"
                            onClick={() => handleSpecializationToggle("animals", animal)}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                              animalSpecializations.includes(animal)
                                ? "bg-blue-600 text-white"
                                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                          >
                            {animal}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Services Offered</label>
                      <div className="flex flex-wrap gap-2">
                        {serviceTypes.map((service) => (
                          <button
                            key={service}
                            type="button"
                            onClick={() => handleSpecializationToggle("services", service)}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                              serviceSpecializations.includes(service)
                                ? "bg-blue-600 text-white"
                                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                          >
                            {service}
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
                    <Button onClick={handleLogout} className="w-full">
                      Log Out
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}
