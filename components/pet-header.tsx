"use client"

import { useEffect, useState } from "react"
import { useAuth } from "../contexts/AuthContext"
import { useSelectedPet } from "../contexts/PetContext"
import { db } from "../lib/firebase"
import { collection, query, where, getDocs } from "firebase/firestore"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { ChevronLeft } from "lucide-react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"

interface Pet {
  id: string
  name: string
  breed: string
  birthDate: string
  imageUrl?: string
}

interface PetHeaderProps {
  backTo?: string
}

export function PetHeader({ backTo }: PetHeaderProps) {
  const { user } = useAuth()
  const { selectedPet, setSelectedPet } = useSelectedPet()
  const [pets, setPets] = useState<Pet[]>([])
  const [loading, setLoading] = useState(true)
  const [imageError, setImageError] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  // Reset image error state when selected pet changes
  useEffect(() => {
    setImageError(false)
  }, [selectedPet?.id])

  // Fetch pets whenever component mounts or user changes
  useEffect(() => {
    if (user) {
      fetchPets()
    } else {
      setPets([])
      setLoading(false)
    }
  }, [user])

  const fetchPets = async () => {
    if (!user) return
    setLoading(true)
    try {
      console.log("Fetching pets for user:", user.uid)
      const q = query(collection(db, "pets"), where("userId", "==", user.uid))
      const querySnapshot = await getDocs(q)
      const fetchedPets: Pet[] = []
      querySnapshot.forEach((doc) => {
        const petData = doc.data()
        fetchedPets.push({
          id: doc.id,
          name: petData.name,
          breed: petData.breed,
          birthDate: petData.birthDate,
          imageUrl: petData.imageUrl,
        })
      })
      console.log("Fetched pets:", fetchedPets.length)
      setPets(fetchedPets)

      // Check if the currently selected pet exists in the fetched pets
      if (selectedPet) {
        const petStillExists = fetchedPets.some((pet) => pet.id === selectedPet.id)
        if (!petStillExists) {
          // If the selected pet no longer exists, select the first pet or null
          setSelectedPet(fetchedPets.length > 0 ? fetchedPets[0] : null)
        } else {
          // Update the selected pet with fresh data
          const updatedPet = fetchedPets.find((pet) => pet.id === selectedPet.id)
          if (updatedPet && JSON.stringify(updatedPet) !== JSON.stringify(selectedPet)) {
            setSelectedPet(updatedPet)
          }
        }
      } else if (fetchedPets.length > 0 && !selectedPet) {
        // If no pet is selected but we have pets, select the first one
        setSelectedPet(fetchedPets[0])
      }
    } catch (error) {
      console.error("Error fetching pets:", error)
    } finally {
      setLoading(false)
    }
  }

  const calculateAge = (birthDate: string) => {
    const today = new Date()
    const birthDateObj = new Date(birthDate)
    const monthDiff =
      today.getMonth() - birthDateObj.getMonth() + 12 * (today.getFullYear() - birthDateObj.getFullYear())

    if (monthDiff < 1) {
      const dayDiff = Math.floor((today.getTime() - birthDateObj.getTime()) / (1000 * 3600 * 24))
      return dayDiff === 1 ? "1 day old" : `${dayDiff} days old`
    } else if (monthDiff < 12) {
      return monthDiff === 1 ? "1 month old" : `${monthDiff} months old`
    } else {
      const years = Math.floor(monthDiff / 12)
      return years === 1 ? "1 year old" : `${years} years old`
    }
  }

  // Force refresh when pet selection changes
  const handlePetChange = (value: string) => {
    const pet = pets.find((p) => p.id === value)
    if (pet) {
      setSelectedPet(pet)
      setImageError(false) // Reset image error state when changing pets
    }
  }

  // Handle image load error
  const handleImageError = () => {
    console.log("Image failed to load:", selectedPet?.imageUrl)
    setImageError(true)
  }

  return (
    <div className="w-full bg-[#f5f5f5]/85 backdrop-blur-xl px-6 py-2 flex items-center justify-between sticky top-0 !z-50 border-b border-black/10">
      <div className="flex items-center gap-3 max-w-md mx-auto w-full">
        {backTo && (
          <Link href={backTo} className="text-blue-500 flex items-center mr-4">
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm">Back</span>
          </Link>
        )}
        {loading ? (
          <Skeleton className="w-full h-10" />
        ) : pets.length === 0 ? (
          <div className="flex items-center justify-between w-full">
            <span className="text-lg font-semibold text-black">No pet available</span>
            <Button onClick={() => router.push("/pets")} size="sm" variant="outline">
              Add Pet
            </Button>
          </div>
        ) : (
          <>
            <div className="w-10 h-10 rounded-lg overflow-hidden bg-white">
              {selectedPet?.imageUrl && !imageError ? (
                <img
                  src={selectedPet.imageUrl || "/placeholder.svg"}
                  alt={selectedPet.name}
                  className="w-full h-full object-cover rounded-lg"
                  onError={handleImageError}
                  referrerPolicy="no-referrer"
                />
              ) : selectedPet ? (
                <div className="w-full h-full bg-[#FB8387] flex items-center justify-center text-black text-lg font-semibold rounded-lg">
                  {selectedPet.name[0]}
                </div>
              ) : null}
            </div>
            <Select value={selectedPet?.id} onValueChange={handlePetChange}>
              <SelectTrigger className="border-0 bg-transparent focus:ring-0 focus:ring-offset-0 p-0 h-auto">
                <div className="flex justify-between items-center w-full">
                  <div className="flex flex-col items-start justify-center">
                    <span className="text-lg font-semibold text-black leading-tight">
                      {selectedPet?.name || "No pets"}
                    </span>
                    {selectedPet && (
                      <>
                        <span className="text-xs text-gray-500 leading-tight">{selectedPet.breed}</span>
                        <span className="text-xs text-gray-500 leading-tight">
                          {calculateAge(selectedPet.birthDate)}
                        </span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center">
                    <span className="text-sm text-gray-500 mr-1">Select</span>
                  </div>
                </div>
              </SelectTrigger>
              <SelectContent className="z-[999999999]">
                {pets.map((pet) => (
                  <SelectItem key={pet.id} value={pet.id}>
                    {pet.name} ({pet.breed}, {calculateAge(pet.birthDate)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}
      </div>
    </div>
  )
}
