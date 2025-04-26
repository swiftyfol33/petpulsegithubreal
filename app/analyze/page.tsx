"use client"

import { useRef, useState, useEffect } from "react"
import { PageHeader } from "../../components/page-header"
import { PetHeader } from "../../components/pet-header"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  AlertTriangle,
  Upload,
  ImageIcon,
  Loader2,
  X,
  Sparkles,
  Copy,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from "lucide-react"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useSearchParams } from "next/navigation"
import { useAnalyze } from "./useAnalyze"
import { format } from "date-fns"
import { useSelectedPet } from "@/contexts/PetContext"
import { useRouter } from "next/navigation"
import { doc, getDoc } from "firebase/firestore"
import { db } from "../../lib/firebase"

interface StoolAnalysisResult {
  analysis?: string
  potentialIssues?: string
  abnormalities: string[]
  recommendations?: string
}

// Simplified formatStoolAnalysis function to just show raw reply
const formatStoolAnalysis = (analysis: string | object) => {
  console.log("Formatting stool analysis:", analysis)
  console.log("Analysis type:", typeof analysis)

  if (analysis === null || analysis === undefined) {
    console.error("Analysis is null or undefined")
    return <div className="text-red-500">No analysis data available</div>
  }

  // If the analysis is already a string, just return it directly
  if (typeof analysis === "string") {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="text-white whitespace-pre-wrap">{analysis}</div>
        </div>
      </div>
    )
  }

  // If it's an object, convert to JSON string
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="text-white whitespace-pre-wrap">{JSON.stringify(analysis, null, 2)}</div>
      </div>
    </div>
  )
}

const formatAnalysisText = (text: string) => {
  // Replace #### headings with h3
  text = text.replace(/####\s(.*?)(\n|$)/g, '<h3 class="text-xl font-semibold mt-4 mb-2">$1</h3>')

  // Replace ### headings with h4
  text = text.replace(/###\s(.*?)(\n|$)/g, '<h4 class="text-lg font-semibold mt-3 mb-2">$1</h4>')

  // Replace **text** with bold
  text = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")

  return <div dangerouslySetInnerHTML={{ __html: text }} />
}

export default function AnalyzePage() {
  const router = useRouter()
  const { selectedPet } = useSelectedPet()
  const {
    user,
    symptoms,
    setSymptoms,
    stoolImage: existingStoolImage,
    stoolImagePreview,
    stoolAnalysis,
    loading,
    stoolLoading,
    stoolError,
    aiAnalyses,
    symptomLoading,
    comprehensiveLoading,
    comprehensiveAnalysisCount,
    symptomAnalysis,
    comprehensiveAnalysis,
    handleSubmit,
    handleImageChange,
    removeImage,
    handleRefresh,
  } = useAnalyze()

  const [activeTab, setActiveTab] = useState("analyze")
  const [collapsedReports, setCollapsedReports] = useState<string[]>([])
  const [symptomCollapsed, setSymptomCollapsed] = useState(false)
  const [stoolCollapsed, setStoolCollapsed] = useState(false)
  const [comprehensiveCollapsed, setComprehensiveCollapsed] = useState(false)
  const [isComprehensive, setIsComprehensive] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [analysis, setAnalysis] = useState("")
  const [input, setInput] = useState("")
  const [error, setError] = useState<string>("")
  const [hasSymptomAnalysis, setHasSymptomAnalysis] = useState(false)
  const [hasStoolAnalysis, setHasStoolAnalysis] = useState(false)
  const [isPremium, setIsPremium] = useState(false)
  const [hasUsedFreeTrial, setHasUsedFreeTrial] = useState(false)

  const stoolFileInputRef = useRef<HTMLInputElement>(null)
  const searchParams = useSearchParams()
  const defaultTab = searchParams.get("tab") || "analyze"

  useEffect(() => {
    // We'll just check if a pet is selected but not redirect automatically
    console.log("Pet selection status:", selectedPet ? "Selected" : "Not selected")
  }, [selectedPet])

  useEffect(() => {
    console.log("useEffect triggered - aiAnalyses or selectedPet changed")
    console.log("Current aiAnalyses:", aiAnalyses)
    console.log("Current selectedPet:", selectedPet)

    if (aiAnalyses.length > 0 && selectedPet) {
      const petAnalyses = aiAnalyses.filter((analysis) => analysis.petId === selectedPet.id)
      console.log("Filtered petAnalyses:", petAnalyses)

      const newHasSymptomAnalysis = petAnalyses.some((analysis) => analysis.type === "symptom")
      const newHasStoolAnalysis = petAnalyses.some((analysis) => analysis.type === "stool")

      console.log("New hasSymptomAnalysis:", newHasSymptomAnalysis)
      console.log("New hasStoolAnalysis:", newHasStoolAnalysis)

      setHasSymptomAnalysis(newHasSymptomAnalysis)
      setHasStoolAnalysis(newHasStoolAnalysis)
    } else {
      console.log("Resetting hasSymptomAnalysis and hasStoolAnalysis to false")
      setHasSymptomAnalysis(false)
      setHasStoolAnalysis(false)
    }
  }, [aiAnalyses, selectedPet])

  useEffect(() => {
    const checkPremiumStatus = async () => {
      if (!user) {
        setIsPremium(false)
        return
      }

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid))
        if (userDoc.exists()) {
          const userData = userDoc.data()
          // Check for subscription status, admin-granted premium, or premium flag
          setIsPremium(
            userData.subscriptionStatus === "active" ||
              userData.isPremium === true ||
              userData.adminGrantedPremium === true ||
              (userData.subscription &&
                (userData.subscription.status === "active" || userData.subscription.status === "trialing")),
          )

          // Check if user has already used their free trial
          setHasUsedFreeTrial(userData.hasUsedFreeTrial === true)
        }
      } catch (error) {
        console.error("Error checking premium status:", error)
      }
    }

    checkPremiumStatus()
  }, [user])

  const triggerFileInput = () => {
    stoolFileInputRef.current?.click()
  }

  const toggleReport = (id: string) => {
    if (collapsedReports.includes(id)) {
      setCollapsedReports(collapsedReports.filter((reportId) => reportId !== id))
    } else {
      setCollapsedReports([...collapsedReports, id])
    }
  }

  const collapseAllReports = () => {
    if (aiAnalyses.length === collapsedReports.length) {
      setCollapsedReports([])
    } else {
      setCollapsedReports(aiAnalyses.map((analysis) => analysis.id))
    }
  }

  const copyAnalysis = (analysis: string) => {
    navigator.clipboard
      .writeText(analysis)
      .then(() => {
        console.log("Analysis copied to clipboard")
      })
      .catch((err) => {
        console.error("Failed to copy analysis:", err)
      })
  }

  const handleTabChange = (value: string) => {
    setActiveTab(value)
  }

  // Remove this duplicate declaration
  // The handleSubmit function is already provided by the useAnalyze hook
  // const handleSubmit = async (e: React.FormEvent, isStool: boolean, isComprehensive: boolean) => {
  //   e.preventDefault()
  //   console.log("handleSubmit called - isStool:", isStool, "isComprehensive:", isComprehensive)

  //   // ... existing code ...

  //   if (isStool) {
  //     console.log("Stool analysis completed")
  //     // Existing stool analysis code
  //   } else if (isComprehensive) {
  //     console.log("Comprehensive analysis completed")
  //     // Existing comprehensive analysis code
  //   } else {
  //     console.log("Symptom analysis completed")
  //     // Existing symptom analysis code
  //   }

  //   // After analysis is complete
  //   console.log("Analysis complete, updating aiAnalyses")
  //   // Make sure to update aiAnalyses here if it's not already being updated
  // }

  console.log("Rendering AnalyzePage - Current state:", {
    hasSymptomAnalysis,
    hasStoolAnalysis,
    comprehensiveAnalysisCount,
    selectedPet,
  })

  // Update the condition for the comprehensive analysis button
  const isComprehensiveButtonDisabled =
    comprehensiveLoading ||
    (!isPremium && comprehensiveAnalysisCount >= 3) ||
    (aiAnalyses.length === 0 && !hasSymptomAnalysis && !hasStoolAnalysis)

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <PageHeader title="AI Pet Health Analyze" />
      <PetHeader />

      {!isPremium && (
        <div className="w-full max-w-4xl mx-auto my-6 p-6 bg-white rounded-lg shadow-md border border-gray-200">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold text-gray-800">Premium Feature</h2>
            <p className="text-gray-600">
              The AI Pet Health Analysis is available exclusively for premium subscribers and trial users.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4 mt-6">
              {!hasUsedFreeTrial ? (
                <Button
                  onClick={() => router.push("/subscribe")}
                  className="bg-[#17704A] hover:bg-[#145d3e] text-white shadow-[inset_0px_-13px_30px_0px_rgba(75,211,133,1)]"
                >
                  Start 7-Day Free Trial
                </Button>
              ) : (
                <Button
                  onClick={() => router.push("/subscribe")}
                  className="bg-[#17704A] hover:bg-[#145d3e] text-white shadow-[inset_0px_-13px_30px_0px_rgba(75,211,133,1)]"
                >
                  Subscribe Now
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      <main className="flex-grow flex flex-col items-center p-6 pb-24 lg:pb-6">
        <div className="w-full max-w-4xl space-y-6">
          {selectedPet ? (
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
              <TabsList className="grid w-full grid-cols-2 w-full max-w-2xl m-auto">
                <TabsTrigger value="analyze">Analyze</TabsTrigger>
                <TabsTrigger value="reports">Reports</TabsTrigger>
              </TabsList>
              <TabsContent value="analyze">
                {selectedPet ? (
                  <>
                    {isPremium ? (
                      <div className="w-full max-w-2xl space-y-6 m-auto">
                        {/* Symptom Analysis Section */}
                        <Card className="w-full max-w-2xl mb-6 bg-[#17704A] text-white shadow-[inset_0px_-13px_30px_0px_rgba(75,211,133,1)]">
                          <CardHeader>
                            <CardTitle className="text-2xl font-bold">Symptom Analysis</CardTitle>
                            <CardDescription className="text-white/80">
                              Analyze your pet's symptoms and get AI-powered health insights.
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <form onSubmit={(e) => handleSubmit(e, false, false)} className="space-y-6">
                              <div className="space-y-2">
                                <label htmlFor="symptoms" className="block text-sm font-medium text-white">
                                  Describe your pet's symptoms
                                </label>
                                <Textarea
                                  id="symptoms"
                                  value={symptoms}
                                  onChange={(e) => setSymptoms(e.target.value)}
                                  required
                                  className="min-h-[120px] resize-none bg-[#17704A] text-white shadow-[inset_0px_-13px_30px_0px_rgba(75,211,133,1)] placeholder-white"
                                />
                              </div>

                              <Button
                                type="submit"
                                disabled={symptomLoading}
                                className="w-full bg-[#17704A] text-white shadow-[inset_0px_-13px_30px_0px_rgba(75,211,133,1)]"
                              >
                                {symptomLoading ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Analyzing...
                                  </>
                                ) : (
                                  <>
                                    Analyze Symptoms
                                    <Upload className="ml-2 h-4 w-4" />
                                  </>
                                )}
                              </Button>
                            </form>

                            <AnimatePresence>
                              {error && !isComprehensive && (
                                <motion.div
                                  initial={{ opacity: 0, y: 20 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -20 }}
                                  className="mt-6"
                                >
                                  <Alert variant="destructive">
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertTitle>Error</AlertTitle>
                                    <AlertDescription>
                                      <div className="space-y-2">
                                        <p>{error}</p>
                                        {error.includes("Unexpected response format") && (
                                          <div className="mt-2 text-sm bg-red-100/20 p-2 rounded">
                                            <p className="font-semibold">Technical Details:</p>
                                            <p>
                                              The server response was not in the expected JSON format. This could be due
                                              to:
                                            </p>
                                            <ul className="list-disc pl-5 mt-1">
                                              <li>API endpoint returning incorrect content type</li>
                                              <li>Network issues or proxy interference</li>
                                              <li>Server-side error in processing the request</li>
                                              <li>Server-side error in processing the request</li>
                                            </ul>
                                            <p className="mt-1">Try refreshing the page or try again later.</p>
                                          </div>
                                        )}
                                      </div>
                                    </AlertDescription>
                                  </Alert>
                                </motion.div>
                              )}

                              {symptomAnalysis && (
                                <motion.div
                                  initial={{ opacity: 0, y: 20 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -20 }}
                                  className="mt-6 p-4 rounded-lg shadow-lg bg-[#17704A] text-white shadow-[inset_0px_-13px_30px_0px_rgba(75,211,133,1)]"
                                >
                                  <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-semibold text-lg text-white">AI Symptom Analysis Result:</h3>
                                    <div className="flex flex-col space-y-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="bg-[#17704A] text-white hover:bg-[#1c8159] transition-colors shadow-[inset_0px_-13px_30px_0px_rgba(75,211,133,1)]"
                                        onClick={() => setSymptomCollapsed(!symptomCollapsed)}
                                      >
                                        {symptomCollapsed ? (
                                          <>
                                            <ChevronDown className="h-4 w-4 mr-2" />
                                            Expand
                                          </>
                                        ) : (
                                          <>
                                            <ChevronUp className="h-4 w-4 mr-2" />
                                            Collapse
                                          </>
                                        )}
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="bg-[#17704A] text-white hover:bg-[#1c8159] transition-colors shadow-[inset_0px_-13px_30px_0px_rgba(75,211,133,1)]"
                                        onClick={() => copyAnalysis(symptomAnalysis)}
                                      >
                                        <Copy className="h-4 w-4 mr-2" />
                                        Copy
                                      </Button>
                                    </div>
                                  </div>
                                  {!symptomCollapsed && (
                                    <div className="text-white">{formatAnalysisText(symptomAnalysis)}</div>
                                  )}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </CardContent>
                        </Card>

                        {/* Stool Analysis Section */}
                        <Card className="w-full max-w-2xl mb-6 bg-[#704317] text-white shadow-[inset_0px_-13px_30px_0px_rgba(211,133,75,1)]">
                          <CardHeader>
                            <CardTitle className="text-2xl font-bold">Stool Analysis</CardTitle>
                            <CardDescription className="text-white/80">
                              Upload a photo of your pet's stool for AI analysis.
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <form onSubmit={(e) => handleSubmit(e, true, false)} className="space-y-6">
                              <div className="space-y-2">
                                <label htmlFor="stool-image" className="block text-sm font-medium text-white">
                                  Upload a photo of your pet's stool
                                </label>
                                <input
                                  id="stool-image"
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => handleImageChange(e)}
                                  className="hidden"
                                  ref={stoolFileInputRef}
                                  required
                                />
                                <div className="flex items-center space-x-2">
                                  <Button
                                    type="button"
                                    onClick={() => triggerFileInput()}
                                    className="w-full bg-[#704317] text-white shadow-[inset_0px_-13px_30px_0px_rgba(211,133,75,1)]"
                                  >
                                    {existingStoolImage ? "Change Image" : "Upload Stool Image"}
                                    <ImageIcon className="ml-2 h-4 w-4" />
                                  </Button>
                                  {existingStoolImage && (
                                    <Button
                                      type="button"
                                      onClick={() => removeImage()}
                                      variant="destructive"
                                      size="icon"
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </div>

                              <AnimatePresence>
                                {stoolImagePreview && (
                                  <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden"
                                  >
                                    <Image
                                      src={stoolImagePreview || "/placeholder.svg"}
                                      alt="Uploaded stool"
                                      layout="fill"
                                      objectFit="cover"
                                      className="rounded-lg"
                                    />
                                  </motion.div>
                                )}
                              </AnimatePresence>

                              <Button
                                type="submit"
                                disabled={stoolLoading || !existingStoolImage}
                                className="w-full bg-[#704317] text-white shadow-[inset_0px_-13px_30px_0px_rgba(211,133,75,1)]"
                              >
                                {stoolLoading ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Analyzing...
                                  </>
                                ) : (
                                  <>
                                    Analyze Stool
                                    <Upload className="ml-2 h-4 w-4" />
                                  </>
                                )}
                              </Button>
                            </form>

                            <AnimatePresence>
                              {stoolError && (
                                <motion.div
                                  initial={{ opacity: 0, y: 20 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -20 }}
                                  className="mt-6"
                                >
                                  <Alert variant="destructive">
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertTitle>Error</AlertTitle>
                                    <AlertDescription>
                                      {stoolError}
                                      {stoolError === "An unexpected error occurred. Please try again." && (
                                        <p className="mt-2 text-sm">
                                          If this error persists, please check your internet connection and try again
                                          later. If the problem continues, contact support.
                                        </p>
                                      )}
                                    </AlertDescription>
                                  </Alert>
                                </motion.div>
                              )}

                              {!stoolLoading && stoolAnalysis && !stoolError && (
                                <motion.div
                                  initial={{ opacity: 0, y: 20 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -20 }}
                                  className="mt-6 p-4 rounded-lg shadow-lg bg-[#704317] text-white shadow-[inset_0px_-13px_30px_0px_rgba(211,133,75,1)]"
                                >
                                  <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-semibold text-lg text-white">AI Stool Analysis Result:</h3>
                                    <div className="flex flex-col space-y-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="bg-[#704317] text-white hover:bg-[#85521c] transition-colors shadow-[inset_0px_-13px_30px_0px_rgba(211,133,75,1)]"
                                        onClick={() => setStoolCollapsed(!stoolCollapsed)}
                                      >
                                        {stoolCollapsed ? (
                                          <>
                                            <ChevronDown className="h-4 w-4 mr-2" />
                                            Expand
                                          </>
                                        ) : (
                                          <>
                                            <ChevronUp className="h-4 w-4 mr-2" />
                                            Collapse
                                          </>
                                        )}
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="bg-[#704317] text-white hover:bg-[#85521c] transition-colors shadow-[inset_0px_-13px_30px_0px_rgba(211,133,75,1)]"
                                        onClick={() =>
                                          copyAnalysis(
                                            typeof stoolAnalysis === "string"
                                              ? stoolAnalysis
                                              : JSON.stringify(stoolAnalysis, null, 2),
                                          )
                                        }
                                      >
                                        <Copy className="h-4 w-4 mr-2" />
                                        Copy
                                      </Button>
                                    </div>
                                  </div>
                                  {!stoolCollapsed && (
                                    <div className="text-white">{formatStoolAnalysis(stoolAnalysis)}</div>
                                  )}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </CardContent>
                        </Card>

                        {/* Comprehensive Analysis Section */}
                        <Card className="w-full max-w-2xl mb-6 bg-[#431170] text-white shadow-[inset_0px_-13px_30px_0px_rgba(133,75,211,1)]">
                          <CardHeader>
                            <CardTitle className="text-2xl font-bold">Comprehensive Health AI Analysis</CardTitle>
                            <CardDescription className="text-white/80">
                              Get in-depth insights on your pet's overall health based on historical records and current
                              data.
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <form
                              onSubmit={(e) => {
                                setIsComprehensive(true)
                                handleSubmit(e, false, true)
                              }}
                              className="space-y-6"
                            >
                              <Button
                                type="submit"
                                disabled={isComprehensiveButtonDisabled}
                                className="w-full bg-[#431170] text-white shadow-[inset_0px_-13px_30px_0px_rgba(133,75,211,1)]"
                                onClick={() => {
                                  console.log("Comprehensive analysis button clicked")
                                  console.log("Current state:", {
                                    hasSymptomAnalysis,
                                    hasStoolAnalysis,
                                    comprehensiveAnalysisCount,
                                    aiAnalysesLength: aiAnalyses.length,
                                    isButtonDisabled: isComprehensiveButtonDisabled,
                                  })
                                }}
                              >
                                {comprehensiveLoading ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Analyzing...
                                  </>
                                ) : (
                                  <>
                                    {aiAnalyses.length > 0 || hasSymptomAnalysis || hasStoolAnalysis ? (
                                      <>
                                        Analyze with AI{" "}
                                        {isPremium ? "(Unlimited)" : `(${3 - comprehensiveAnalysisCount} left today)`}
                                        <Sparkles className="ml-2 h-4 w-4" />
                                      </>
                                    ) : (
                                      "Complete an analysis first"
                                    )}
                                  </>
                                )}
                              </Button>
                              {aiAnalyses.length === 0 && !hasSymptomAnalysis && !hasStoolAnalysis && (
                                <p className="text-sm text-white/80 mt-2">
                                  Please complete a Symptom Analysis, Stool Analysis, or have previous analyses
                                  available before requesting a Comprehensive Analysis.
                                </p>
                              )}
                            </form>

                            <AnimatePresence>
                              {error && isComprehensive && (
                                <motion.div
                                  initial={{ opacity: 0, y: 20 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -20 }}
                                  className="mt-6"
                                >
                                  <Alert variant="destructive">
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertTitle>Error</AlertTitle>
                                    <AlertDescription>
                                      <div className="space-y-2">
                                        <p>{error}</p>
                                        {error.includes("Unexpected response format") && (
                                          <div className="mt-2 text-sm bg-red-100/20 p-2 rounded">
                                            <p className="font-semibold">Technical Details:</p>
                                            <p>
                                              The server response was not in the expected JSON format. This could be due
                                              to:
                                            </p>
                                            <ul className="list-disc pl-5 mt-1">
                                              <li>API endpoint returning incorrect content type</li>
                                              <li>Network issues or proxy interference</li>
                                              <li>Server-side error in processing the request</li>
                                            </ul>
                                            <p className="mt-1">Try refreshing the page or try again later.</p>
                                          </div>
                                        )}
                                        {error === "An unexpected error occurred. Please try again." && (
                                          <p className="mt-2 text-sm">
                                            If this error persists, please check your internet connection and try again
                                            later. If the problem continues, contact support.
                                          </p>
                                        )}
                                      </div>
                                    </AlertDescription>
                                  </Alert>
                                </motion.div>
                              )}

                              {comprehensiveAnalysis && (
                                <motion.div
                                  initial={{ opacity: 0, y: 20 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -20 }}
                                  className="mt-6 p-4 rounded-lg shadow-lg bg-[#431170] text-white shadow-[inset_0px_-13px_30px_0px_rgba(133,75,211,1)]"
                                >
                                  <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-semibold text-lg text-white">
                                      AI Comprehensive Health Analysis Result:
                                    </h3>
                                    <div className="flex flex-col space-y-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="bg-[#431170] text-white hover:bg-[#521586] transition-colors shadow-[inset_0px_-13px_30px_0px_rgba(133,75,211,1)]"
                                        onClick={() => setComprehensiveCollapsed(!comprehensiveCollapsed)}
                                      >
                                        {comprehensiveCollapsed ? (
                                          <>
                                            <ChevronDown className="h-4 w-4 mr-2" />
                                            Expand
                                          </>
                                        ) : (
                                          <>
                                            <ChevronUp className="h-4 w-4 mr-2" />
                                            Collapse
                                          </>
                                        )}
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="bg-[#431170] text-white hover:bg-[#521586] transition-colors shadow-[inset_0px_-13px_30px_0px_rgba(133,75,211,1)]"
                                        onClick={() => copyAnalysis(comprehensiveAnalysis)}
                                      >
                                        <Copy className="h-4 w-4 mr-2" />
                                        Copy
                                      </Button>
                                    </div>
                                  </div>
                                  {!comprehensiveCollapsed && (
                                    <div className="text-white">{formatAnalysisText(comprehensiveAnalysis)}</div>
                                  )}
                                </motion.div>
                              )}
                            </AnimatePresence>
                            <div className="mt-6 !hidden">
                              <h4 className="text-lg font-semibold mb-2">Previous Analyses:</h4>
                              {aiAnalyses.length === 0 ? (
                                <p>No previous analyses available.</p>
                              ) : (
                                <ul className="space-y-2">
                                  {aiAnalyses.map((analysis) => (
                                    <li
                                      key={analysis.id}
                                      className="flex justify-between items-center bg-[#5a1e99] p-2 rounded-md"
                                    >
                                      <span>
                                        {analysis.type.charAt(0).toUpperCase() + analysis.type.slice(1)} Analysis
                                      </span>
                                      <span>{format(new Date(analysis.date), "MMMM d, yyyy 'at' h:mm a")}</span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </CardContent>
                        </Card>

                        <Alert variant="warning" className="mt-8 max-w-2xl">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertTitle>Disclaimer</AlertTitle>
                          <AlertDescription>
                            This AI-powered health analyzer is for informational purposes only and should not replace
                            professional veterinary advice, diagnosis, or treatment. Always consult with a qualified
                            veterinarian for pet health concerns.
                          </AlertDescription>
                        </Alert>
                      </div>
                    ) : (
                      <div className="w-full max-w-2xl space-y-6 m-auto opacity-50 pointer-events-none">
                        {/* Disabled Symptom Analysis Section - same content but disabled */}
                        <Card className="w-full max-w-2xl mb-6 bg-[#17704A] text-white shadow-[inset_0px_-13px_30px_0px_rgba(75,211,133,1)]">
                          <CardHeader>
                            <CardTitle className="text-2xl font-bold">Symptom Analysis</CardTitle>
                            <CardDescription className="text-white/80">
                              Analyze your pet's symptoms and get AI-powered health insights.
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <form className="space-y-6">
                              <div className="space-y-2">
                                <label htmlFor="symptoms" className="block text-sm font-medium text-white">
                                  Describe your pet's symptoms
                                </label>
                                <Textarea
                                  id="symptoms"
                                  disabled
                                  className="min-h-[120px] resize-none bg-[#17704A] text-white shadow-[inset_0px_-13px_30px_0px_rgba(75,211,133,1)] placeholder-white"
                                />
                              </div>

                              <Button
                                type="button"
                                disabled
                                className="w-full bg-[#17704A] text-white shadow-[inset_0px_-13px_30px_0px_rgba(75,211,133,1)]"
                              >
                                Analyze Symptoms
                                <Upload className="ml-2 h-4 w-4" />
                              </Button>
                            </form>
                          </CardContent>
                        </Card>

                        {/* Disabled Stool Analysis Section */}
                        <Card className="w-full max-w-2xl mb-6 bg-[#704317] text-white shadow-[inset_0px_-13px_30px_0px_rgba(211,133,75,1)]">
                          <CardHeader>
                            <CardTitle className="text-2xl font-bold">Stool Analysis</CardTitle>
                            <CardDescription className="text-white/80">
                              Upload a photo of your pet's stool for AI analysis.
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <form className="space-y-6">
                              <div className="space-y-2">
                                <label htmlFor="stool-image" className="block text-sm font-medium text-white">
                                  Upload a photo of your pet's stool
                                </label>
                                <div className="flex items-center space-x-2">
                                  <Button
                                    type="button"
                                    disabled
                                    className="w-full bg-[#704317] text-white shadow-[inset_0px_-13px_30px_0px_rgba(211,133,75,1)]"
                                  >
                                    Upload Stool Image
                                    <ImageIcon className="ml-2 h-4 w-4" />
                                  </Button>
                                </div>
                              </div>

                              <Button
                                type="button"
                                disabled
                                className="w-full bg-[#704317] text-white shadow-[inset_0px_-13px_30px_0px_rgba(211,133,75,1)]"
                              >
                                Analyze Stool
                                <Upload className="ml-2 h-4 w-4" />
                              </Button>
                            </form>
                          </CardContent>
                        </Card>

                        {/* Disabled Comprehensive Analysis Section */}
                        <Card className="w-full max-w-2xl mb-6 bg-[#431170] text-white shadow-[inset_0px_-13px_30px_0px_rgba(133,75,211,1)]">
                          <CardHeader>
                            <CardTitle className="text-2xl font-bold">Comprehensive Health AI Analysis</CardTitle>
                            <CardDescription className="text-white/80">
                              Get in-depth insights on your pet's overall health based on historical records and current
                              data.
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <form className="space-y-6">
                              <Button
                                type="button"
                                disabled
                                className="w-full bg-[#431170] text-white shadow-[inset_0px_-13px_30px_0px_rgba(133,75,211,1)]"
                              >
                                Analyze with AI
                                <Sparkles className="ml-2 h-4 w-4" />
                              </Button>
                            </form>
                          </CardContent>
                        </Card>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center">
                    <p>Please select a pet to start the analysis.</p>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="reports">
                <div className="space-y-6">
                  <div className="flex flex-col items-start space-y-2">
                    <h2 className="text-2xl font-bold">Analysis Reports</h2>
                    <div className="flex space-x-2">
                      <Button onClick={handleRefresh}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                      </Button>
                      <Button onClick={collapseAllReports}>
                        {aiAnalyses.length === collapsedReports.length ? "Expand All" : "Collapse All"}
                      </Button>
                    </div>
                  </div>

                  {aiAnalyses.length === 0 ? (
                    <p>No analysis reports available. Perform an analysis to see results here.</p>
                  ) : (
                    aiAnalyses.map((analysis) => (
                      <Card key={analysis.id} className="w-full bg-black text-white">
                        <CardHeader>
                          <div className="flex justify-between items-center">
                            <CardTitle className="text-xl font-semibold">
                              {analysis.type.charAt(0).toUpperCase() + analysis.type.slice(1)} Analysis
                            </CardTitle>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleReport(analysis.id)}
                              className="border-gray-600 text-white bg-black hover:bg-gray-800"
                            >
                              {collapsedReports.includes(analysis.id) ? (
                                <>
                                  <ChevronDown className="h-4 w-4 mr-2" />
                                  Expand
                                </>
                              ) : (
                                <>
                                  <ChevronUp className="h-4 w-4 mr-2" />
                                  Collapse
                                </>
                              )}
                            </Button>
                          </div>
                          <CardDescription className="text-gray-300">
                            {format(new Date(analysis.date), "MMMM d, yyyy 'at' h:mm a")}
                          </CardDescription>
                        </CardHeader>
                        {!collapsedReports.includes(analysis.id) && (
                          <CardContent>
                            <div className="space-y-2">
                              <h4 className="font-semibold">Analysis:</h4>
                              {analysis.type === "stool" ? (
                                formatStoolAnalysis(analysis.analysis)
                              ) : (
                                <div>{formatAnalysisText(analysis.analysis)}</div>
                              )}
                            </div>
                          </CardContent>
                        )}
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="text-center">
              <p>Please select a pet to start the analysis.</p>
              <Button onClick={() => router.push("/pets")} className="mt-4">
                Go to Pet Selection
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
