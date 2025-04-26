"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"

interface Vet {
  id: string
  name: string
  specialty: string
  location: string
  rating: number
  image?: string
}

interface ShareVetDialogProps {
  vet: Vet
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ShareVetDialog({ vet, open, onOpenChange }: ShareVetDialogProps) {
  const [selectedPet, setSelectedPet] = useState<string>("")
  const [isSharing, setIsSharing] = useState(false)
  const { toast } = useToast()

  // Mock pet data - in a real app, this would come from your data store
  const pets = [
    { id: "pet1", name: "Buddy", type: "Dog" },
    { id: "pet2", name: "Whiskers", type: "Cat" },
    { id: "pet3", name: "Tweety", type: "Bird" },
  ]

  const handleShare = async () => {
    if (!selectedPet) {
      toast({
        title: "Error",
        description: "Please select a pet to share.",
        variant: "destructive",
      })
      return
    }

    setIsSharing(true)

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Get the selected pet details
      const pet = pets.find((p) => p.id === selectedPet)

      // Success
      toast({
        title: "Success!",
        description: `${pet?.name}'s profile has been shared with ${vet.name}.`,
      })

      // Close the dialog
      onOpenChange(false)

      // Add to sharing history (in a real app, this would be stored in a database)
      // This is just a placeholder for demonstration
      console.log("Added to sharing history:", {
        petId: selectedPet,
        vetId: vet.id,
        sharedAt: new Date().toISOString(),
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to share pet profile. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSharing(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Share Pet Profile with {vet.name}</DialogTitle>
          <DialogDescription>Select which pet's profile you want to share with this veterinarian.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="pet" className="text-right">
              Pet
            </Label>
            <Select value={selectedPet} onValueChange={setSelectedPet}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select a pet" />
              </SelectTrigger>
              <SelectContent>
                {pets.map((pet) => (
                  <SelectItem key={pet.id} value={pet.id}>
                    {pet.name} ({pet.type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleShare} disabled={isSharing}>
            {isSharing ? "Sharing..." : "Share Profile"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
