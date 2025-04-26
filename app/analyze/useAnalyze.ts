"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "../../contexts/AuthContext"
import { useSelectedPet } from "../../contexts/PetContext"
import {
  db,
  addDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  Timestamp,
  doc,
  getDoc,
  setDoc,
} from "@/lib/firebase"
import { useToast } from "@/components/ui/use-toast"
// Add import for the analysis utilities
import { generateSymptomAnalysis, generateComprehensiveAnalysis } from "@/lib/analysis-utils"

interface HealthRecord {
  id: string
  date: string
  weight: number
  activityLevel: number
  foodIntake: string
  sleepDuration: number
  behavior: string
  notes: string
}

interface AIAnalysis {
  id: string
  date: string
  type: "symptom" | "stool" | "comprehensive"
  analysis: string
}

interface PreviousAnalysis {
  id: string
  date: string
  type: "symptom" | "stool" | "comprehensive"
  analysis: string
}

export function useAnalyze() {
  const { user } = useAuth()
  const { selectedPet } = useSelectedPet()
  const [healthRecords, setHealthRecords] = useState<HealthRecord[]>([])
  const [symptoms, setSymptoms] = useState("")
  const [stoolImage, setStoolImage] = useState<File | null>(null)
  const [stoolImagePreview, setStoolImagePreview] = useState<string | null>(null)
  const [stoolAnalysis, setStoolAnalysis] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [symptomAnalysis, setSymptomAnalysis] = useState<string | null>(null)
  const [comprehensiveAnalysis, setComprehensiveAnalysis] = useState<string | null>(null)
  const [stoolLoading, setStoolLoading] = useState(false)
  const [stoolError, setStoolError] = useState<string | null>(null)
  const [aiAnalyses, setAiAnalyses] = useState<AIAnalysis[]>([])
  const [symptomLoading, setSymptomLoading] = useState(false)
  const [comprehensiveLoading, setComprehensiveLoading] = useState(false)
  const [comprehensiveAnalysisCount, setComprehensiveAnalysisCount] = useState(0)
  const { toast } = useToast()
  const [shouldRefetchAnalyses, setShouldRefetchAnalyses] = useState(false)
  const [analysis, setAnalysis] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [pastRecords, setPastRecords] = useState<HealthRecord[]>([])
  const [previousAnalyses, setPreviousAnalyses] = useState<PreviousAnalysis[]>([])
  const [hasPet, setHasPet] = useState(false)

  // Add this function to handle server-side stool analysis
  const callServerStoolAnalysis = async (imageBase64: string) => {
    try {
      const response = await fetch("/api/stool-analysis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image: imageBase64,
          petInfo: selectedPet
            ? {
                name: selectedPet.name,
                type: selectedPet.type,
                breed: selectedPet.breed,
                age: selectedPet.age,
              }
            : { name: "Unknown", type: "pet", breed: "unknown", age: undefined },
        }),
      })

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`)
      }

      return await response.text()
    } catch (error) {
      console.error("Error calling server for stool analysis:", error)
      throw error
    }
  }

  const getComprehensiveAnalysisCount = useCallback(async () => {
    if (!user || !selectedPet) return 0
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const countDocRef = doc(
        db,
        "comprehensiveAnalysisCounts",
        `${user.uid}_${selectedPet.id}_${today.toISOString().split("T")[0]}`,
      )
      const countDoc = await getDoc(countDocRef)

      if (countDoc.exists()) {
        return countDoc.data().count
      }
      return 0
    } catch (error) {
      console.error("Error fetching comprehensive analysis count:", error)
      return 0
    }
  }, [user, selectedPet])

  const updateComprehensiveAnalysisCount = useCallback(
    async (newCount: number) => {
      if (!user || !selectedPet) return
      try {
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const countDocRef = doc(
          db,
          "comprehensiveAnalysisCounts",
          `${user.uid}_${selectedPet.id}_${today.toISOString().split("T")[0]}`,
        )
        await setDoc(countDocRef, {
          count: newCount,
          date: Timestamp.fromDate(today),
          userId: user.uid,
          petId: selectedPet.id,
        })

        setComprehensiveAnalysisCount(newCount)
      } catch (error) {
        console.error("Error updating comprehensive analysis count:", error)
      }
    },
    [user, selectedPet],
  )

  const fetchHealthRecords = useCallback(async () => {
    if (!user || !selectedPet) return []
    try {
      const q = query(
        collection(db, "healthRecords"),
        where("userId", "==", user.uid),
        where("petId", "==", selectedPet.id),
        orderBy("date", "desc"),
        limit(5),
      )
      const querySnapshot = await getDocs(q)
      const records: HealthRecord[] = []
      querySnapshot.forEach((doc) => {
        records.push({ id: doc.id, ...doc.data() } as HealthRecord)
      })
      setHealthRecords(records)
      setLoading(false)
      return records
    } catch (error) {
      console.error("Error fetching health records:", error)
      setError("Failed to fetch health records. Please try again later.")
      setLoading(false)
      return []
    }
  }, [user, selectedPet])

  const fetchAIAnalyses = useCallback(async () => {
    if (!user || !selectedPet) return false
    try {
      const q = query(
        collection(db, "aiAnalyses"),
        where("userId", "==", user.uid),
        where("petId", "==", selectedPet.id),
        orderBy("date", "desc"),
      )
      const querySnapshot = await getDocs(q)
      const analyses: AIAnalysis[] = []
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        let formattedDate: string

        if (data.date instanceof Timestamp) {
          formattedDate = data.date.toDate().toISOString()
        } else if (typeof data.date === "string") {
          const parsedDate = new Date(data.date)
          formattedDate = isNaN(parsedDate.getTime()) ? "Invalid Date" : parsedDate.toISOString()
        } else {
          formattedDate = "Invalid Date"
        }
        analyses.push({
          id: doc.id,
          date: formattedDate,
          type: data.type,
          analysis: data.analysis,
        } as AIAnalysis)
      })
      setAiAnalyses(analyses)

      // Update hasRequiredAnalysis based on fetched analyses
      const hasRequired = analyses.some((analysis) => analysis.type === "symptom" || analysis.type === "stool")
      // setHasRequiredAnalysis(hasRequired)

      return true
    } catch (error) {
      console.error("Error fetching AI analyses:", error)
      setError("Failed to fetch AI analyses. Please try again later.")
      return false
    }
  }, [user, selectedPet])

  const fetchComprehensiveAnalysisCount = useCallback(async () => {
    if (!user || !selectedPet) {
      setComprehensiveAnalysisCount(0)
      return
    }
    try {
      const count = await getComprehensiveAnalysisCount()
      setComprehensiveAnalysisCount(count)
    } catch (error) {
      console.error("Error fetching comprehensive analysis count:", error)
      setError("Failed to fetch comprehensive analysis count. Please try again later.")
      setComprehensiveAnalysisCount(0)
    }
  }, [user, selectedPet, getComprehensiveAnalysisCount])

  const fetchPastData = useCallback(async () => {
    if (!user || !selectedPet) return

    // Fetch past 3 days of health records
    const threeDoysAgo = new Date()
    threeDoysAgo.setDate(threeDoysAgo.getDate() - 3)
    const healthRecordsQuery = query(
      collection(db, "healthRecords"),
      where("userId", "==", user.uid),
      where("petId", "==", selectedPet.id),
      where("date", ">=", threeDoysAgo.toISOString()),
      orderBy("date", "desc"),
      limit(3),
    )
    const healthRecordsSnapshot = await getDocs(healthRecordsQuery)
    const pastRecords = healthRecordsSnapshot.docs.map((doc) => doc.data() as HealthRecord)
    setPastRecords(pastRecords)

    // Fetch past 3 analyses
    const analysesQuery = query(
      collection(db, "aiAnalyses"),
      where("userId", "==", user.uid),
      where("petId", "==", selectedPet.id),
      orderBy("date", "desc"),
      limit(3),
    )
    const analysesSnapshot = await getDocs(analysesQuery)
    const previousAnalyses = analysesSnapshot.docs.map((doc) => doc.data() as PreviousAnalysis)
    setPreviousAnalyses(previousAnalyses)
  }, [user, selectedPet])

  // Replace the handleSubmit function with this implementation that doesn't use a route
  // Update the handleSubmit function to use these utilities
  const handleSubmit = async (e: React.FormEvent, isStool: boolean, isComprehensive: boolean) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setStoolError(null)

    if (isStool) {
      setStoolLoading(true)
    } else if (isComprehensive) {
      setComprehensiveLoading(true)
    } else {
      setSymptomLoading(true)
    }

    try {
      // Get pet info string and object
      const petInfo = selectedPet
        ? {
            name: selectedPet.name,
            type: selectedPet.type,
            breed: selectedPet.breed,
            age: selectedPet.age,
          }
        : { name: "Unknown", type: "pet", breed: "unknown", age: undefined }

      const petInfoString = selectedPet
        ? `${selectedPet.name}, a ${selectedPet.age ? `${selectedPet.age} year old ` : ""}${selectedPet.breed} ${selectedPet.type}`
        : "Unknown pet"

      // Determine analysis type
      const analysisType = isStool ? "stool" : isComprehensive ? "comprehensive" : "symptom"

      console.log("Performing analysis:", {
        analysisType,
        petInfo: petInfoString,
        inputText: symptoms,
      })

      let analysisResult = ""
      let shouldSaveAnalysis = true

      if (isStool) {
        try {
          if (!stoolImage) {
            throw new Error("Please upload a stool image for analysis")
          }

          // Convert image to base64
          const imageBase64 = await convertToBase64(stoolImage)

          // Call server-side API instead of direct Gemini API call
          const stoolAnalysisResult = await callServerStoolAnalysis(imageBase64)

          console.log("Stool analysis result received:", stoolAnalysisResult ? "Non-empty result" : "EMPTY RESULT")

          // Check if no stool is detected in the image
          if (stoolAnalysisResult.includes("NO STOOL VISIBLE IN IMAGE")) {
            setStoolError("No stool detected in the image. Please upload a clear image of pet stool.")
            shouldSaveAnalysis = false
            setStoolAnalysis(null)
          } else {
            setStoolAnalysis(stoolAnalysisResult)
            analysisResult = stoolAnalysisResult
          }
        } catch (stoolError) {
          console.error("Error processing stool analysis:", stoolError)
          setStoolError(`Error processing stool analysis: ${stoolError.message}`)
          throw stoolError
        }
      } else if (isComprehensive) {
        // Fetch health records for comprehensive analysis
        const records = await fetchHealthRecords()

        // Generate comprehensive analysis with real data
        analysisResult = await generateComprehensiveAnalysis(petInfoString, records, aiAnalyses)
        setComprehensiveAnalysis(analysisResult)

        // Update comprehensive analysis count
        const currentCount = await getComprehensiveAnalysisCount()
        await updateComprehensiveAnalysisCount(currentCount + 1)
      } else {
        // Generate symptom analysis with real data
        analysisResult = await generateSymptomAnalysis(symptoms, petInfoString)
        setSymptomAnalysis(analysisResult)
      }

      // Save the analysis to Firestore only if it should be saved
      if (shouldSaveAnalysis && user && selectedPet && analysisResult) {
        try {
          await addDoc(collection(db, "aiAnalyses"), {
            userId: user.uid,
            petId: selectedPet.id,
            date: new Date().toISOString(),
            type: analysisType,
            analysis: analysisResult,
            createdAt: new Date().toISOString(),
          })

          console.log("Analysis saved to Firestore")

          // Refresh the analyses list
          fetchAIAnalyses()
        } catch (firestoreError) {
          console.error("Error saving analysis to Firestore:", firestoreError)
          // Continue even if saving to Firestore fails
        }
      }
    } catch (error) {
      console.error("Error in analyze:", error)
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred"
      if (isStool) {
        setStoolError(errorMessage)
      } else if (isComprehensive) {
        setError(errorMessage)
      } else {
        setError(errorMessage)
      }
    } finally {
      setLoading(false)
      if (isStool) {
        setStoolLoading(false)
      } else if (isComprehensive) {
        setComprehensiveLoading(false)
      } else {
        setSymptomLoading(false)
      }
    }
  }

  useEffect(() => {
    if (user && selectedPet) {
      fetchComprehensiveAnalysisCount()
    }
  }, [user, selectedPet, fetchComprehensiveAnalysisCount])

  useEffect(() => {
    if (user && selectedPet) {
      fetchAIAnalyses()
      fetchComprehensiveAnalysisCount()
    }
  }, [user, selectedPet, fetchAIAnalyses, fetchComprehensiveAnalysisCount])

  useEffect(() => {
    setSymptomAnalysis(null)
    setStoolAnalysis(null)
    setComprehensiveAnalysis(null)
    setAiAnalyses([])
    setComprehensiveAnalysisCount(0)
    // setHasRequiredAnalysis(false)
    setStoolImage(null)
    setStoolImagePreview(null)
    setSymptoms("")
    fetchHealthRecords()
    fetchAIAnalyses()
    fetchComprehensiveAnalysisCount()
    // checkRequiredAnalysis()
  }, [fetchHealthRecords, fetchAIAnalyses, fetchComprehensiveAnalysisCount])

  useEffect(() => {
    setHasPet(!!selectedPet)
  }, [selectedPet])

  useEffect(() => {
    if (user && selectedPet) {
      fetchHealthRecords()
      fetchAIAnalyses()
      fetchComprehensiveAnalysisCount()
      fetchPastData()
    } else {
      setLoading(false)
      setAiAnalyses([])
      setPastRecords([])
      setPreviousAnalyses([])
    }
  }, [user, selectedPet, fetchHealthRecords, fetchAIAnalyses, fetchComprehensiveAnalysisCount, fetchPastData])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setStoolImage(file)
      setStoolImagePreview(URL.createObjectURL(file))
    }
  }

  const removeImage = () => {
    setStoolImage(null)
    setStoolImagePreview(null)
  }

  const handleRefresh = async () => {
    const success = await fetchAIAnalyses()
    if (success) {
      toast({
        title: "Refreshed",
        description: "Analysis reports have been updated.",
      })
    } else {
      toast({
        title: "Refresh failed",
        description: "Unable to update analysis reports. Please try again.",
        variant: "destructive",
      })
    }
  }

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => {
        const base64String = reader.result as string
        resolve(base64String)
      }
      reader.onerror = (error) => {
        reject(error)
      }
    })
  }

  return {
    user,
    selectedPet,
    healthRecords,
    symptoms,
    setSymptoms,
    stoolImage,
    stoolImagePreview,
    stoolAnalysis,
    loading,
    error,
    symptomAnalysis,
    comprehensiveAnalysis,
    stoolLoading,
    stoolError,
    aiAnalyses,
    symptomLoading,
    comprehensiveLoading,
    comprehensiveAnalysisCount,
    handleSubmit,
    handleImageChange,
    removeImage,
    handleRefresh,
    analysis,
    isLoading,
    pastRecords,
    previousAnalyses,
    hasPet,
  }
}
