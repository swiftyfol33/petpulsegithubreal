"use client"

import type React from "react"

import { useState, useEffect, Suspense } from "react"
import { useAuth } from "../../contexts/AuthContext"
import { useSelectedPet } from "../../contexts/PetContext"
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { AlertTriangle, Loader2, MapPin, Phone, Heart, Search, Info } from "lucide-react"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import { collection, query, where, getDocs } from "firebase/firestore"
import { db } from "@/firebase"
import { useRouter } from "next/navigation"
import { Skeleton } from "@/components/ui/skeleton"
import { PageHeader } from "@/components/page-header"
import { PetHeader } from "@/components/pet-header"

interface FavoriteVet {
  id: string
  placeId: string
  name: string
  vicinity: string
  phoneNumber?: string
}

interface NearestVet {
  name: string
  vicinity: string
  distance: number
  phoneNumber?: string
}

function EmergencyContent() {
  const { user } = useAuth()
  const { selectedPet } = useSelectedPet()
  const [incident, setIncident] = useState("")
  const [firstAidGuidance, setFirstAidGuidance] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [favoriteVets, setFavoriteVets] = useState<FavoriteVet[]>([])
  const [loadingVets, setLoadingVets] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !selectedPet) {
      setError("Please log in and select a pet before using this feature.")
      return
    }

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
      setError("Failed to fetch favorite vets")
    } finally {
      setLoadingVets(false)
    }
  }

  const handleCall = (phoneNumber: string) => {
    window.open(`tel:${phoneNumber}`, "_blank")
  }

  return (
    <div className="w-full max-w-md space-y-6">
      {/* First Aid Guidance Card */}
      <Card className="overflow-hidden border-0 shadow-lg">
        <div className="bg-gradient-to-r from-red-600 to-red-500 p-4">
          <CardTitle className="text-2xl font-bold text-white flex items-center">
            <AlertTriangle className="w-6 h-6 mr-2" />
            Pet Emergency First Aid
          </CardTitle>
          <CardDescription className="text-red-100">
            Describe the emergency situation for AI-generated first aid guidance. Always seek professional veterinary
            care for emergencies.
          </CardDescription>
        </div>
        <CardContent className="p-6 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Textarea
                placeholder="Describe the emergency situation (e.g., 'My dog ate chocolate' or 'My cat is limping and crying')"
                value={incident}
                onChange={(e) => setIncident(e.target.value)}
                rows={4}
                required
                className="pl-10 border-red-200 focus:border-red-400 focus:ring-red-400"
              />
              <AlertTriangle className="absolute top-3 left-3 h-5 w-5 text-red-500" />
            </div>
            <Button type="submit" disabled={isLoading} className="w-full bg-red-600 hover:bg-red-700 text-white">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Guidance...
                </>
              ) : (
                <>
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Get First Aid Guidance
                </>
              )}
            </Button>
          </form>

          {error && (
            <div className="mt-4 p-4 bg-red-100 border-l-4 border-red-500 text-red-700 rounded-md">
              <p className="flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2" />
                {error}
              </p>
            </div>
          )}

          {firstAidGuidance && (
            <div className="mt-6 p-5 bg-yellow-50 border-l-4 border-yellow-500 rounded-md">
              <h3 className="text-lg font-semibold mb-2 flex items-center text-yellow-800">
                <AlertTriangle className="h-5 w-5 mr-2 text-yellow-600" />
                First Aid Guidance:
              </h3>
              <div className="whitespace-pre-wrap text-yellow-900">{firstAidGuidance}</div>
              <div className="mt-4 p-3 bg-yellow-100 rounded-md text-sm text-yellow-800 flex items-start">
                <Info className="h-5 w-5 mr-2 text-yellow-600 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Disclaimer:</strong> This AI-generated advice is for informational purposes only and should
                  not replace professional veterinary care. Always consult with a veterinarian for pet emergencies.
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Emergency Vet Contacts Card */}
      <Card className="overflow-hidden border-0 shadow-lg">
        <div className="bg-gradient-to-r from-red-500 to-pink-500 p-4">
          <CardTitle className="text-white flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Emergency Vet Contacts
          </CardTitle>
          <CardDescription className="text-red-100">Quick access to your trusted veterinarians</CardDescription>
        </div>
        <CardContent className="p-6 space-y-5">
          <div className="bg-gradient-to-br from-red-50 to-pink-50 p-5 rounded-lg space-y-4">
            <h3 className="font-semibold text-red-700 flex items-center">
              <Heart className="h-5 w-5 mr-2" />
              Your Favorite Vets
            </h3>
            {loadingVets ? (
              <div className="space-y-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : favoriteVets.length > 0 ? (
              <div className="space-y-3">
                {favoriteVets.map((vet) => (
                  <div
                    key={vet.id}
                    className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 border border-red-100"
                  >
                    <div>
                      <p className="font-medium text-gray-800">{vet.name}</p>
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        <MapPin className="h-4 w-4 text-red-400" />
                        {vet.vicinity}
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => vet.phoneNumber && handleCall(vet.phoneNumber)}
                      className="bg-red-500 hover:bg-red-600"
                    >
                      <Phone className="h-4 w-4 mr-1" />
                      Call
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center p-6 bg-white rounded-lg border border-red-100">
                <Heart className="h-10 w-10 text-red-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No favorite vets saved yet</p>
                <Button
                  variant="outline"
                  onClick={() => router.push("/vets?tab=find")}
                  className="mt-3 text-red-500 border-red-200 hover:bg-red-50"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Find Vets
                </Button>
              </div>
            )}
          </div>

          <div className="bg-gradient-to-br from-red-50 to-pink-50 p-5 rounded-lg space-y-4">
            <h3 className="font-semibold text-red-700 flex items-center">
              <MapPin className="h-5 w-5 mr-2" />
              Find Nearest Vet
            </h3>
            <Button
              variant="destructive"
              onClick={() => router.push("/vets?tab=find")}
              className="w-full bg-red-500 hover:bg-red-600 shadow-md"
            >
              <Search className="h-4 w-4 mr-2" />
              Find Nearest Emergency Vet
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Emergency Contacts Card */}
      <Card className="overflow-hidden border-0 shadow-lg">
        <div className="bg-gradient-to-r from-pink-500 to-purple-500 p-4">
          <CardTitle className="text-white flex items-center">
            <Phone className="h-5 w-5 mr-2" />
            Emergency Contacts
          </CardTitle>
        </div>
        <CardContent className="p-6">
          <ul className="space-y-4">
            <li className="flex items-start p-3 bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg">
              <Phone className="h-5 w-5 text-pink-500 mr-3 mt-0.5" />
              <div>
                <p className="font-medium text-gray-800">Pet Poison Helpline</p>
                <a href="tel:1-855-764-7661" className="text-pink-600 font-bold hover:underline">
                  1-855-764-7661
                </a>
                <p className="text-xs text-gray-500">US & Canada</p>
              </div>
            </li>
            <li className="flex items-start p-3 bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg">
              <Phone className="h-5 w-5 text-purple-500 mr-3 mt-0.5" />
              <div>
                <p className="font-medium text-gray-800">ASPCA Animal Poison Control</p>
                <a href="tel:1-888-426-4435" className="text-purple-600 font-bold hover:underline">
                  1-888-426-4435
                </a>
                <p className="text-xs text-gray-500">US</p>
              </div>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

// Update the EmergencyPage component with better styling
export default function EmergencyPage() {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-white to-red-50">
      <PageHeader
        title="Emergency"
        description="Get immediate first aid guidance and emergency vet contacts"
        icon={<AlertTriangle className="h-5 w-5 text-red-500" />}
      />
      <PetHeader />
      <main className="flex-grow flex flex-col items-center p-6 pb-24 lg:pb-6">
        <Suspense
          fallback={
            <div className="w-full max-w-md space-y-6">
              <Card>
                <CardContent className="p-6">
                  <Skeleton className="h-[500px] w-full" />
                </CardContent>
              </Card>
            </div>
          }
        >
          <EmergencyContent />
        </Suspense>
      </main>
    </div>
  )
}
