"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp } from "firebase/firestore"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "react-hot-toast"
import { Spinner } from "@/components/ui/spinner"
import { Badge } from "@/components/ui/badge"

interface Pet {
  id: string
  name: string
  type: string
  breed: string
  userId: string
  sharedWithVets?: Array<{
    vetId: string
    vetName: string
    vetEmail: string
    vetPhone: string
    sharedAt: string
    status: string
  }>
}

interface SharePetDialogProps {
  isOpen: boolean
  onClose: () => void
  pet: Pet
}

export function SharePetDialog({ isOpen, onClose, pet }: SharePetDialogProps) {
  const { user } = useAuth()
  const [vetEmail, setVetEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [vets, setVets] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [selectedVet, setSelectedVet] = useState<any | null>(null)
  const [sharingHistory, setSharingHistory] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  useEffect(() => {
    if (isOpen && pet) {
      fetchVets()
      fetchSharingHistory()
    }
  }, [isOpen, pet])

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setSearchResults([])
    } else {
      const results = vets.filter(
        (vet) =>
          vet.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          vet.email?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
      setSearchResults(results)
    }
  }, [searchTerm, vets])

  const fetchVets = async () => {
    if (!user) return

    try {
      setLoading(true)
      const q = query(collection(db, "users"), where("role", "==", "vet"))
      const querySnapshot = await getDocs(q)
      const vetsList: any[] = []
      querySnapshot.forEach((doc) => {
        vetsList.push({ id: doc.id, ...doc.data() })
      })
      setVets(vetsList)
    } catch (error) {
      console.error("Error fetching vets:", error)
      toast.error("Failed to load vets")
    } finally {
      setLoading(false)
    }
  }

  const fetchSharingHistory = async () => {
    if (!pet || !pet.id) return

    try {
      setLoadingHistory(true)
      const petDoc = await getDocs(query(collection(db, "pets"), where("__name__", "==", pet.id)))

      if (!petDoc.empty) {
        const petData = petDoc.docs[0].data()
        if (petData.sharedWithVets && Array.isArray(petData.sharedWithVets)) {
          setSharingHistory(petData.sharedWithVets)
        } else {
          setSharingHistory([])
        }
      }
    } catch (error) {
      console.error("Error fetching sharing history:", error)
    } finally {
      setLoadingHistory(false)
    }
  }

  const handleSelectVet = (vet: any) => {
    setSelectedVet(vet)
    setVetEmail(vet.email || "")
    setSearchTerm(vet.displayName || vet.email || "")
    setSearchResults([])
  }

  const handleShare = async () => {
    if (!user || !pet) return

    try {
      setLoading(true)
      console.log("Starting pet sharing process for pet:", pet.id)

      // Find the vet by email
      let vetToShare = selectedVet
      if (!vetToShare) {
        console.log("No vet selected, searching by email:", vetEmail)
        const q = query(collection(db, "users"), where("email", "==", vetEmail), where("role", "==", "vet"))
        const querySnapshot = await getDocs(q)
        if (querySnapshot.empty) {
          console.error("No vet found with email:", vetEmail)
          toast.error("No vet found with this email")
          return
        }
        vetToShare = { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() }
        console.log("Found vet:", vetToShare)
      }

      // Check if already shared with this vet
      const petRef = doc(db, "pets", pet.id)
      const petDoc = await getDocs(query(collection(db, "pets"), where("__name__", "==", pet.id)))

      if (petDoc.empty) {
        console.error("Pet not found with ID:", pet.id)
        toast.error("Pet not found")
        return
      }

      const petData = petDoc.docs[0].data()
      const sharedWithVets = petData.sharedWithVets || []

      // Check if already shared with this vet
      const alreadyShared = sharedWithVets.some((v: any) => v.vetId === vetToShare.id && v.status === "active")

      if (alreadyShared) {
        console.log("Pet already shared with this vet:", vetToShare.id)
        toast.error("Pet already shared with this vet")
        return
      }

      // Add or update sharing record
      const existingIndex = sharedWithVets.findIndex((v: any) => v.vetId === vetToShare.id)

      if (existingIndex >= 0) {
        // Update existing record
        sharedWithVets[existingIndex] = {
          vetId: vetToShare.id,
          vetName: vetToShare.displayName || vetToShare.email,
          vetEmail: vetToShare.email,
          vetPhone: vetToShare.phone,
          sharedAt: new Date().toISOString(),
          status: "active",
        }
      } else {
        // Add new record
        sharedWithVets.push({
          vetId: vetToShare.id,
          vetName: vetToShare.displayName || vetToShare.email,
          vetEmail: vetToShare.email,
          vetPhone: vetToShare.phone,
          sharedAt: new Date().toISOString(),
          status: "active",
        })
      }

      // Update pet document
      await updateDoc(petRef, {
        sharedWithVets,
      })
      console.log("Updated pet document with new sharing info")

      // Fetch the pet's health records to include in sharing
      console.log("Fetching health records for pet:", pet.id)
      const healthRecordsQuery = query(
        collection(db, "healthRecords"),
        where("petId", "==", pet.id),
        where("userId", "==", user.uid),
      )
      const healthRecordsSnapshot = await getDocs(healthRecordsQuery)
      const healthRecords = []
      console.log(`Found ${healthRecordsSnapshot.size} health records`)

      healthRecordsSnapshot.forEach((doc) => {
        const data = doc.data()
        console.log("Health record data:", data)
        healthRecords.push({ id: doc.id, ...data })
      })

      // Fetch AI analyses if available
      console.log("Fetching AI analyses for pet:", pet.id)
      const aiAnalysesQuery = query(
        collection(db, "aiAnalyses"),
        where("petId", "==", pet.id),
        where("userId", "==", user.uid),
      )
      const aiAnalysesSnapshot = await getDocs(aiAnalysesQuery)
      const aiAnalyses = []
      console.log(`Found ${aiAnalysesSnapshot.size} AI analyses`)

      aiAnalysesSnapshot.forEach((doc) => {
        const data = doc.data()
        console.log("AI analysis data:", data)
        aiAnalyses.push({ id: doc.id, ...data })
      })

      // Create the sharing document with a clean structure
      const sharingData = {
        petId: pet.id,
        petName: pet.name,
        petType: pet.type,
        petBreed: pet.breed,
        ownerId: user.uid,
        ownerName: user.displayName,
        vetId: vetToShare.id,
        vetName: vetToShare.displayName || vetToShare.email,
        vetEmail: vetToShare.email,
        sharedAt: serverTimestamp(),
        status: "active",
        healthRecords: healthRecords,
        aiAnalyses: aiAnalyses,
      }

      console.log(
        "Creating petSharing document with data:",
        JSON.stringify(
          {
            ...sharingData,
            healthRecords: `${healthRecords.length} records`,
            aiAnalyses: `${aiAnalyses.length} analyses`,
          },
          null,
          2,
        ),
      )

      const sharingDocRef = await addDoc(collection(db, "petSharing"), sharingData)
      console.log("Created petSharing document with ID:", sharingDocRef.id)

      toast.success(`Pet shared with ${vetToShare.displayName || vetToShare.email}`)
      fetchSharingHistory()
      setVetEmail("")
      setSelectedVet(null)
      setSearchTerm("")
    } catch (error) {
      console.error("Error sharing pet:", error)
      toast.error("Failed to share pet")
    } finally {
      setLoading(false)
    }
  }

  const handleRevokeAccess = async (vetId: string) => {
    if (!user || !pet) return

    try {
      setLoading(true)

      // Get current pet data
      const petRef = doc(db, "pets", pet.id)
      const petDoc = await getDocs(query(collection(db, "pets"), where("__name__", "==", pet.id)))

      if (petDoc.empty) {
        toast.error("Pet not found")
        return
      }

      const petData = petDoc.docs[0].data()
      const sharedWithVets = petData.sharedWithVets || []

      // Find the sharing record
      const sharingIndex = sharedWithVets.findIndex((v: any) => v.vetId === vetId)

      if (sharingIndex === -1) {
        toast.error("Sharing record not found")
        return
      }

      // Update the status to revoked
      sharedWithVets[sharingIndex].status = "revoked"

      // Update pet document
      await updateDoc(petRef, {
        sharedWithVets,
      })

      // Also update petSharing collection
      const sharingQuery = query(
        collection(db, "petSharing"),
        where("petId", "==", pet.id),
        where("vetId", "==", vetId),
        where("status", "==", "active"),
      )

      const sharingDocs = await getDocs(sharingQuery)

      if (!sharingDocs.empty) {
        const sharingRef = doc(db, "petSharing", sharingDocs.docs[0].id)
        await updateDoc(sharingRef, {
          status: "revoked",
        })
      }

      toast.success("Access revoked successfully")
      fetchSharingHistory()
    } catch (error) {
      console.error("Error revoking access:", error)
      toast.error("Failed to revoke access")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Pet with Vet</DialogTitle>
          <DialogDescription>Share {pet?.name}'s health records with a veterinarian.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="vet-email">Vet's Email</Label>
            <div className="relative">
              <Input
                id="vet-email"
                placeholder="Enter vet's email"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                  {searchResults.map((vet) => (
                    <div
                      key={vet.id}
                      className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                      onClick={() => handleSelectVet(vet)}
                    >
                      <div className="font-medium">{vet.displayName || "Unnamed Vet"}</div>
                      <div className="text-sm text-gray-500">{vet.email}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          {pet.sharedWithVets?.map((vet, index) => (
            <div key={index} className="flex justify-between items-center py-2 border-b last:border-b-0">
              <div>
                <p className="font-medium">{vet.vetName}</p>
                <p className="text-sm text-gray-600">{vet.vetEmail}</p>
                <p className="text-sm text-gray-600">{vet.vetPhone || "No phone number"}</p>
              </div>
              <div className="flex items-center">
                <Badge
                  className={
                    vet.status === "active"
                      ? "bg-green-100 text-green-800 hover:bg-green-100"
                      : "bg-red-100 text-red-800 hover:bg-red-100"
                  }
                >
                  {vet.status === "active" ? "Active" : "Revoked"}
                </Badge>
                {vet.status === "active" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-2 h-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleRevokeAccess(vet.vetId)}
                    disabled={loading}
                  >
                    Revoke
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
        <DialogFooter className="sm:justify-between">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="button" onClick={handleShare} disabled={loading || !vetEmail}>
            {loading ? <Spinner /> : "Share"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
