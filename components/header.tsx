"use client"

import { useState, useEffect } from "react"
import { useAuth } from "../contexts/AuthContext"
import { db } from "../lib/firebase"
import { collection, query, where, getDocs } from "firebase/firestore"
import { ChevronDown } from "lucide-react"

interface Pet {
  id: string
  name: string
}

export default function Header() {
  const { user } = useAuth()
  const [pets, setPets] = useState<Pet[]>([])
  const [currentPet, setCurrentPet] = useState<Pet | null>(null)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  useEffect(() => {
    if (user) {
      fetchPets()
    }
  }, [user])

  const fetchPets = async () => {
    if (!user) return
    try {
      const q = query(collection(db, "pets"), where("userId", "==", user.uid))
      const querySnapshot = await getDocs(q)
      const fetchedPets: Pet[] = []
      querySnapshot.forEach((doc) => {
        fetchedPets.push({ id: doc.id, name: doc.data().name })
      })
      setPets(fetchedPets)
      if (fetchedPets.length > 0 && !currentPet) {
        setCurrentPet(fetchedPets[0])
      }
    } catch (error) {
      console.error("Error fetching pets:", error)
    }
  }

  const handlePetChange = (pet: Pet) => {
    setCurrentPet(pet)
    setIsDropdownOpen(false)
  }

  return (
    <header className="bg-blue-600 text-white p-4">
      <div className="container mx-auto flex justify-between items-center">
        <h1 className="text-2xl font-bold">PetPulse</h1>
        {user && (
          <div className="relative">
            <button
              className="flex items-center space-x-2 bg-white text-blue-600 px-4 py-2 rounded-md"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              <span>{currentPet ? currentPet.name : "Select a pet"}</span>
              <ChevronDown size={20} />
            </button>
            {isDropdownOpen && (
              <ul className="absolute right-0 mt-2 w-48 bg-white border border-gray-300 rounded-md shadow-lg z-10">
                {pets.map((pet) => (
                  <li
                    key={pet.id}
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-black"
                    onClick={() => handlePetChange(pet)}
                  >
                    {pet.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
