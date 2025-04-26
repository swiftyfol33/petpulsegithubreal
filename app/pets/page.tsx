"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "../../contexts/AuthContext"
import { db, storage } from "../../lib/firebase"
import { collection, addDoc, query, where, getDocs, deleteDoc, doc, updateDoc, orderBy } from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage"
import { LoadingSpinner } from "../../components/loading"
import { PageHeader } from "../../components/page-header"
import { PetHeader } from "../../components/pet-header"
import { Plus, ImageIcon, Check, Share2, Clock, RefreshCw, Edit, Trash2, FileDown } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { format, parseISO } from "date-fns"
import jsPDF from "jspdf"
import { Button } from "@/components/ui/button"
import { SharePetDialog } from "../../components/share-pet-dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "react-hot-toast"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { toast as sonnerToast } from "sonner"
import { PremiumBanner } from "../../components/premium-banner"

interface Pet {
  id: string
  name: string
  type: string
  breed: string
  birthDate: string
  imageUrl: string
  createdAt: string
  userId: string
  sharedWithVets?: Array<{
    vetId: string
    vetName: string
    vetEmail: string
    sharedAt: string
    status: string
    vetPhone?: string
  }>
}

interface HealthRecord {
  id: string
  petId: string
  userId: string
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
  petId: string
  userId: string
  date: string | { seconds: number; nanoseconds: number } // Update to handle Firestore Timestamp
  type: "symptom" | "stool" | "comprehensive"
  analysis: string | { [key: string]: any }
}

const breedsByType: { [key: string]: string[] } = {
  Dog: [
    "Akita",
    "Alaskan Malamute",
    "American Bulldog",
    "Australian Cattle Dog",
    "Australian Shepherd",
    "Beagle",
    "Bernese Mountain Dog",
    "Bichon Frise",
    "Border Collie",
    "Boston Terrier",
    "Boxer",
    "Bulldog",
    "Cavalier King Charles Spaniel",
    "Chihuahua",
    "Chow Chow",
    "Cocker Spaniel",
    "Collie",
    "Corgi (Pembroke Welsh)",
    "Dachshund",
    "Dalmatian",
    "Doberman Pinscher",
    "English Springer Spaniel",
    "French Bulldog",
    "German Shepherd",
    "Golden Retriever",
    "Great Dane",
    "Havanese",
    "Husky",
    "Jack Russell Terrier",
    "Labrador Retriever",
    "Maltese",
    "Miniature Pinscher",
    "Miniature Schnauzer",
    "Newfoundland",
    "Pomeranian",
    "Poodle",
    "Pug",
    "Rhodesian Ridgeback",
    "Rottweiler",
    "Saint Bernard",
    "Samoyed",
    "Shiba Inu",
    "Shih Tzu",
    "Standard Schnauzer",
    "Vizsla",
    "Weimaraner",
    "West Highland White Terrier",
    "Whippet",
    "Yorkshire Terrier",
    "Zuchon",
    "Other",
  ],
  Cat: [
    "Abyssinian",
    "American Bobtail",
    "American Shorthair",
    "Balinese",
    "Bengal",
    "Birman",
    "Bombay",
    "British Shorthair",
    "Burmese",
    "Chartreux",
    "Cornish Rex",
    "Devon Rex",
    "Egyptian Mau",
    "European Shorthair",
    "Exotic Shorthair",
    "Havana Brown",
    "Himalayan",
    "Japanese Bobtail",
    "Korat",
    "LaPerm",
    "Maine Coon",
    "Manx",
    "Munchkin",
    "Nebelung",
    "Norwegian Forest Cat",
    "Ocicat",
    "Oriental",
    "Persian",
    "Pixiebob",
    "Ragamuffin",
    "Ragdoll",
    "Russian Blue",
    "Safari",
    "Savannah",
    "Scottish Fold",
    "Selkirk Rex",
    "Siamese",
    "Siberian",
    "Singapura",
    "Snowshoe",
    "Somali",
    "Sphynx",
    "Thai",
    "Tonkinese",
    "Turkish Angora",
    "Turkish Van",
    "Ukrainian Levkoy",
    "Ural Rex",
    "Wagner's Cat",
    "York Chocolate",
    "Other",
  ],
  Fish: [
    "Angelfish",
    "Barb (Cherry)",
    "Barb (Tiger)",
    "Betta",
    "Black Molly",
    "Black Skirt Tetra",
    "Bloodfin Tetra",
    "Cardinal Tetra",
    "Cherry Barb",
    "Clown Loach",
    "Corydoras Catfish",
    "Danio (Celestial Pearl)",
    "Danio (Zebra)",
    "Discus",
    "Dwarf Gourami",
    "Emperor Tetra",
    "Fancy Guppy",
    "Fire Neon",
    "Flowerhorn Cichlid",
    "German Blue Ram",
    "Glass Catfish",
    "Goldfish (Common)",
    "Goldfish (Fancy)",
    "Gourami (Pearl)",
    "Guppy",
    "Harlequin Rasbora",
    "Koi",
    "Leopard Danio",
    "Lyretail Molly",
    "Neon Tetra",
    "Oscar",
    "Parrotfish",
    "Peacock Cichlid",
    "Platy",
    "Plecostomus",
    "Pristella Tetra",
    "Rainbow Shark",
    "Rasbora",
    "Red Tail Shark",
    "Rummy Nose Tetra",
    "Sailfin Molly",
    "Serpae Tetra",
    "Silver Dollar",
    "Swordtail",
    "Tiger Barb",
    "Triggerfish",
    "Von Rio Tetra",
    "White Cloud Mountain Minnow",
    "X-ray Tetra",
    "Zebra Danio",
    "Other",
  ],
  Bird: [
    "African Grey Parrot",
    "Amazon Parrot",
    "Australian King Parrot",
    "Avadavat",
    "Barred Parakeet",
    "Blue-and-Gold Macaw",
    "Bourke's Parrot",
    "Budgerigar",
    "Canary",
    "Cockatiel",
    "Cockatoo",
    "Conure (Green Cheek)",
    "Conure (Sun)",
    "Diamond Dove",
    "Eclectus Parrot",
    "Finch (Gouldian)",
    "Finch (Society)",
    "Finch (Zebra)",
    "Fischer's Lovebird",
    "Galah",
    "Gouldian Finch",
    "Green-Cheeked Conure",
    "Grey Parrot",
    "Indian Ringneck Parakeet",
    "Java Sparrow",
    "Kakariki",
    "Lineolated Parakeet",
    "Lovebird",
    "Macaw (Blue and Gold)",
    "Macaw (Scarlet)",
    "Meyer's Parrot",
    "Monk Parakeet",
    "Pacific Parrotlet",
    "Parakeet (Indian Ring-necked)",
    "Parrotlet",
    "Peach-Faced Lovebird",
    "Pionus Parrot",
    "Plum-Headed Parakeet",
    "Princess Parrot",
    "Quaker Parrot",
    "Rainbow Lorikeet",
    "Red-Factor Canary",
    "Rose-Ringed Parakeet",
    "Rosella",
    "Senegal Parrot",
    "Society Finch",
    "Sun Conure",
    "Umbrella Cockatoo",
    "White-Faced Cockatiel",
    "Yellow-Naped Amazon",
    "Other",
  ],
  Rabbit: [
    "American Fuzzy Lop",
    "American Sable",
    "Angora (English)",
    "Angora (French)",
    "Angora (Giant)",
    "Belgian Hare",
    "Beveren",
    "Britannia Petite",
    "Californian",
    "Champagne D'Argent",
    "Checkered Giant",
    "Cinnamon",
    "Continental Giant",
    "Dutch",
    "Dwarf Hotot",
    "English Lop",
    "English Spot",
    "Flemish Giant",
    "Florida White",
    "French Angora",
    "French Lop",
    "Giant Angora",
    "Giant Chinchilla",
    "Giant Papillon",
    "Harlequin",
    "Havana",
    "Himalayan",
    "Holland Lop",
    "Hotot",
    "Jersey Wooly",
    "Lilac",
    "Lion Head",
    "Mini Lop",
    "Mini Rex",
    "Mini Satin",
    "Netherland Dwarf",
    "New Zealand",
    "Palomino",
    "Polish",
    "Rex",
    "Rhinelander",
    "Sable",
    "Satin",
    "Silver",
    "Silver Fox",
    "Silver Marten",
    "Standard Chinchilla",
    "Tan",
    "Thrianta",
    "Vienna White",
    "Other",
  ],
  Reptile: [
    "African Fat-Tailed Gecko",
    "African Spurred Tortoise",
    "Ball Python",
    "Bearded Dragon",
    "Blue-Tongued Skink",
    "Boa Constrictor",
    "California Kingsnake",
    "Chameleon (Panther)",
    "Chameleon (Veiled)",
    "Chinese Water Dragon",
    "Corn Snake",
    "Crested Gecko",
    "Eastern Box Turtle",
    "Egyptian Uromastyx",
    "Fire Skink",
    "Garter Snake",
    "Gecko (Crested)",
    "Gecko (Leopard)",
    "Giant Day Gecko",
    "Green Anole",
    "Green Iguana",
    "Green Tree Python",
    "Hermann's Tortoise",
    "House Gecko",
    "Iguana",
    "Jackson's Chameleon",
    "Kenya Sand Boa",
    "Leopard Gecko",
    "Leopard Tortoise",
    "Milk Snake",
    "Monitor Lizard",
    "Mountain Horned Dragon",
    "Painted Turtle",
    "Panther Chameleon",
    "Red-Eared Slider",
    "Red-Footed Tortoise",
    "Rosy Boa",
    "Russian Tortoise",
    "Sandfish Skink",
    "Savannah Monitor",
    "Schneider's Skink",
    "Snake (Corn)",
    "Snake (Rosy Boa)",
    "Sulcata Tortoise",
    "Tokay Gecko",
    "Tortoise (Greek)",
    "Tortoise (Russian)",
    "Tree Monitor",
    "Veiled Chameleon",
    "Yemen Chameleon",
    "Other",
  ],
  Hamster: [
    "Campbell's Dwarf",
    "Chinese Hamster",
    "Dwarf Campbell Russian",
    "Dwarf Roborovski",
    "Dwarf Winter White Russian",
    "Golden Hamster",
    "Roborovski Dwarf",
    "Russian Campbell",
    "Russian Dwarf",
    "Syrian Golden",
    "Other",
  ],
  "Guinea Pig": [
    "Abyssinian",
    "American",
    "American Crested",
    "American Satin",
    "Coronet",
    "English Crested",
    "Lunkarya",
    "Merino",
    "Peruvian",
    "Rex",
    "Sheltie",
    "Silkie",
    "Teddy",
    "Texel",
    "White Crested",
    "Other",
  ],
}

// Mock data for pets
const mockPets = [
  {
    id: "1",
    name: "Buddy",
    species: "Dog",
    breed: "Golden Retriever",
    age: 3,
    weight: "30kg",
    lastCheckup: "2023-05-15",
  },
  {
    id: "2",
    name: "Whiskers",
    species: "Cat",
    breed: "Siamese",
    age: 2,
    weight: "4kg",
    lastCheckup: "2023-06-20",
  },
  {
    id: "3",
    name: "Rocky",
    species: "Dog",
    breed: "German Shepherd",
    age: 5,
    weight: "35kg",
    lastCheckup: "2023-04-10",
  },
]

// Mock data for vets
const mockVets = [
  {
    id: "v1",
    name: "Dr. Smith",
    specialty: "General",
    email: "drsmith@example.com",
    phone: "123-456-7890",
  },
  {
    id: "v2",
    name: "Dr. Johnson",
    specialty: "Surgery",
    email: "drjohnson@example.com",
    phone: "123-456-7891",
  },
  {
    id: "v3",
    name: "Dr. Williams",
    specialty: "Dermatology",
    email: "drwilliams@example.com",
    phone: "123-456-7892",
  },
]

// Mock function to fetch vet details by email
const fetchVetByEmail = async (email: string) => {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 500))

  // Find vet in our mock data
  const vet = mockVets.find((v) => v.email.toLowerCase() === email.toLowerCase())

  // If vet is found in mock data, return it
  if (vet) {
    return vet
  }

  // If not found in mock data, simulate fetching from "vets settings page"
  // This would be an actual API call in a real application
  return {
    id: `v${Math.floor(Math.random() * 1000)}`,
    name: `Dr. ${email.split("@")[0].charAt(0).toUpperCase() + email.split("@")[0].slice(1)}`,
    specialty: "General",
    email: email,
    phone: "N/A",
  }
}

const PetCard = ({ pet }: { pet: any }) => (
  <Card className="mb-4">
    <CardContent className="p-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">{pet.name}</h3>
          <p className="text-sm text-gray-500">
            {pet.species} • {pet.breed}
          </p>
          <p className="text-sm text-gray-500">
            Age: {pet.age} • Weight: {pet.weight}
          </p>
          <p className="text-sm text-gray-500">Last Checkup: {pet.lastCheckup}</p>
        </div>
        <Button variant="outline" onClick={() => {}}>
          View
        </Button>
      </div>
    </CardContent>
  </Card>
)

const PetCardSkeleton = () => (
  <Card className="mb-4">
    <CardContent className="p-4">
      <div className="flex justify-between items-center">
        <div className="w-3/4">
          <Skeleton className="h-6 w-1/2 mb-2" />
          <Skeleton className="h-4 w-3/4 mb-2" />
          <Skeleton className="h-4 w-2/3 mb-2" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <Skeleton className="h-10 w-16" />
      </div>
    </CardContent>
  </Card>
)

const PetsContent = () => {
  const [isLoading, setIsLoading] = useState(true)
  const [pets, setPets] = useState<any[]>([])

  useEffect(() => {
    // Simulate loading delay
    const timer = setTimeout(() => {
      setPets(mockPets)
      setIsLoading(false)
    }, 1500)

    return () => clearTimeout(timer)
  }, [])

  if (isLoading) {
    return (
      <div>
        <PetCardSkeleton />
        <PetCardSkeleton />
        <PetCardSkeleton />
      </div>
    )
  }

  return (
    <div>
      {pets.map((pet) => (
        <PetCard key={pet.id} pet={pet} />
      ))}
    </div>
  )
}

const VetSearchContent = () => {
  const [email, setEmail] = useState("")
  const [vet, setVet] = useState<any>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState("")

  const handleSearch = async () => {
    if (!email) {
      setError("Please enter an email address")
      return
    }

    setIsSearching(true)
    setError("")
    setVet(null)

    try {
      const vetData = await fetchVetByEmail(email)
      setVet(vetData)
    } catch (err) {
      setError("Failed to find vet with that email")
      sonnerToast.error("Failed to find vet with that email")
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <div>
      <div className="flex gap-2 mb-6">
        <Input placeholder="Enter vet's email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Button onClick={handleSearch} disabled={isSearching}>
          {isSearching ? "Searching..." : "Search"}
        </Button>
      </div>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      {isSearching && (
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-6 w-1/2 mb-2" />
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </CardContent>
        </Card>
      )}

      {vet && !isSearching && (
        <Card className="mb-4">
          <CardContent className="p-4">
            <h3 className="text-lg font-semibold">{vet.name}</h3>
            <p className="text-sm text-gray-500">Specialty: {vet.specialty}</p>
            <p className="text-sm text-gray-500">Email: {vet.email}</p>
            <p className="text-sm text-gray-500">Phone: {vet.phone}</p>
            <Button className="mt-4" variant="outline">
              Add as Vet
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default function PetProfiles() {
  const router = useRouter()
  const { user } = useAuth()
  const [pets, setPets] = useState<Pet[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState("")
  const [type, setType] = useState("")
  const [breed, setBreed] = useState("")
  const [birthDate, setBirthDate] = useState<string>("")
  const [image, setImage] = useState<File | null>(null)
  const [editingPet, setEditingPet] = useState<Pet | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [customType, setCustomType] = useState("")
  const [selectedBreed, setSelectedBreed] = useState("")
  const [healthRecords, setHealthRecords] = useState<HealthRecord[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [visibleFields, setVisibleFields] = useState<string[]>(["name"])
  const [aiAnalyses, setAiAnalyses] = useState<AIAnalysis[]>([])
  // Add a new state variable to track completed fields
  const [completedFields, setCompletedFields] = useState<string[]>([])
  const [sharingPet, setSharingPet] = useState<Pet | null>(null)
  const [activeTab, setActiveTab] = useState("pets")
  const [sharingHistory, setSharingHistory] = useState<
    {
      pet: Pet
      records: Array<{
        vetId: string
        vetName: string
        vetEmail: string
        sharedAt: string
        status: string
        vetPhone?: string
      }>
    }[]
  >([])
  const [loadingSharingHistory, setLoadingSharingHistory] = useState(false)

  // Define required fields
  const requiredFields = ["name", "type", "breed", "birthDate"]
  // Add image to required fields if not editing a pet (for new pets)
  const allRequiredFields = requiredFields

  useEffect(() => {
    if (user) {
      fetchPets()
    } else {
      setLoading(false)
      setPets([])
    }
    if (editingPet) {
      fetchHealthRecords(editingPet.id)
    }
  }, [user, editingPet])

  const fetchPets = async () => {
    if (!user) return
    try {
      const q = query(collection(db, "pets"), where("userId", "==", user.uid))
      const querySnapshot = await getDocs(q)
      const fetchedPets: Pet[] = []
      querySnapshot.forEach((doc) => {
        fetchedPets.push({ id: doc.id, ...doc.data() } as Pet)
      })
      setPets(fetchedPets)

      // After fetching pets, also fetch sharing history
      fetchAllSharingHistory(fetchedPets)
    } catch (error) {
      console.error("Error fetching pets:", error)
      setError("Failed to fetch pets. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const fetchAllSharingHistory = async (petsList: Pet[]) => {
    if (!user || petsList.length === 0) return

    setLoadingSharingHistory(true)

    try {
      const sharingHistoryData: {
        pet: Pet
        records: Array<{
          vetId: string
          vetName: string
          vetEmail: string
          sharedAt: string
          status: string
          vetPhone?: string
        }>
      }[] = []

      for (const pet of petsList) {
        if (pet.sharedWithVets && pet.sharedWithVets.length > 0) {
          sharingHistoryData.push({
            pet,
            records: pet.sharedWithVets,
          })
        }
      }

      setSharingHistory(sharingHistoryData)
    } catch (error) {
      console.error("Error fetching sharing history:", error)
    } finally {
      setLoadingSharingHistory(false)
    }
  }

  const fetchHealthRecords = async (petId: string): Promise<HealthRecord[]> => {
    if (!user) return []
    try {
      const q = query(
        collection(db, "healthRecords"),
        where("userId", "==", user.uid),
        where("petId", "==", petId),
        orderBy("date", "desc"),
      )
      const querySnapshot = await getDocs(q)
      const records: HealthRecord[] = []
      querySnapshot.forEach((doc) => {
        records.push({ id: doc.id, ...doc.data() } as HealthRecord)
      })
      return records
    } catch (error) {
      console.error("Error fetching health records:", error)
      return []
    }
  }

  const fetchAIAnalyses = async (petId: string): Promise<AIAnalysis[]> => {
    if (!user) return []
    try {
      const q = query(
        collection(db, "aiAnalyses"),
        where("userId", "==", user.uid),
        where("petId", "==", petId),
        orderBy("date", "desc"),
      )
      const querySnapshot = await getDocs(q)
      const analyses: AIAnalysis[] = []
      querySnapshot.forEach((doc) => {
        analyses.push({ id: doc.id, ...doc.data() } as AIAnalysis)
      })
      return analyses
    } catch (error) {
      console.error("Error fetching AI analyses:", error)
      return []
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      setError("You must be logged in to add or update a pet")
      return
    }
    if (!birthDate) {
      setError("Please provide a birth date for your pet")
      return
    }

    setLoading(true)
    setError(null)
    try {
      let imageUrl = ""
      if (image) {
        const storageRef = ref(storage, `pet_images/${user.uid}/${Date.now()}_${image.name}`)
        await uploadBytes(storageRef, image)
        imageUrl = await getDownloadURL(storageRef)
      }

      const petData = {
        userId: user.uid,
        name,
        type: type === "Other" ? customType : type,
        breed: selectedBreed === "Other" ? breed : selectedBreed,
        birthDate: birthDate, // Store as a string in YYYY-MM-DD format
        imageUrl: imageUrl || (editingPet ? editingPet.imageUrl : ""),
        createdAt: editingPet ? editingPet.createdAt : new Date().toISOString(),
      }

      if (editingPet) {
        await updateDoc(doc(db, "pets", editingPet.id), petData)
      } else {
        await addDoc(collection(db, "pets"), petData)
      }

      setName("")
      setType("")
      setBreed("")
      setBirthDate("")
      setImage(null)
      setEditingPet(null)
      setCustomType("")
      setSelectedBreed("")
      setVisibleFields(["name"])
      setCompletedFields([]) // Reset completed fields
      await fetchPets()
    } catch (error) {
      console.error("Error adding/updating pet:", error)
      setError("Failed to save pet. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (pet: Pet) => {
    if (!user) return
    try {
      await deleteDoc(doc(db, "pets", pet.id))
      if (pet.imageUrl) {
        const imageRef = ref(storage, pet.imageUrl)
        await deleteObject(imageRef)
      }
      await fetchPets()
    } catch (error) {
      console.error("Error deleting pet:", error)
      setError("Failed to delete pet. Please try again.")
    }
  }

  const handleEdit = (pet: Pet) => {
    setEditingPet(pet)
    setName(pet.name)
    setType(
      ["Dog", "Cat", "Fish", "Bird", "Rabbit", "Reptile", "Hamster", "Guinea Pig"].includes(pet.type)
        ? pet.type
        : "Other",
    )
    setCustomType(
      ["Dog", "Cat", "Fish", "Bird", "Rabbit", "Reptile", "Hamster", "Guinea Pig"].includes(pet.type) ? "" : pet.type,
    )
    setSelectedBreed(breedsByType[pet.type]?.includes(pet.breed) ? pet.breed : "Other")
    setBreed(breedsByType[pet.type]?.includes(pet.breed) ? "" : pet.breed)
    setBirthDate(pet.birthDate || "") // Set as string
    setVisibleFields(["name", "type", "breed", "birthDate", "image"])
    // Reset completed fields when editing
    setCompletedFields([])
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImage(e.target.files[0])
      // Reset completed status when image changes
      if (completedFields.includes("image")) {
        setCompletedFields(completedFields.filter((field) => field !== "image"))
      }
    }
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  const handleGeneratePDF = async (pet: Pet) => {
    try {
      setError(null)
      const petHealthRecords = await fetchHealthRecords(pet.id)
      const petAIAnalyses = await fetchAIAnalyses(pet.id)

      const doc = new jsPDF()

      try {
        let yOffset = 20

        // Add title
        doc.setFontSize(20)
        doc.text("Pet Health Report", 20, yOffset)
        yOffset += 10

        // Add current date and time of report generation
        doc.setFontSize(10)
        doc.text(`Report generated: ${format(new Date(), "MMMM d, yyyy 'at' HH:mm")}`, 20, yOffset)
        yOffset += 20

        // Add pet information
        doc.setFontSize(12)
        doc.text(`Name: ${pet.name}`, 20, yOffset)
        yOffset += 10
        doc.text(`Type: ${pet.type}`, 20, yOffset)
        yOffset += 10
        doc.text(`Breed: ${pet.breed}`, 20, yOffset)
        yOffset += 10

        // Handle potential invalid birth date
        let birthDateText = "Birth Date: Unknown"
        try {
          const birthDate = new Date(pet.birthDate)
          if (!isNaN(birthDate.getTime())) {
            birthDateText = `Birth Date: ${format(birthDate, "MMMM d, yyyy")}`
          }
        } catch (error) {
          console.error("Invalid birth date:", pet.birthDate)
        }
        doc.text(birthDateText, 20, yOffset)
        yOffset += 20

        // Add health records
        if (petHealthRecords.length > 0) {
          doc.setFontSize(16)
          doc.text("Health Records:", 20, yOffset)
          yOffset += 10

          doc.setFontSize(12)
          petHealthRecords.forEach((record: HealthRecord, index: number) => {
            // Check if we need a new page
            if (yOffset > 270) {
              doc.addPage()
              yOffset = 20
            }

            let recordDateTime = "Unknown Date and Time"
            try {
              const date = new Date(record.date)
              if (!isNaN(date.getTime())) {
                recordDateTime = format(date, "MMMM d, yyyy 'at' HH:mm")
              }
            } catch (error) {
              console.error("Invalid record date:", record.date)
            }

            // Start with the date
            doc.text(`Date: ${recordDateTime}`, 20, yOffset)
            yOffset += 10

            // Only include defined fields
            const definedFields = [
              { key: "weight", label: "Weight", value: record.weight, suffix: " kg" },
              { key: "activityLevel", label: "Activity Level", value: record.activityLevel, suffix: "/10" },
              { key: "foodIntake", label: "Food Intake", value: record.foodIntake },
              { key: "sleepDuration", label: "Sleep Duration", value: record.sleepDuration, suffix: " hours" },
              { key: "behavior", label: "Behavior", value: record.behavior },
              { key: "notes", label: "Notes", value: record.notes },
            ].filter((field) => {
              if (typeof field.value === "number") {
                return !isNaN(field.value)
              }
              return field.value !== undefined && field.value !== null && field.value !== ""
            })

            // Add each defined field
            definedFields.forEach((field) => {
              if (yOffset > 270) {
                doc.addPage()
                yOffset = 20
              }
              const value = field.suffix ? `${field.value}${field.suffix}` : field.value
              doc.text(`${field.label}: ${value}`, 30, yOffset)
              yOffset += 10
            })

            // Add separator between records but don't add after the last one
            if (index < petHealthRecords.length - 1) {
              yOffset += 5
              if (yOffset > 270) {
                doc.addPage()
                yOffset = 20
              } else {
                doc.setDrawColor(200, 200, 200)
                doc.line(20, yOffset, 190, yOffset)
                yOffset += 10
              }
            }
          })
        }

        // Add AI Analyses - don't force a new page, just check if we need one
        if (petAIAnalyses.length > 0) {
          // Check if we need a new page based on available space
          if (yOffset > 240) {
            // Need more space for the header
            doc.addPage()
            yOffset = 20
          } else {
            yOffset += 20 // Add some spacing if continuing on same page
          }

          doc.setFontSize(16)
          doc.text("AI Analyses:", 20, yOffset)
          yOffset += 10

          doc.setFontSize(12)
          petAIAnalyses.forEach((analysis: AIAnalysis, index: number) => {
            // Check if we need a new page
            if (yOffset > 250) {
              doc.addPage()
              yOffset = 20
            }

            // Handle different date formats
            let analysisDateTime = "Unknown Date and Time"
            try {
              let date: Date
              if (typeof analysis.date === "string") {
                date = new Date(analysis.date)
              } else if (analysis.date && "seconds" in analysis.date) {
                // Handle Firestore Timestamp
                date = new Date(analysis.date.seconds * 1000)
              } else {
                throw new Error("Invalid date format")
              }

              if (!isNaN(date.getTime())) {
                analysisDateTime = format(date, "MMMM d, yyyy 'at' h:mm a")
              }
            } catch (error) {
              console.error("Error formatting analysis date:", error)
            }

            doc.text(`Date: ${analysisDateTime}`, 20, yOffset)
            yOffset += 10
            doc.text(`Type: ${analysis.type}`, 20, yOffset)
            yOffset += 10
            doc.text("Analysis:", 20, yOffset)
            yOffset += 10

            if (analysis.analysis) {
              let analysisData: any
              if (typeof analysis.analysis === "string") {
                try {
                  analysisData = JSON.parse(analysis.analysis)
                } catch {
                  analysisData = analysis.analysis
                }
              } else if (typeof analysis.analysis === "object") {
                analysisData = analysis.analysis
              } else {
                analysisData = "Invalid analysis data"
              }

              if (typeof analysisData === "object") {
                Object.entries(analysisData).forEach(([key, value]) => {
                  // Check if we need a new page
                  if (yOffset > 270) {
                    doc.addPage()
                    yOffset = 20
                  }

                  doc.setFontSize(11)
                  doc.setFont(undefined, "bold")
                  doc.text(`${key.charAt(0).toUpperCase() + key.slice(1)}:`, 30, yOffset)
                  yOffset += 7
                  doc.setFont(undefined, "normal")
                  if (Array.isArray(value)) {
                    value.forEach((item: string) => {
                      const lines = doc.splitTextToSize(`• ${item}`, 150)
                      lines.forEach((line: string) => {
                        // Check if we need a new page
                        if (yOffset > 270) {
                          doc.addPage()
                          yOffset = 20
                        }
                        doc.text(line, 35, yOffset)
                        yOffset += 7
                      })
                    })
                  } else {
                    const lines = doc.splitTextToSize(value as string, 150)
                    lines.forEach((line: string) => {
                      // Check if we need a new page
                      if (yOffset > 270) {
                        doc.addPage()
                        yOffset = 20
                      }
                      doc.text(line, 35, yOffset)
                      yOffset += 7
                    })
                  }
                  yOffset += 5 // Add some space between sections
                })
              } else {
                const lines = doc.splitTextToSize(analysisData, 170)
                lines.forEach((line: string) => {
                  // Check if we need a new page
                  if (yOffset > 270) {
                    doc.addPage()
                    yOffset = 20
                  }
                  doc.text(line, 30, yOffset)
                  yOffset += 7
                })
              }
            }

            // Add separator between analyses but don't add after the last one
            if (index < petAIAnalyses.length - 1) {
              yOffset += 5
              if (yOffset > 270) {
                doc.addPage()
                yOffset = 20
              } else {
                doc.setDrawColor(200, 200, 200)
                doc.line(20, yOffset, 190, yOffset)
                yOffset += 10
              }
            }
          })
        }

        // Generate filename with current date and time
        const currentDateTime = format(new Date(), "yyyy-MM-dd_HH-mm")
        const filename = `${pet.name}_health_report_${currentDateTime}.pdf`

        // Save the PDF
        doc.save(filename)
      } catch (pdfError) {
        console.error("Error during PDF generation:", pdfError)
        setError("An error occurred while generating the PDF. Please try again.")
      }
    } catch (error) {
      console.error("Error fetching data for PDF:", error)
      setError("Failed to fetch data for the PDF. Please try again.")
    }
  }

  // Update the handleFieldComplete function to also mark fields as completed
  const handleFieldComplete = (field: string, nextField: string, e?: React.MouseEvent) => {
    // Prevent any default behavior
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }

    if (!visibleFields.includes(nextField)) {
      setVisibleFields([...visibleFields, nextField])
    }
    // Add the field to completedFields if not already there
    if (!completedFields.includes(field)) {
      setCompletedFields([...completedFields, field])
    }
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value)
    // Reset completed status when name changes
    if (completedFields.includes("name")) {
      setCompletedFields(completedFields.filter((field) => field !== "name"))
    }
  }

  const handleTypeChange = (value: string) => {
    setType(value)
    // Reset completed status when type changes
    if (completedFields.includes("type")) {
      setCompletedFields(completedFields.filter((field) => field !== "type"))
    }
  }

  const handleBreedChange = (value: string) => {
    setSelectedBreed(value)
    // Reset completed status when breed changes
    if (completedFields.includes("breed")) {
      setCompletedFields(completedFields.filter((field) => field !== "breed"))
    }
  }

  const handleBirthDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedDate = e.target.value
    const today = new Date().toISOString().split("T")[0]

    // Prevent future dates
    if (selectedDate > today) {
      toast.error("Birth date cannot be in the future")
      return
    }

    setBirthDate(selectedDate)
    // Reset completed status when birth date changes
    if (completedFields.includes("birthDate")) {
      setCompletedFields(completedFields.filter((field) => field !== "birthDate"))
    }
  }

  const handleCustomTypeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomType(e.target.value)
    // Reset completed status when custom type changes
    if (completedFields.includes("customType")) {
      setCompletedFields(completedFields.filter((field) => field !== "customType"))
    }
  }

  const handleCustomBreedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBreed(e.target.value)
    // Reset completed status when custom breed changes
    if (completedFields.includes("customBreed")) {
      setCompletedFields(completedFields.filter((field) => field !== "customBreed"))
    }
  }

  // Check if all required fields are completed
  const areAllFieldsCompleted = () => {
    // For editing a pet with an existing image, we don't require the image field to be completed
    const fieldsToCheck = editingPet && !image ? requiredFields : allRequiredFields
    return fieldsToCheck.every((field) => completedFields.includes(field))
  }

  // Check if form is valid (all required fields have values and are completed)
  const isFormValid = () => {
    const hasRequiredValues = name && type && selectedBreed && birthDate
    const hasImage = true // Image is now optional
    return hasRequiredValues && hasImage && areAllFieldsCompleted()
  }

  const handleShareWithVet = (pet: Pet) => {
    setSharingPet(pet)
  }

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM d, yyyy h:mm a")
    } catch (error) {
      return "Invalid date"
    }
  }

  const refreshSharingHistory = async () => {
    await fetchAllSharingHistory(pets)
    toast.success("Sharing history refreshed")
  }

  // First, add the handleRevokeAccess function from the SharePetDialog component
  // Add this function before the return statement

  const handleRevokeAccess = async (petId: string, vetId: string) => {
    if (!user) return

    try {
      setLoading(true)

      // Get current pet data
      const petRef = doc(db, "pets", petId)
      const petDoc = await getDocs(query(collection(db, "pets"), where("__name__", "==", petId)))

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
        where("petId", "==", petId),
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
      // Refresh the sharing history
      await fetchAllSharingHistory(pets)
    } catch (error) {
      console.error("Error revoking access:", error)
      toast.error("Failed to revoke access")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#FFFFFF]">
      <PageHeader title="Pet Profiles" />
      <PetHeader />

      {/* Subscription Banner */}
      {user && <PremiumBanner />}

      <main className="flex-grow flex flex-col items-center p-4 sm:p-6 pb-24 lg:pb-6">
        {error && <p className="text-red-500 mb-4">{error}</p>}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-md">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pets">My Pets</TabsTrigger>
            <TabsTrigger value="sharing">Sharing History</TabsTrigger>
          </TabsList>

          <TabsContent value="pets" className="space-y-6">
            <div className="w-full max-w-md space-y-6">
              <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-4">
                {/* Update the input field styling for the name field */}
                <div className="flex items-center">
                  <input
                    type="text"
                    value={name}
                    onChange={handleNameChange}
                    placeholder="Pet Name"
                    required
                    className={`px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#2D57ED] w-full ${
                      name ? "!w-[90%]" : ""
                    }`}
                  />
                  {name && (
                    <Button
                      type="button"
                      size="icon"
                      className={`ml-2 ${
                        completedFields.includes("name")
                          ? "bg-blue-500 hover:bg-blue-600"
                          : "bg-green-500 hover:bg-green-600"
                      } !w-[35px] !h-[35px] !p-0 flex items-center justify-center`}
                      onClick={(e) => handleFieldComplete("name", "type", e)}
                    >
                      <Check className="!h-4 !w-4" />
                    </Button>
                  )}
                </div>

                {/* Update the type selection field */}
                {visibleFields.includes("type") && (
                  <div className="flex items-center">
                    <Select value={type} onValueChange={handleTypeChange}>
                      <SelectTrigger
                        className={`w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#2D57ED] ${
                          type ? "!w-[90%]" : ""
                        }`}
                      >
                        <SelectValue placeholder="Select Pet Type" />
                      </SelectTrigger>
                      <SelectContent>
                        {["Dog", "Cat", "Fish", "Bird", "Rabbit", "Reptile", "Hamster", "Guinea Pig", "Other"].map(
                          (petType) => (
                            <SelectItem key={petType} value={petType}>
                              {petType}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                    {type && (
                      <Button
                        type="button"
                        size="icon"
                        className={`ml-2 ${
                          completedFields.includes("type")
                            ? "bg-blue-500 hover:bg-blue-600"
                            : "bg-green-500 hover:bg-green-600"
                        } !w-[35px] !h-[35px] !p-0 flex items-center justify-center`}
                        onClick={(e) => handleFieldComplete("type", "breed", e)}
                      >
                        <Check className="!h-4 !w-4" />
                      </Button>
                    )}
                  </div>
                )}

                {/* Update the custom type input field */}
                {type === "Other" && visibleFields.includes("type") && (
                  <input
                    type="text"
                    value={customType}
                    onChange={handleCustomTypeChange}
                    placeholder="Enter custom pet type"
                    required
                    className={`w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#2D57ED] mt-2`}
                  />
                )}

                {/* Update the breed selection field */}
                {visibleFields.includes("breed") && (
                  <div className="flex items-center">
                    <Select value={selectedBreed} onValueChange={handleBreedChange}>
                      <SelectTrigger
                        className={`w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#2D57ED] ${
                          selectedBreed ? "!w-[90%]" : ""
                        }`}
                      >
                        <SelectValue placeholder="Select Breed" />
                      </SelectTrigger>
                      <SelectContent>
                        {breedsByType[type === "Other" ? customType : type]?.map((breed) => (
                          <SelectItem key={breed} value={breed}>
                            {breed}
                          </SelectItem>
                        )) || (
                          <SelectItem value="Other" disabled>
                            No breeds available
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    {selectedBreed && (
                      <Button
                        type="button"
                        size="icon"
                        className={`ml-2 ${
                          completedFields.includes("breed")
                            ? "bg-blue-500 hover:bg-blue-600"
                            : "bg-green-500 hover:bg-green-600"
                        } !w-[35px] !h-[35px] !p-0 flex items-center justify-center`}
                        onClick={(e) => handleFieldComplete("breed", "birthDate", e)}
                      >
                        <Check className="!h-4 !w-4" />
                      </Button>
                    )}
                  </div>
                )}

                {/* Update the custom breed input field */}
                {selectedBreed === "Other" && visibleFields.includes("breed") && (
                  <input
                    type="text"
                    value={breed}
                    onChange={handleCustomBreedChange}
                    placeholder="Enter custom breed"
                    required
                    className={`w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#2D57ED] mt-2`}
                  />
                )}

                {/* Update the birth date field */}
                {visibleFields.includes("birthDate") && (
                  <div className="flex items-center">
                    <div className="flex-grow space-y-2 w-[90%]">
                      <label htmlFor="birthDate" className="block text-sm font-medium text-gray-700">
                        Select date of birth
                      </label>
                      <input
                        type="date"
                        id="birthDate"
                        value={birthDate}
                        onChange={handleBirthDateChange}
                        max={new Date().toISOString().split("T")[0]}
                        className={`w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#2D57ED] ${
                          birthDate ? "w-full" : "w-full"
                        }`}
                        required
                      />
                    </div>
                    {birthDate && (
                      <div className="flex flex-col items-end">
                        <Button
                          type="button"
                          size="icon"
                          className={`ml-2 ${
                            completedFields.includes("birthDate")
                              ? "bg-blue-500 hover:bg-blue-600"
                              : "bg-green-500 hover:bg-green-600"
                          } !w-[35px] !h-[35px] !p-0 flex items-center justify-center mt-[23px]`}
                          onClick={(e) => handleFieldComplete("birthDate", "image", e)}
                        >
                          <Check className="!h-4 !w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
                {visibleFields.includes("image") && (
                  <div className="flex items-center !items-start">
                    <div className={`flex-grow space-y-2 w-full ${image ? "!w-[90%]" : ""}`}>
                      <p className="block text-sm font-medium text-gray-700">Add a photo of your pet (Optional)</p>
                      <div className="mt-2">
                        <button
                          type="button"
                          onClick={triggerFileInput}
                          className={`w-full px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center leading-4`}
                        >
                          <ImageIcon className="mr-2" size={18} />
                          Choose Image
                        </button>
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        onChange={handleImageChange}
                        accept="image/*"
                        className="hidden"
                      />
                      {image && <p className="mt-2 text-sm">Selected: {image.name}</p>}
                    </div>
                    {image && (
                      <Button
                        type="button"
                        size="icon"
                        className={`ml-2 ${
                          completedFields.includes("image")
                            ? "bg-blue-500 hover:bg-blue-600"
                            : "bg-green-500 hover:bg-green-600"
                        } !w-[35px] !h-[35px] !p-0 flex items-center justify-center mt-[29px]`}
                        onClick={(e) => handleFieldComplete("image", "", e)}
                      >
                        <Check className="!h-4 !w-4" />
                      </Button>
                    )}
                  </div>
                )}
                {/* Add instructional text above the button */}
                <p className="text-gray-400 text-sm text-center mb-2">Fill required fields to add pet.</p>
                <button
                  type="submit"
                  className={`w-full px-4 py-2 text-white rounded-lg hover:bg-opacity-90 transition-colors flex items-center justify-center ${
                    isFormValid() ? "bg-[#2D57ED]" : "bg-gray-600"
                  }`}
                  disabled={!isFormValid()}
                >
                  <Plus className="mr-2" />
                  {editingPet ? "Update Pet" : "Add Pet"}
                </button>
              </form>

              <div className="grid grid-cols-1 gap-4">
                {pets.map((pet) => (
                  <div key={pet.id} className="bg-white rounded-lg shadow-md p-4">
                    <div className="flex flex-row items-center justify-between">
                      <div className="flex items-center space-x-4">
                        {pet.imageUrl && (
                          <div>
                            <img
                              src={pet.imageUrl || "/placeholder.svg"}
                              alt={pet.name}
                              className="w-16 h-16 object-cover rounded-lg"
                            />
                          </div>
                        )}
                        <div>
                          <h2 className="text-xl font-semibold">{pet.name}</h2>
                          <p className="text-gray-600">
                            {pet.type} • {pet.breed}
                          </p>
                          {pet.birthDate && (
                            <p className="text-gray-600">Born: {format(parseISO(pet.birthDate), "PPP")}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col space-y-2">
                        <Button
                          onClick={() => handleGeneratePDF(pet)}
                          variant="outline"
                          className="text-green-600 border-green-600 hover:bg-green-50"
                          size="sm"
                        >
                          <FileDown className="w-4 h-4 mr-1" />
                          Report
                        </Button>
                        <Button
                          onClick={() => handleShareWithVet(pet)}
                          variant="outline"
                          className="text-blue-600 border-blue-600 hover:bg-blue-50"
                          size="sm"
                        >
                          <Share2 className="w-4 h-4 mr-1" />
                          Share
                        </Button>
                        <Button
                          onClick={() => handleEdit(pet)}
                          variant="outline"
                          className="text-[#2D57ED] border-[#2D57ED] hover:bg-blue-50"
                          size="sm"
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          onClick={() => handleDelete(pet)}
                          variant="outline"
                          className="text-red-500 border-red-500 hover:bg-red-50"
                          size="sm"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="sharing" className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Pet Sharing History</h2>
              <Button
                onClick={refreshSharingHistory}
                variant="outline"
                size="sm"
                disabled={loadingSharingHistory}
                className="flex items-center"
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Refresh
              </Button>
            </div>

            {loadingSharingHistory ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : sharingHistory.length > 0 ? (
              <div className="space-y-4">
                {sharingHistory.map((item, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        {item.pet.imageUrl && (
                          <img
                            src={item.pet.imageUrl || "/placeholder.svg"}
                            alt={item.pet.name}
                            className="w-10 h-10 rounded-full object-cover mr-3"
                          />
                        )}
                        <div>
                          <h3 className="font-semibold">{item.pet.name}</h3>
                          <p className="text-sm text-gray-600">
                            {item.pet.type} • {item.pet.breed}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-1 text-gray-500" />
                        <span className="text-sm text-gray-500">
                          {item.records.length} {item.records.length === 1 ? "share" : "shares"}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3 border-t pt-3">
                      {item.records.map((record, recordIndex) => (
                        <div
                          key={recordIndex}
                          className="flex justify-between items-start border-b pb-3 last:border-b-0"
                        >
                          <div>
                            <p className="font-medium">{record.vetName || "Unnamed Vet"}</p>
                            <p className="text-sm text-gray-600">{record.vetEmail || "No email provided"}</p>
                            <p className="text-sm text-gray-600">{record.vetPhone || "No phone number"}</p>
                            <p className="text-xs text-gray-500">Shared on {formatDate(record.sharedAt)}</p>
                          </div>
                          <div className="flex items-center">
                            <Badge
                              className={
                                record.status === "active"
                                  ? "bg-green-100 text-green-800 hover:bg-green-100"
                                  : "bg-red-100 text-red-800 hover:bg-red-100"
                              }
                            >
                              {record.status === "active" ? "Active" : "Revoked"}
                            </Badge>
                            {record.status === "active" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="ml-2 h-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleRevokeAccess(item.pet.id, record.vetId)}
                                disabled={loading}
                              >
                                Revoke
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <Share2 className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                <p className="text-gray-600">You haven't shared any pets with vets yet.</p>
                <p className="text-sm text-gray-500 mt-1">
                  When you share a pet with a vet, the sharing history will appear here.
                </p>
              </div>
            )}
          </TabsContent>
          <TabsContent value="vets">
            <VetSearchContent />
          </TabsContent>
        </Tabs>

        {sharingPet && <SharePetDialog isOpen={!!sharingPet} onClose={() => setSharingPet(null)} pet={sharingPet} />}
      </main>
    </div>
  )
}
