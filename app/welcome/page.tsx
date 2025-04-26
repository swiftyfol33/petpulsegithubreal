"use client"

import type React from "react"

import { useEffect, useContext } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Search, Activity, CalendarCheck, AlertTriangle, BarChart2, Stethoscope, Users } from "lucide-react"
import { AuthContext } from "@/contexts/AuthContext"

// Update the component to check user role and show different content
export default function WelcomePage() {
  const router = useRouter()
  const { user } = useContext(AuthContext)

  // Check if user is a vet (you may need to adjust this based on how roles are stored)
  const isVet = user?.role === "vet"

  useEffect(() => {
    // You can add any necessary initialization logic here
  }, [])

  const handleGetStarted = () => {
    router.push("/") // Redirect to the main page
  }

  return (
    <div className="min-h-screen bg-[#2D57ED] text-white p-6 flex flex-col items-center justify-center">
      {/* Role banner at the top */}
      <div className="absolute top-0 left-0 right-0 bg-blue-800 py-2 px-4 text-center text-white font-medium">
        Logged in as {isVet ? "Vet" : "Pet Owner"}
      </div>

      <Card className="w-full max-w-2xl bg-blue-600 text-white">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-center">Welcome to PetPulse!</CardTitle>
          <CardDescription className="text-xl text-center text-blue-100">
            {isVet ? "Your AI-powered veterinary practice companion" : "Your AI-powered pet health companion"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-center text-lg">
            {isVet
              ? "Monitor your clients' pets with real-time AI analysis, track symptoms, and provide instant health insights!"
              : "Monitor your pet's well-being with real-time AI analysis, track symptoms, and receive instant health insights!"}
          </p>
          <div className="space-y-4">
            {isVet ? (
              // Vet-specific features
              <>
                <FeatureItem
                  icon={<Users className="w-6 h-6" />}
                  title="Client Management"
                  description="Manage your client profiles and their pets in one place."
                />
                <FeatureItem
                  icon={<Search className="w-6 h-6" />}
                  title="AI Diagnostic Assistant"
                  description="Use AI to help analyze symptoms and suggest potential diagnoses."
                />
                <FeatureItem
                  icon={<Activity className="w-6 h-6" />}
                  title="Health Monitoring"
                  description="Track patient health metrics and receive alerts about concerning changes."
                />
                <FeatureItem
                  icon={<CalendarCheck className="w-6 h-6" />}
                  title="Appointment Management"
                  description="Schedule and manage in-person and virtual appointments."
                />
                <FeatureItem
                  icon={<Stethoscope className="w-6 h-6" />}
                  title="Treatment Plans"
                  description="Create and share detailed treatment plans with pet owners."
                />
              </>
            ) : (
              // Pet owner features
              <>
                <FeatureItem
                  icon={<Search className="w-6 h-6" />}
                  title="AI Symptom Checker"
                  description="Describe symptoms, upload photos, and let AI analyze potential issues."
                />
                <FeatureItem
                  icon={<Activity className="w-6 h-6" />}
                  title="Stool Analysis"
                  description="Get AI-driven insights into your pet's digestive health."
                />
                <FeatureItem
                  icon={<CalendarCheck className="w-6 h-6" />}
                  title="Vet Consultations"
                  description="Schedule video or in-person vet appointments with ease."
                />
                <FeatureItem
                  icon={<AlertTriangle className="w-6 h-6" />}
                  title="Emergency Services"
                  description="Quickly locate nearby emergency vet clinics and get first-aid tips."
                />
                <FeatureItem
                  icon={<BarChart2 className="w-6 h-6" />}
                  title="Health Dashboard"
                  description="Track vaccinations, medications, and overall wellness."
                />
              </>
            )}
          </div>
          <p className="text-center text-lg font-semibold mt-6">
            {isVet
              ? "Provide the best care for your patients—anytime, anywhere! 🩺🐾"
              : "Stay ahead of your pet's health—anytime, anywhere! 🐶🐱💙"}
          </p>
          <Button onClick={handleGetStarted} className="w-full bg-white text-blue-600 hover:bg-blue-50">
            Get Started
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function FeatureItem({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex items-start space-x-4">
      <div className="bg-blue-500 p-2 rounded-full">{icon}</div>
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="text-sm text-blue-100">{description}</p>
      </div>
    </div>
  )
}
