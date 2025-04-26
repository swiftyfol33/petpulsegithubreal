"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useAuth } from "../contexts/AuthContext"

interface Pet {
  id: string
  name: string
  breed?: string
  birthDate?: string
  imageUrl?: string
}

interface PetContextType {
  selectedPet: Pet | null
  setSelectedPet: (pet: Pet | null) => void
  clearSelectedPet: () => void
}

const PetContext = createContext<PetContextType>({
  selectedPet: null,
  setSelectedPet: () => {},
  clearSelectedPet: () => {},
})

export function PetProvider({ children }: { children: ReactNode }) {
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null)
  const { user } = useAuth()

  // Load selected pet from localStorage on initial render
  useEffect(() => {
    try {
      const storedPet = localStorage.getItem("selectedPet")
      if (storedPet) {
        setSelectedPet(JSON.parse(storedPet))
      }
    } catch (error) {
      console.error("Error loading pet from localStorage:", error)
      localStorage.removeItem("selectedPet")
    }
  }, [])

  // Update localStorage when selectedPet changes
  useEffect(() => {
    if (selectedPet) {
      localStorage.setItem("selectedPet", JSON.stringify(selectedPet))
    } else {
      localStorage.removeItem("selectedPet")
    }
  }, [selectedPet])

  // Clear selected pet when user changes
  useEffect(() => {
    if (!user) {
      clearSelectedPet()
    }
  }, [user]) // Add pathname to dependencies to ensure it runs on route changes

  const clearSelectedPet = () => {
    setSelectedPet(null)
    localStorage.removeItem("selectedPet")
  }

  return <PetContext.Provider value={{ selectedPet, setSelectedPet, clearSelectedPet }}>{children}</PetContext.Provider>
}

export const usePet = () => useContext(PetContext)
