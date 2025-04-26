"use client"

import { useFirebase } from "@/lib/firebase-provider"
import { useSelectedPet } from "../contexts/PetContext"
import Link from "next/link"
import { Mail, Activity, Search, CalendarCheck, AlertTriangle, BarChart2, Download, Share } from "lucide-react"
import Image from "next/image"
import { useState, useEffect, useCallback } from "react"
import { collection, query, where, getDocs, orderBy, limit } from "@/lib/firebase-provider"
import { PageHeader } from "../components/page-header"
import { PetHeader } from "../components/pet-header"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { ChevronRight } from "lucide-react"
import { Weight, Moon, Utensils, Smile, Pill, Syringe } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Sparkles, FileSearch } from "lucide-react"
import { format } from "date-fns"
import { useMediaQuery } from "@/hooks/use-media-query"
import { MonthlyHealthCalendar } from "../components/monthly-health-calendar"
import { Heart } from "lucide-react"
import { PremiumBanner } from "../components/premium-banner"
import { LoadingSpinner } from "../components/loading"

interface HealthRecord {
  id: string
  date: string
  weight: number
  activityLevel: number
  foodIntake: string
  sleepDuration: number
  behavior: string
  notes: string
  medications?: any[]
  vaccinations?: any[]
}

const getActivityLabel = (level: number) => {
  if (level <= 3) return "Low Activity"
  if (level <= 7) return "Moderate Activity"
  return "High Activity"
}

const estimateOverallHealth = (healthRecords: HealthRecord[]): { status: string; emoji: string; score: number } => {
  if (healthRecords.length === 0) return { status: "N/A", emoji: "❓", score: 0 }

  const latestRecord = healthRecords[0]
  let totalScore = 0
  let metricsCount = 0

  // Sleep score (out of 5)
  if (latestRecord.sleepDuration) {
    let sleepScore = 0
    if (latestRecord.sleepDuration >= 8) sleepScore = 5
    else if (latestRecord.sleepDuration >= 6) sleepScore = 4
    else if (latestRecord.sleepDuration >= 4) sleepScore = 3
    else if (latestRecord.sleepDuration >= 2) sleepScore = 2
    else sleepScore = 1
    totalScore += sleepScore
    metricsCount++
  }

  // Activity score (out of 5)
  if (latestRecord.activityLevel) {
    const activityScore = Math.min(Math.round(latestRecord.activityLevel / 2), 5)
    totalScore += activityScore
    metricsCount++
  }

  // Food intake score (out of 5)
  if (latestRecord.foodIntake) {
    let foodScore = 0
    switch (latestRecord.foodIntake.toLowerCase()) {
      case "normal":
      case "good":
        foodScore = 5
        break
      case "above average":
        foodScore = 4
        break
      case "below average":
        foodScore = 3
        break
      case "poor":
        foodScore = 2
        break
      case "very poor":
        foodScore = 1
        break
      default:
        foodScore = 3 // Assume average if unknown
    }
    totalScore += foodScore
    metricsCount++
  }

  // Behavior score (out of 5)
  if (latestRecord.behavior) {
    let behaviorScore = 0
    switch (latestRecord.behavior.toLowerCase()) {
      case "happy":
      case "playful":
      case "energetic":
        behaviorScore = 5
        break
      case "calm":
      case "relaxed":
        behaviorScore = 4
        break
      case "normal":
      case "average":
        behaviorScore = 3
        break
      case "anxious":
      case "stressed":
        behaviorScore = 2
        break
      case "lethargic":
      case "depressed":
        behaviorScore = 1
        break
      default:
        behaviorScore = 3 // Assume average if unknown
    }
    totalScore += behaviorScore
    metricsCount++
  }

  if (metricsCount === 0) return { status: "Unknown", emoji: "❓", score: 0 }

  const averageScore = totalScore / metricsCount

  if (averageScore >= 3.5) return { status: "Good", emoji: "💚", score: averageScore }
  if (averageScore >= 2.5) return { status: "OK", emoji: "💛", score: averageScore }
  return { status: "Poor", emoji: "🔴", score: averageScore }
}

export default function Home() {
  // Add a simple console log at the top of the page component to verify it's loading
  console.log("Main page component rendering")
  // Add logo animation styles
  const [showLogoOverlay, setShowLogoOverlay] = useState(true)

  const { user, db } = useFirebase()

  useEffect(() => {
    if (!user) {
      const timer = setTimeout(() => {
        setShowLogoOverlay(false)
      }, 2500) // slightly longer than animation duration to ensure it completes

      return () => clearTimeout(timer)
    }
  }, [user])

  useEffect(() => {
    if (typeof document !== "undefined") {
      const style = document.createElement("style")
      style.innerHTML = `
      @keyframes logoZoomOut {
        0% {
          transform: scale(3);
          opacity: 0;
        }
        30% {
          opacity: 1;
        }
        90% {
          transform: scale(1);
          opacity: 1;
        }
        100% {
          transform: scale(1);
          opacity: 0;
        }
      }
      
      @keyframes taglineAppear {
        0%, 20% {
          opacity: 0;
          transform: translateY(20px);
        }
        50% {
          opacity: 1;
          transform: translateY(0);
        }
        90% {
          opacity: 1;
        }
        100% {
          opacity: 0;
        }
      }
      
      .logo-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background-color: #2D57ED;
        z-index: 100;
        pointer-events: none;
      }
      
      .logo-animation {
        animation: logoZoomOut 2.3s ease-out forwards;
        width: 250px;
        height: auto;
      }
      
      .tagline-animation {
        animation: taglineAppear 2.3s ease-out forwards;
        color: white;
        font-size: 1.75rem;
        font-weight: bold;
        text-align: center;
        margin-top: 1.5rem;
        line-height: 1.2;
      }
    `
      document.head.appendChild(style)

      return () => {
        document.head.removeChild(style)
      }
    }
  }, [])

  const { selectedPet } = useSelectedPet()
  const [healthRecords, setHealthRecords] = useState<HealthRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dataFetched, setDataFetched] = useState(false)
  const router = useRouter()
  const [hasPet, setHasPet] = useState(false)
  const isDesktop = useMediaQuery("(min-width: 800px)")
  const [aiAnalyses, setAiAnalyses] = useState([])
  const [comprehensiveAnalysisCount, setComprehensiveAnalysisCount] = useState(0)
  const [hasRequiredAnalysis, setHasRequiredAnalysis] = useState(false)

  const fetchHealthRecords = useCallback(async () => {
    if (!user || !selectedPet) {
      setHealthRecords([])
      setLoading(false)
      return []
    }
    setLoading(true)
    try {
      // Fetch health records
      const healthQuery = query(
        collection(db, "healthRecords"),
        where("userId", "==", user.uid),
        where("petId", "==", selectedPet.id),
        orderBy("date", "desc"),
        limit(5),
      )

      // Fetch medications
      const medicationsQuery = query(
        collection(db, "medications"),
        where("userId", "==", user.uid),
        where("petId", "==", selectedPet.id),
        orderBy("dueDate"),
        limit(1),
      )

      // Fetch vaccinations
      const vaccinationsQuery = query(
        collection(db, "vaccinations"),
        where("userId", "==", user.uid),
        where("petId", "==", selectedPet.id),
        orderBy("dueDate"),
        limit(1),
      )

      const [healthSnapshot, medicationsSnapshot, vaccinationsSnapshot] = await Promise.all([
        getDocs(healthQuery),
        getDocs(medicationsQuery),
        getDocs(vaccinationsQuery),
      ])

      const records: HealthRecord[] = []
      healthSnapshot.forEach((doc) => {
        records.push({ id: doc.id, ...doc.data() } as HealthRecord)
      })

      // Add medications and vaccinations to the first health record if it exists
      if (records.length > 0) {
        records[0].medications = []
        records[0].vaccinations = []

        medicationsSnapshot.forEach((doc) => {
          records[0].medications?.push({ id: doc.id, ...doc.data() })
        })

        vaccinationsSnapshot.forEach((doc) => {
          records[0].vaccinations?.push({ id: doc.id, ...doc.data() })
        })
      }

      setHealthRecords(records)
      setDataFetched(true)
    } catch (error) {
      console.error("Error fetching health records:", error)
      setError("Failed to fetch health records. Please try again later.")
      setHealthRecords([])
      setLoading(false)
      return []
    }
  }, [user, selectedPet, db])

  const fetchAIAnalyses = useCallback(async () => {
    if (!user || !selectedPet) {
      setAiAnalyses([])
      return false
    }
    try {
      // Fetch AI analyses
      const aiAnalysesQuery = query(
        collection(db, "aiAnalyses"),
        where("userId", "==", user.uid),
        where("petId", "==", selectedPet.id),
        orderBy("createdAt", "desc"),
        limit(5),
      )

      const aiAnalysesSnapshot = await getDocs(aiAnalysesQuery)

      const analyses: any[] = []
      aiAnalysesSnapshot.forEach((doc) => {
        analyses.push({ id: doc.id, ...doc.data() })
      })

      setAiAnalyses(analyses)
      return true
    } catch (error) {
      console.error("Error fetching AI analyses:", error)
      // Don't set an error message here, just log it
      setAiAnalyses([])
      return false
    }
  }, [user, selectedPet, db])

  const fetchComprehensiveAnalysisCount = useCallback(async () => {
    if (!user || !selectedPet) {
      setComprehensiveAnalysisCount(0)
      return
    }
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const q = query(
        collection(db, "aiAnalyses"),
        where("userId", "==", user.uid),
        where("petId", "==", selectedPet.id),
        where("type", "==", "comprehensive"),
        where("date", ">=", today.toISOString()),
      )

      const querySnapshot = await getDocs(q)
      setComprehensiveAnalysisCount(querySnapshot.size)
    } catch (error) {
      console.error("Error fetching comprehensive analysis count:", error)
      setError("Failed to fetch comprehensive analysis count. Please try again later.")
      setComprehensiveAnalysisCount(0)
    }
  }, [user, selectedPet, db])

  const checkRequiredAnalysis = useCallback(async () => {
    if (!user || !selectedPet) {
      setHasRequiredAnalysis(false)
      return
    }
    try {
      // Check if required analysis exists
      const requiredAnalysisQuery = query(
        collection(db, "aiAnalyses"),
        where("userId", "==", user.uid),
        where("petId", "==", selectedPet.id),
        where("type", "==", "required"),
      )

      const requiredAnalysisSnapshot = await getDocs(requiredAnalysisQuery)
      setHasRequiredAnalysis(!requiredAnalysisSnapshot.empty)
    } catch (error) {
      console.error("Error checking required analysis:", error)
      setError("Failed to check required analysis. Please try again later.")
      setHasRequiredAnalysis(false)
    }
  }, [user, selectedPet, db])

  const resetDataFetchedState = useCallback(() => {
    setDataFetched(false)
  }, [])

  useEffect(() => {
    if (user && selectedPet) {
      setLoading(true)
      try {
        Promise.all([
          fetchHealthRecords(),
          fetchAIAnalyses(),
          fetchComprehensiveAnalysisCount(),
          checkRequiredAnalysis(),
        ]).finally(() => {
          setLoading(false)
        })
      } catch (error) {
        console.error("Error fetching data:", error)
        setLoading(false)
      }
    } else if (user) {
      // Still show loading when checking if user has pets
      setLoading(true)
      // Check if user has any pets
      const checkForPets = async () => {
        try {
          const petsQuery = query(collection(db, "pets"), where("userId", "==", user.uid), limit(1))
          const petsSnapshot = await getDocs(petsQuery)
          setHasPet(!petsSnapshot.empty)
        } catch (error) {
          console.error("Error checking for pets:", error)
        } finally {
          setLoading(false)
        }
      }

      checkForPets()
    } else {
      // Clear data when user is not logged in
      setHealthRecords([])
      setAiAnalyses([])
      setComprehensiveAnalysisCount(0)
      setHasRequiredAnalysis(false)
      setLoading(false)
    }
  }, [
    user,
    selectedPet,
    fetchHealthRecords,
    fetchAIAnalyses,
    fetchComprehensiveAnalysisCount,
    checkRequiredAnalysis,
    db,
  ])

  useEffect(() => {
    resetDataFetchedState()
  }, [resetDataFetchedState])

  const handleShareApp = () => {
    if (navigator.share) {
      navigator
        .share({
          title: "PetPulse - Your Pet's Health Companion",
          text: "Check out PetPulse, the AI-powered pet health tracking app!",
          url: window.location.origin,
        })
        .catch((error) => console.log("Error sharing:", error))
    } else {
      alert("Web Share API not supported on this browser. Try on a mobile device.")
    }
  }

  if (!user) {
    return (
      <div className="flex flex-col min-h-screen bg-[#2D57ED] overflow-x-hidden">
        {showLogoOverlay && (
          <div className="logo-overlay">
            <Image
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logo_white-W0YALdeeQEgQhUWkqHdtQXPgBTuxUv.svg"
              alt="PetPulse"
              width={250}
              height={75}
              priority
              className="logo-animation"
            />
            <div className="tagline-animation">
              Your Pet's Health,
              <br />
              Powered by AI
            </div>
          </div>
        )}
        <main className="flex-grow flex flex-col items-center justify-center px-6 py-12 relative">
          <div className="w-full max-w-md space-y-8 z-10">
            {/* Logo with animation */}
            <div className="w-full flex justify-center">
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logo_white-W0YALdeeQEgQhUWkqHdtQXPgBTuxUv.svg"
                alt="PetPulse"
                width={200}
                height={58}
                priority
                className="w-[200px] h-auto"
              />
            </div>

            {/* Welcome Message */}
            <h1 className="text-4xl text-white text-center leading-[1.1] tracking-[-0.04em] font-bold">
              Your Pet's Health,
              <br />
              Powered by AI
            </h1>

            <p className="text-white text-center text-xl font-semibold mb-6">
              Welcome to PetPulse, the ultimate AI-powered pet health companion! Monitor your pet's well-being with
              real-time AI analysis, track symptoms, and receive instant health insights!
            </p>

            <div className="space-y-4 text-white">
              <div className="bg-blue-600 border-2 border-white rounded-lg p-4 flex items-start">
                <Search className="w-10 h-10 mr-4 flex-shrink-0" />
                <div className="text-left">
                  <p className="font-bold">AI Symptom Checker</p>
                  <p>Describe symptoms, upload photos, and let AI analyze potential issues.</p>
                </div>
              </div>
              <div className="bg-blue-600 border-2 border-white rounded-lg p-4 flex items-start">
                <Activity className="w-10 h-10 mr-4 flex-shrink-0" />
                <div className="text-left">
                  <p className="font-bold">Stool Analysis</p>
                  <p>Get AI-driven insights into your pet's digestive health.</p>
                </div>
              </div>
              <div className="bg-blue-600 border-2 border-white rounded-lg p-4 flex items-start">
                <CalendarCheck className="w-10 h-10 mr-4 flex-shrink-0" />
                <div className="text-left">
                  <p className="font-bold">Vet Consultations</p>
                  <p>Schedule video or in-person vet appointments with ease.</p>
                </div>
              </div>
              <div className="bg-blue-600 border-2 border-white rounded-lg p-4 flex items-start">
                <AlertTriangle className="w-10 h-10 mr-4 flex-shrink-0" />
                <div className="text-left">
                  <p className="font-bold">Emergency Services</p>
                  <p>Quickly locate nearby emergency vet clinics and get first-aid tips.</p>
                </div>
              </div>
              <div className="bg-blue-600 border-2 border-white rounded-lg p-4 flex items-start">
                <BarChart2 className="w-10 h-10 mr-4 flex-shrink-0" />
                <div className="text-left">
                  <p className="font-bold">Health Dashboard</p>
                  <p>Track vaccinations, medications, and overall wellness.</p>
                </div>
              </div>
            </div>

            <p className="text-white text-center text-lg font-semibold mt-6">
              Stay ahead of your pet's health—anytime, anywhere! 🐶🐱🤍
            </p>
          </div>

          {/* Background Image */}
          <div className="absolute inset-0 flex items-center justify-center overflow-hidden z-0 pointer-events-none">
            <Image
              src={
                isDesktop
                  ? "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/pcbgnew-Ny84sl89KVbBHc7JqMStSegNZgFe6i.png"
                  : "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/mobilebgnew-2unXxGpt6Bsxd9TIjmeqw3hicVQ2mA.png"
              }
              alt=""
              width={1920}
              height={1080}
              className="w-full h-auto object-cover"
              priority
            />
          </div>

          <div className="w-full max-w-md space-y-8 z-10 mt-8">
            {/* Sign up buttons */}
            <div className="space-y-4">
              <Link
                href="/signup?role=pet-owner"
                className="w-full bg-white text-black font-semibold rounded-full py-3 px-6 flex items-center justify-center space-x-3 shadow-lg hover:bg-gray-50 transition-colors"
              >
                <Mail className="w-5 h-5" />
                <span>Sign Up as Pet Owner</span>
              </Link>

              <Link
                href="/signup?role=vet"
                className="w-full bg-blue-800 text-white font-semibold rounded-full py-3 px-6 flex items-center justify-center space-x-3 shadow-lg hover:bg-blue-700 transition-colors border-2 border-white"
              >
                <Mail className="w-5 h-5" />
                <span>Sign Up as Veterinary Staff</span>
              </Link>
            </div>

            {/* Sign in button */}
            <div className="space-y-4">
              <Link
                href="/login"
                className="w-full bg-white text-black font-semibold rounded-full py-3 px-6 flex items-center justify-center space-x-3 shadow-lg hover:bg-gray-50 transition-colors"
              >
                <Mail className="w-5 h-5" />
                <span>Sign In</span>
              </Link>

              {/* Install and Share buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/install"
                  className="flex-1 bg-blue-800 text-white font-semibold rounded-full py-3 px-6 flex items-center justify-center space-x-3 shadow-lg hover:bg-blue-700 transition-colors border-2 border-white"
                >
                  <Download className="w-5 h-5" />
                  <span>Install App</span>
                </Link>

                <button
                  onClick={handleShareApp}
                  className="flex-1 bg-blue-800 text-white font-semibold rounded-full py-3 px-6 flex items-center justify-center space-x-3 shadow-lg hover:bg-blue-700 transition-colors border-2 border-white"
                >
                  <Share className="w-5 h-5" />
                  <span>Share App</span>
                </button>
              </div>
            </div>

            {/* Terms */}
            <div className="text-center text-white text-sm mt-8">
              <p>
                By signing up to PetPulse, you agree to our <span className="underline hover:text-gray-100">Terms</span>{" "}
                & <span className="underline hover:text-gray-100">Privacy statement</span>
              </p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    // <div className="flex min-h-screen flex-col items-center justify-between p-24">
    //   <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex">
    //     <p className="fixed left-0 top-0 flex w-full justify-center border-b border-gray-300 bg-gradient-to-b from-zinc-200 pb-6 pt-8 backdrop-blur-2xl dark:border-neutral-800 dark:bg-zinc-800/30 dark:from-inherit lg:static lg:w-auto  lg:rounded-xl lg:border lg:bg-gray-200 lg:p-4 lg:dark:bg-zinc-800/30">
    //       Get started by editing&nbsp;
    //       <code className="font-mono font-bold">app/page.tsx</code>
    //     </p>
    //     <div className="fixed bottom-0 left-0 flex h-48 w-full items-end justify-center bg-gradient-to-t from-white via-white dark:from-black dark:via-black lg:static lg:h-auto lg:w-auto lg:bg-none">
    //       <a
    //         className="pointer-events-none flex place-items-center gap-2 p-8 lg:pointer-events-auto lg:p-0"
    //         href="https://vercel.com?utm_source=create-next-app&utm_medium=appdir-template&utm_campaign=create-next-app"
    //         target="_blank"
    //         rel="noopener noreferrer"
    //       >
    //         By{' '}
    //         <img
    //           src="/vercel.svg"
    //           alt="Vercel Logo"
    //           className="dark:invert"
    //           width={100}
    //           height={24}
    //         />
    //       </a>
    //     </div>
    //   </div>

    //   <div className="mb-32 grid text-center lg:max-w-5xl lg:w-full lg:mb-0 lg:grid-cols-4 lg:text-left">
    //     <a
    //       href="https://nextjs.org/docs?utm_source=create-next-app&utm_medium=appdir-template&utm_campaign=create-next-app"
    //       className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:dark:border-neutral-700 hover:dark:bg-neutral-800/30"
    //       target="_blank"
    //       rel="noopener noreferrer"
    //     >
    //       <h2 className={`mb-3 text-2xl font-semibold`}>
    //         Docs{' '}
    //         <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
    //           -&gt;
    //         </span>
    //       </h2>
    //       <p className={`m-0 max-w-[30ch] text-sm opacity-50`}>
    //         Find in-depth information about Next.js features and API.
    //       </p>
    //     </a>

    //     <a
    //       href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
    //       className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:dark:border-neutral-700 hover:dark:bg-neutral-800/30"
    //       target="_blank"
    //       rel="noopener noreferrer"
    //     >
    //       <h2 className={`mb-3 text-2xl font-semibold`}>
    //         Learn{' '}
    //         <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
    //           -&gt;
    //         </span>
    //       </h2>
    //       <p className={`m-0 max-w-[30ch] text-sm opacity-50`}>
    //         Learn about Next.js in an interactive course with&nbsp;quizzes!
    //       </p>
    //     </a>

    //     <a
    //       href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template&utm_campaign=create-next-app"
    //       className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:dark:border-neutral-700 hover:dark:bg-neutral-800/30"
    //       target="_blank"
    //       rel="noopener noreferrer"
    //     >
    //       <h2 className={`mb-3 text-2xl font-semibold`}>
    //         Templates{' '}
    //         <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
    //           -&gt;
    //         </span>
    //       </h2>
    //       <p className={`m-0 max-w-[30ch] text-sm opacity-50`}>
    //         Explore the Next.js 13 playground.
    //       </p>
    //     </a>

    //     <a
    //       href="https://vercel.com/new?utm_source=create-next-app&utm_medium=appdir-template&utm_campaign=create-next-app"
    //       className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:dark:border-neutral-700 hover:dark:bg-neutral-800/30"
    //       target="_blank"
    //       rel="noopener noreferrer"
    //     >
    //       <h2 className={`mb-3 text-2xl font-semibold`}>
    //         Deploy{' '}
    //         <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
    //           -&gt;
    //         </span>
    //       </h2>
    //       <p className={`m-0 max-w-[30ch] text-sm opacity-50`}>
    //         Instantly deploy your Next.js site to a shareable URL with Vercel.
    //       </p>
    //     </a>
    //   </div>

    //   <div className="mt-8 w-full max-w-md">
    //     <FirebaseConnectionStatus />
    //   </div>
    // </div>
    <div className="flex flex-col min-h-screen bg-[#FFFFFF]">
      <PageHeader title="Welcome back!" />
      <PetHeader />
      {user && selectedPet && (
        <div className="w-full max-w-4xl mx-auto px-6 py-4 mb-4">
          <PremiumBanner />
        </div>
      )}
      <main className={`flex-grow flex flex-col items-center p-6 ${user ? "pb-24 lg:pb-6" : ""}`}>
        {error ? (
          <div className="text-red-500 text-center">{error}</div>
        ) : loading ? (
          <div className="flex items-center justify-center w-full h-[70vh]">
            <div className="text-center">
              <div className="mb-4">
                <div className="inline-block">
                  <LoadingSpinner />
                </div>
              </div>
              <p className="text-gray-500">Loading your pet's information...</p>
            </div>
          </div>
        ) : user && !selectedPet ? (
          <div className="w-full max-w-4xl space-y-6">
            <div className="w-full mb-6">
              <PremiumBanner text="Upgrade to Premium for unlimited pets and advanced AI analysis" />

              <div className="bg-white rounded-xl shadow-lg p-8 text-center">
                <h2 className="text-3xl font-bold text-gray-800 mb-4">Welcome to PetPulse!</h2>
                <p className="text-lg text-gray-600 mb-8">
                  Track your pet's health, get AI-powered insights, and connect with veterinarians.
                </p>

                <Button
                  onClick={() => router.push("/pets")}
                  className="bg-[#2D57ED] text-white px-8 py-6 rounded-xl text-xl font-semibold flex items-center justify-center gap-3 shadow-[inset_0px_-13px_30px_0px_rgba(75,133,211,1)] mb-8"
                >
                  <span className="text-2xl">+</span> Add Your First Pet
                </Button>

                <h3 className="text-xl font-semibold text-gray-700 mb-4">Explore PetPulse Features</h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-purple-50 p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
                    <Sparkles className="w-10 h-10 text-purple-600 mx-auto mb-2" />
                    <h4 className="font-semibold text-purple-700">AI Analysis</h4>
                    <p className="text-sm text-gray-600">Get AI-powered insights about pet health</p>
                  </div>

                  <div className="bg-green-50 p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
                    <Activity className="w-10 h-10 text-green-600 mx-auto mb-2" />
                    <h4 className="font-semibold text-green-700">Health Tracking</h4>
                    <p className="text-sm text-gray-600">Monitor weight, activity, food intake and more</p>
                  </div>

                  <div className="bg-blue-50 p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
                    <Search className="w-10 h-10 text-blue-600 mx-auto mb-2" />
                    <h4 className="font-semibold text-blue-700">Find Vets</h4>
                    <p className="text-sm text-gray-600">Connect with veterinarians near you</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : selectedPet ? (
          <div className="w-full max-w-4xl space-y-6">
            {/* Health Dashboard */}
            <div className="w-full mb-6">
              <h3 className="text-2xl font-bold text-gray-600 mb-4">Health Dashboard</h3>
              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-gray-800 text-white p-4 rounded-lg shadow-lg col-span-1">
                  <div className="flex items-center mb-2">
                    <Heart className="w-8 h-8 mr-2" />
                    <span className="text-lg font-bold">Overall Health</span>
                  </div>
                  <p className="text-2xl md:text-4xl font-bold mb-2">
                    {estimateOverallHealth(healthRecords).status} {estimateOverallHealth(healthRecords).emoji}
                  </p>
                  <p className="text-xl font-semibold mb-2">
                    Score: {estimateOverallHealth(healthRecords).score.toFixed(1)} / 5
                  </p>
                  <p className="text-xs">Based on tracking</p>
                </Card>
                <Card className="bg-blue-50 border-blue-700 p-4 rounded-lg shadow-[inset_0px_-19px_50px_-20px_rgba(59,130,246,0.5)] h-48">
                  <div className="flex items-center text-blue-700 mb-2">
                    <Weight className="w-8 h-8 mr-2" />
                    <span className="text-lg font-bold">Weight</span>
                  </div>
                  <p className="text-2xl md:text-4xl font-bold mb-2">
                    {healthRecords.find((record) => record.weight)?.weight.toFixed(1) || "Not tracked"} kg
                  </p>
                  <p className="text-xs text-gray-600">
                    Latest tracked:{" "}
                    {healthRecords.find((record) => record.weight)
                      ? format(new Date(healthRecords.find((record) => record.weight)!.date), "MMM d, yyyy h:mm a")
                      : "N/A"}
                  </p>
                </Card>
                <Card className="bg-purple-50 border-purple-700 p-4 rounded-lg shadow-[inset_0px_-19px_50px_-20px_rgba(147,51,234,0.5)] h-48">
                  <div className="flex items-center text-purple-700 mb-2">
                    <Moon className="w-8 h-8 mr-2" />
                    <span className="text-lg font-bold">Sleep</span>
                  </div>
                  <p className="text-2xl md:text-4xl font-bold mb-2">
                    {healthRecords.find((record) => record.sleepDuration)?.sleepDuration.toFixed(1) || "Not tracked"}{" "}
                    hours
                  </p>
                  <p className="text-xs text-gray-600">
                    Latest tracked:{" "}
                    {healthRecords.find((record) => record.sleepDuration)
                      ? format(
                          new Date(healthRecords.find((record) => record.sleepDuration)!.date),
                          "MMM d, yyyy h:mm a",
                        )
                      : "N/A"}
                  </p>
                </Card>
                <Card className="bg-green-50 border-green-700 p-4 rounded-lg shadow-[inset_0px_-19px_50px_-20px_rgba(34,197,94,0.5)] h-48">
                  <div className="flex items-center text-green-700 mb-2">
                    <Activity className="w-8 h-8 mr-2" />
                    <span className="text-lg font-bold">Activity</span>
                  </div>
                  <p className="text-2xl md:text-4xl font-bold mb-2">
                    {healthRecords.find((record) => record.activityLevel)
                      ? getActivityLabel(healthRecords.find((record) => record.activityLevel)!.activityLevel)
                      : "Not tracked"}
                  </p>
                  <p className="text-xs text-gray-600">
                    Latest tracked:{" "}
                    {healthRecords.find((record) => record.activityLevel)
                      ? format(
                          new Date(healthRecords.find((record) => record.activityLevel)!.date),
                          "MMM d, yyyy h:mm a",
                        )
                      : "N/A"}
                  </p>
                </Card>
                <Card className="bg-orange-50 border-orange-700 p-4 rounded-lg shadow-[inset_0px_-19px_50px_-20px_rgba(249,115,22,0.5)] h-48">
                  <div className="flex items-center text-orange-700 mb-2">
                    <Utensils className="w-8 h-8 mr-2" />
                    <span className="text-lg font-bold">Food</span>
                  </div>
                  <p className="text-2xl md:text-4xl font-bold mb-2 capitalize">
                    {healthRecords.find((record) => record.foodIntake)?.foodIntake || "Not tracked"}
                  </p>
                  <p className="text-xs text-gray-600">
                    Latest tracked:{" "}
                    {healthRecords.find((record) => record.foodIntake)
                      ? format(new Date(healthRecords.find((record) => record.foodIntake)!.date), "MMM d, yyyy h:mm a")
                      : "N/A"}
                  </p>
                </Card>
                <Card className="bg-pink-50 border-pink-700 p-4 rounded-lg shadow-[inset_0px_-19px_50px_-20px_rgba(236,72,153,0.5)] h-48">
                  <div className="flex items-center text-pink-700 mb-2">
                    <Smile className="w-8 h-8 mr-2" />
                    <span className="text-lg font-bold">Behavior</span>
                  </div>
                  <p className="text-2xl md:text-4xl font-bold mb-2 capitalize">
                    {healthRecords.find((record) => record.behavior)?.behavior || "Not tracked"}
                  </p>
                  <p className="text-xs text-gray-600">
                    Latest tracked:{" "}
                    {healthRecords.find((record) => record.behavior)
                      ? format(new Date(healthRecords.find((record) => record.behavior)!.date), "MMM d, yyyy h:mm a")
                      : "N/A"}
                  </p>
                </Card>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="w-full mb-6">
              <h3 className="text-xl font-semibold text-gray-600 mb-4">Action Shortcuts</h3>
              <div className="flex flex-wrap gap-1">
                <Button
                  onClick={() => router.push("/analyze?autoAnalyze=true")}
                  className="flex-1 bg-purple-600 text-white px-4 py-3 rounded-xl flex items-center justify-center gap-2 bg-[#431170]  shadow-[inset_0px_-13px_30px_0px_rgba(133,75,211,1)]"
                >
                  <Sparkles className="w-5 h-5" />
                  <span>Analyze with AI</span>
                </Button>
                <Button
                  onClick={() => router.push("/analyze?type=symptom")}
                  className="flex-1 bg-green-600 text-white px-4 py-3 rounded-xl flex items-center justify-center gap-2 bg-[#17704A] text-white shadow-[inset_0px_-13px_30px_0px_rgba(75,211,133,1)]"
                >
                  <Search className="w-5 h-5" />
                  <span>Symptom Analyze</span>
                </Button>
                <Button
                  onClick={() => router.push("/analyze?type=stool")}
                  className="flex-1 bg-[#704317] text-white px-4 py-3 rounded-xl flex items-center justify-center gap-2 shadow-[inset_0px_-13px_30px_0px_rgba(211,133,75,1)]"
                >
                  <FileSearch className="w-5 h-5" />
                  <span>Stool Analyze</span>
                </Button>
                <Button
                  onClick={() => router.push("/trackall")}
                  className="flex-1 text-white px-4 py-3 rounded-xl flex items-center justify-center gap-2 bg-[#1D1870] text-white shadow-[inset_0px_-13px_30px_0px_rgba(76,85,212,1)]"
                >
                  <Activity className="w-5 h-5" />
                  <span>Track All</span>
                </Button>
                <Button
                  onClick={() => router.push("/install")}
                  className="flex-1 bg-[#0F766E] text-white px-4 py-3 rounded-xl flex items-center justify-center gap-2 shadow-[inset_0px_-13px_30px_0px_rgba(20,184,166,1)]"
                >
                  <Download className="w-5 h-5" />
                  <span>Install App</span>
                </Button>
                <Button
                  onClick={handleShareApp}
                  className="flex-1 bg-[#2D57ED] text-white px-4 py-3 rounded-xl flex items-center justify-center gap-2 shadow-[inset_0px_-13px_30px_0px_rgba(75,133,211,1)]"
                >
                  <Share className="w-5 h-5" />
                  <span>Share App</span>
                </Button>
              </div>
            </div>

            <MonthlyHealthCalendar />

            {/* Health Metrics */}
            {/* Tracked Metrics */}
            <div className="w-full space-y-3">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">Tracked Metrics</h2>
              <div className="space-y-3">
                {/* Weight Tracking */}
                <Link href="/weight-tracking" className="block">
                  <Card className="bg-blue-50 hover:bg-blue-100 shadow-[inset_0px_-19px_50px_-20px_rgba(59,130,246,0.5)]">
                    <CardContent className="p-4 flex flex-col h-full cursor-pointer">
                      <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-2">
                          <Weight className="w-5 h-5 text-blue-700" />
                          <h2 className="font-medium text-blue-700">Current Weight</h2>
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                          <span>
                            {healthRecords[0] && !isNaN(new Date(healthRecords[0].date).getTime())
                              ? format(new Date(healthRecords[0].date), "MMM d, yyyy")
                              : "N/A"}
                          </span>
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </div>
                      </div>
                      <h3 className="text-[1.7rem] font-bold">
                        {healthRecords.find((record) => record.weight)?.weight.toFixed(1) || "Not tracked"} kg
                      </h3>
                    </CardContent>
                  </Card>
                </Link>

                {/* Sleep Tracking */}
                <Link href="/sleep-tracking" className="block">
                  <Card className="bg-purple-50 hover:bg-purple-100 shadow-[inset_0px_-19px_50px_-20px_rgba(147,51,234,0.5)]">
                    <CardContent className="p-4 flex flex-col h-full cursor-pointer">
                      <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-2">
                          <Moon className="w-5 h-5 text-purple-700" />
                          <h2 className="font-medium text-purple-700">Sleep Duration</h2>
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                          <span>
                            {healthRecords[0] && !isNaN(new Date(healthRecords[0].date).getTime())
                              ? format(new Date(healthRecords[0].date), "MMM d, yyyy")
                              : "N/A"}
                          </span>
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </div>
                      </div>
                      <h3 className="text-[1.7rem] font-bold">
                        {healthRecords.find((record) => record.sleepDuration)?.sleepDuration.toFixed(1) ||
                          "Not tracked"}{" "}
                        hours
                      </h3>
                    </CardContent>
                  </Card>
                </Link>

                {/* Activity Level */}
                <Link href="/activity-level" className="block">
                  <Card className="bg-green-50 hover:bg-green-100 shadow-[inset_0px_-19px_50px_-20px_rgba(34,197,94,0.5)]">
                    <CardContent className="p-4 flex flex-col h-full cursor-pointer">
                      <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-2">
                          <Activity className="w-5 h-5 text-green-700" />
                          <h2 className="font-medium text-green-700">Activity Level</h2>
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                          <span>
                            {healthRecords[0] && !isNaN(new Date(healthRecords[0].date).getTime())
                              ? format(new Date(healthRecords[0].date), "MMM d, yyyy")
                              : "N/A"}
                          </span>
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </div>
                      </div>
                      <h3 className="text-[1.7rem] font-bold">
                        {healthRecords.find((record) => record.activityLevel)
                          ? getActivityLabel(healthRecords.find((record) => record.activityLevel)!.activityLevel)
                          : "Not tracked"}
                      </h3>
                    </CardContent>
                  </Card>
                </Link>

                {/* Food Intake */}
                <Link href="/food-intake" className="block">
                  <Card className="bg-orange-50 hover:bg-orange-100 shadow-[inset_0px_-19px_50px_-20px_rgba(249,115,22,0.5)]">
                    <CardContent className="p-4 flex flex-col h-full cursor-pointer">
                      <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-2">
                          <Utensils className="w-5 h-5 text-orange-700" />
                          <h2 className="font-medium text-orange-700">Food Intake</h2>
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                          <span>
                            {healthRecords[0] && !isNaN(new Date(healthRecords[0].date).getTime())
                              ? format(new Date(healthRecords[0].date), "MMM d, yyyy")
                              : "N/A"}
                          </span>
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </div>
                      </div>
                      <h3 className="text-[1.7rem] font-bold ">
                        {healthRecords.find((record) => record.foodIntake)?.foodIntake || "Not tracked"}
                      </h3>
                    </CardContent>
                  </Card>
                </Link>

                {/* Behavior */}
                <Link href="/behavior" className="block">
                  <Card className="bg-pink-50 hover:bg-pink-100 shadow-[inset_0px_-19px_50px_-20px_rgba(236,72,153,0.5)]">
                    <CardContent className="p-4 flex flex-col h-full cursor-pointer">
                      <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-2">
                          <Smile className="w-5 h-5 text-pink-700" />
                          <h2 className="font-medium text-pink-700">Current Behavior</h2>
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                          <span>
                            {healthRecords[0] && !isNaN(new Date(healthRecords[0].date).getTime())
                              ? format(new Date(healthRecords[0].date), "MMM d, yyyy")
                              : "N/A"}
                          </span>
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </div>
                      </div>
                      <h3 className="text-[1.7rem] font-bold ">
                        {healthRecords.find((record) => record.behavior)?.behavior || "Not tracked"}
                      </h3>
                    </CardContent>
                  </Card>
                </Link>

                {/* Medication */}
                <Link href="/medication" className="block">
                  <Card className="bg-blue-50 hover:bg-blue-100 shadow-[inset_0px_-19px_50px_-20px_rgba(59,130,246,0.5)]">
                    <CardContent className="p-4 flex flex-col h-full cursor-pointer">
                      <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-2">
                          <Pill className="w-5 h-5 text-blue-700" />
                          <h2 className="font-medium text-blue-700">Medication</h2>
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </div>
                      </div>
                      <h3 className="text-[1.7rem] font-bold ">
                        {healthRecords[0]?.medications
                          ? `${healthRecords[0].medications.length} medication(s)`
                          : "No medications"}
                      </h3>
                    </CardContent>
                  </Card>
                </Link>

                {/* Vaccines */}
                <Link href="/vaccines" className="block">
                  <Card className="bg-green-50 hover:bg-green-100 shadow-[inset_0px_-19px_50px_-20px_rgba(34,197,94,0.5)]">
                    <CardContent className="p-4 flex flex-col h-full cursor-pointer">
                      <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-2">
                          <Syringe className="w-5 h-5 text-green-700" />
                          <h2 className="font-medium text-green-700">Vaccines</h2>
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </div>
                      </div>
                      <h3 className="text-[1.7rem] font-bold ">
                        {healthRecords[0]?.vaccinations
                          ? `${healthRecords[0].vaccinations.length} vaccination(s)`
                          : "No vaccinations"}
                      </h3>
                    </CardContent>
                  </Card>
                </Link>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  )
}
