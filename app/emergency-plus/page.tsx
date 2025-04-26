"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useAuth } from "../../contexts/AuthContext"
import { useSelectedPet } from "../../contexts/PetContext"
import { PageHeader } from "../../components/page-header"
import { PetHeader } from "../../components/pet-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { AlertTriangle, Loader2, MapPin, Phone, ImageIcon } from "lucide-react"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import { collection, query, where, getDocs } from "firebase/firestore"
import { db } from "@/firebase"
import { useRouter } from "next/navigation"

interface FavoriteVet {
  id: string
  placeId: string
  name: string
  vicinity: string
  phoneNumber?: string
}

export default function EmergencyPlusPage() {
  const { user } = useAuth()
  const { selectedPet } = useSelectedPet()
  const [incident1, setIncident1] = useState("")
  const [incident2, setIncident2] = useState("")
  const [firstAidGuidance1, setFirstAidGuidance1] = useState("")
  const [firstAidGuidance2, setFirstAidGuidance2] = useState("")
  const [isLoading1, setIsLoading1] = useState(false)
  const [isLoading2, setIsLoading2] = useState(false)
  const [error1, setError1] = useState("")
  const [error2, setError2] = useState("")
  const [favoriteVets, setFavoriteVets] = useState<FavoriteVet[]>([])
  const [loadingVets, setLoadingVets] = useState(false)
  const router = useRouter()

  // New state for image analysis
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imageAnalysis, setImageAnalysis] = useState("")
  const [isLoadingImage, setIsLoadingImage] = useState(false)
  const [imageError, setImageError] = useState("")

  const handleSubmit = async (e: React.FormEvent, incidentNumber: number) => {
    e.preventDefault()
    if (!user || !selectedPet) {
      setError1("Please log in and select a pet before using this feature.")
      setError2("Please log in and select a pet before using this feature.")
      return
    }

    const setIsLoading = incidentNumber === 1 ? setIsLoading1 : setIsLoading2
    const setError = incidentNumber === 1 ? setError1 : setError2
    const setFirstAidGuidance = incidentNumber === 1 ? setFirstAidGuidance1 : setFirstAidGuidance2
    const incident = incidentNumber === 1 ? incident1 : incident2

    setIsLoading(true)
    setError("")
    setFirstAidGuidance("")

    try {
      const prompt = `As a veterinary expert, provide immediate first aid guidance for the following pet emergency situation. The pet is a ${selectedPet.type} (${selectedPet.breed}). Incident description: ${incident}

Please provide step-by-step instructions for immediate care, focusing on actions that can be safely performed by a pet owner before professional veterinary help is available. Include any warnings about actions to avoid.

Format the response as follows:
1. Immediate actions:
2. Do NOT:
3. When to seek immediate veterinary care:
4. Additional notes:

Keep the response concise and easy to follow in an emergency situation.`

      const { text } = await generateText({
        model: openai("gpt-4o"),
        prompt: prompt,
      })

      setFirstAidGuidance(text)
    } catch (error) {
      console.error("Error generating first aid guidance:", error)
      setError("Failed to generate first aid guidance. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedImage(e.target.files[0])
    }
  }

  const handleImageAnalysis = async () => {
    if (!selectedImage) {
      setImageError("Please select an image to analyze.")
      return
    }

    setIsLoadingImage(true)
    setImageError("")
    setImageAnalysis("")

    try {
      const imageBase64 = await convertToBase64(selectedImage)

      const { text } = await generateText({
        model: openai("gpt-4o"),
        prompt:
          "You are a veterinary expert. Analyze this image of a pet in an emergency situation. Describe what you see and provide any relevant first aid advice or recommendations based on the visual information. Be detailed but concise.",
        images: [imageBase64],
      })

      setImageAnalysis(text)
    } catch (error) {
      console.error("Error analyzing image:", error)
      setImageError("Failed to analyze the image. Please try again.")
    } finally {
      setIsLoadingImage(false)
    }
  }

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = (error) => reject(error)
    })
  }

  useEffect(() => {
    if (user) {
      fetchFavoriteVets()
    }
  }, [user])

  const fetchFavoriteVets = async () => {
    if (!user) return
    setLoadingVets(true)
    try {
      const q = query(collection(db, "favoriteVets"), where("userId", "==", user.uid))
      const querySnapshot = await getDocs(q)
      const vets: FavoriteVet[] = []
      querySnapshot.forEach((doc) => {
        vets.push({ id: doc.id, ...doc.data() } as FavoriteVet)
      })
      setFavoriteVets(vets)
    } catch (error) {
      console.error("Error fetching favorite vets:", error)
      setError1("Failed to fetch favorite vets")
      setError2("Failed to fetch favorite vets")
    } finally {
      setLoadingVets(false)
    }
  }

  const handleCall = (phoneNumber: string) => {
    window.open(`tel:${phoneNumber}`, "_blank")
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#FFFFFF]">
      <PageHeader title="Emergency Plus" />
      <PetHeader />
      <main className="flex-grow flex flex-col items-center p-6 pb-24 lg:pb-6">
        <div className="w-full max-w-4xl space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* First AI Chat Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-red-600 flex items-center">
                  <AlertTriangle className="w-6 h-6 mr-2" />
                  Pet Emergency First Aid (1)
                </CardTitle>
                <CardDescription>
                  Describe the emergency situation for AI-generated first aid guidance. Always seek professional
                  veterinary care for emergencies.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={(e) => handleSubmit(e, 1)} className="space-y-4">
                  <Textarea
                    placeholder="Describe the emergency situation (e.g., 'My dog ate chocolate' or 'My cat is limping and crying')"
                    value={incident1}
                    onChange={(e) => setIncident1(e.target.value)}
                    rows={4}
                    required
                  />
                  <Button type="submit" disabled={isLoading1} className="w-full">
                    {isLoading1 ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating Guidance...
                      </>
                    ) : (
                      "Get First Aid Guidance"
                    )}
                  </Button>
                </form>

                {error1 && (
                  <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
                    <p>{error1}</p>
                  </div>
                )}

                {firstAidGuidance1 && (
                  <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                    <h3 className="text-lg font-semibold mb-2">First Aid Guidance:</h3>
                    <div className="whitespace-pre-wrap">{firstAidGuidance1}</div>
                    <div className="mt-4 text-sm text-gray-600">
                      <strong>Disclaimer:</strong> This AI-generated advice is for informational purposes only and
                      should not replace professional veterinary care. Always consult with a veterinarian for pet
                      emergencies.
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Second AI Chat Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-red-600 flex items-center">
                  <AlertTriangle className="w-6 h-6 mr-2" />
                  Pet Emergency First Aid (2)
                </CardTitle>
                <CardDescription>
                  Describe another emergency situation for AI-generated first aid guidance. Always seek professional
                  veterinary care for emergencies.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={(e) => handleSubmit(e, 2)} className="space-y-4">
                  <Textarea
                    placeholder="Describe another emergency situation (e.g., 'My dog is having a seizure' or 'My cat got stung by a bee')"
                    value={incident2}
                    onChange={(e) => setIncident2(e.target.value)}
                    rows={4}
                    required
                  />
                  <Button type="submit" disabled={isLoading2} className="w-full">
                    {isLoading2 ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating Guidance...
                      </>
                    ) : (
                      "Get First Aid Guidance"
                    )}
                  </Button>
                </form>

                {error2 && (
                  <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
                    <p>{error2}</p>
                  </div>
                )}

                {firstAidGuidance2 && (
                  <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                    <h3 className="text-lg font-semibold mb-2">First Aid Guidance:</h3>
                    <div className="whitespace-pre-wrap">{firstAidGuidance2}</div>
                    <div className="mt-4 text-sm text-gray-600">
                      <strong>Disclaimer:</strong> This AI-generated advice is for informational purposes only and
                      should not replace professional veterinary care. Always consult with a veterinarian for pet
                      emergencies.
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Image Analysis Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-red-600 flex items-center">
                <ImageIcon className="w-6 h-6 mr-2" />
                Pet Emergency Image Analysis
              </CardTitle>
              <CardDescription>
                Upload an image of your pet's emergency situation for AI-powered analysis and guidance.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <input type="file" accept="image/*" onChange={handleImageUpload} className="w-full" />
                <Button onClick={handleImageAnalysis} disabled={isLoadingImage || !selectedImage} className="w-full">
                  {isLoadingImage ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing Image...
                    </>
                  ) : (
                    "Analyze Image"
                  )}
                </Button>

                {imageError && (
                  <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
                    <p>{imageError}</p>
                  </div>
                )}

                {imageAnalysis && (
                  <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                    <h3 className="text-lg font-semibold mb-2">Image Analysis:</h3>
                    <div className="whitespace-pre-wrap">{imageAnalysis}</div>
                    <div className="mt-4 text-sm text-gray-600">
                      <strong>Disclaimer:</strong> This AI-generated analysis is for informational purposes only and
                      should not replace professional veterinary care. Always consult with a veterinarian for pet
                      emergencies.
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Favorite Vets Section */}
          <Card className="border-2 border-red-500">
            <CardHeader>
              <CardTitle className="text-red-500 flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Emergency Vet Contacts
              </CardTitle>
              <CardDescription>Quick access to your trusted veterinarians</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-red-50 p-4 rounded-lg space-y-4">
                <h3 className="font-semibold text-red-700">Your Favorite Vets</h3>
                {loadingVets ? (
                  <p className="text-sm text-gray-500">Loading favorite vets...</p>
                ) : favoriteVets.length > 0 ? (
                  <div className="space-y-2">
                    {favoriteVets.map((vet) => (
                      <div key={vet.id} className="flex items-center justify-between bg-white p-3 rounded-lg shadow-sm">
                        <div>
                          <p className="font-medium">{vet.name}</p>
                          <p className="text-sm text-gray-500 flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {vet.vicinity}
                          </p>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => vet.phoneNumber && handleCall(vet.phoneNumber)}
                        >
                          <Phone className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No favorite vets saved yet</p>
                )}
              </div>

              <div className="bg-red-50 p-4 rounded-lg space-y-4">
                <h3 className="font-semibold text-red-700">Find Nearest Vet</h3>
                <Button variant="destructive" onClick={() => router.push("/vets?tab=find")} className="w-full">
                  Find Nearest Emergency Vet
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
