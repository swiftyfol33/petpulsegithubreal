"use client"

import { useState, useEffect } from "react"
import { useAuth } from "../../contexts/AuthContext"
import { db } from "../../lib/firebase"
import { collection, query, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore"
import { PageHeader } from "../../components/page-header"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Mail, Phone, MapPin, Edit, Trash2, Search, UserPlus, Check, X, RefreshCw } from "lucide-react"
import { toast } from "react-hot-toast"

interface VetUser {
  id: string
  uid: string
  email: string
  name: string
  phoneNumber: string
  address: string
  specialization: string[]
  verified: boolean
  createdAt: string
}

export default function VetUsersPage() {
  const { user } = useAuth()
  const [vetUsers, setVetUsers] = useState<VetUser[]>([])
  const [filteredVetUsers, setFilteredVetUsers] = useState<VetUser[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedVet, setSelectedVet] = useState<VetUser | null>(null)
  const [isVerifyDialogOpen, setIsVerifyDialogOpen] = useState(false)

  // Check if user is admin
  const isAdmin = user && user.email === "admin@petpulse.com" // Replace with your actual admin check logic

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    fetchVetUsers()
  }, [user])

  useEffect(() => {
    filterVetUsers()
  }, [searchTerm, vetUsers, activeTab])

  const fetchVetUsers = async () => {
    setLoading(true)
    try {
      // Only admins can see all vet users
      if (!isAdmin) {
        setVetUsers([])
        setLoading(false)
        return
      }

      const vetUsersRef = collection(db, "vetUsers")
      const q = query(vetUsersRef)
      const querySnapshot = await getDocs(q)

      const fetchedVetUsers: VetUser[] = []
      querySnapshot.forEach((doc) => {
        const data = doc.data() as Omit<VetUser, "id">
        fetchedVetUsers.push({
          id: doc.id,
          ...data,
        })
      })

      // Sort by creation date (newest first)
      fetchedVetUsers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

      setVetUsers(fetchedVetUsers)
    } catch (error) {
      console.error("Error fetching vet users:", error)
      toast.error("Failed to load vet users")
    } finally {
      setLoading(false)
    }
  }

  const filterVetUsers = () => {
    let filtered = [...vetUsers]

    // Filter by tab
    if (activeTab === "verified") {
      filtered = filtered.filter((vet) => vet.verified)
    } else if (activeTab === "unverified") {
      filtered = filtered.filter((vet) => !vet.verified)
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (vet) =>
          vet.name.toLowerCase().includes(term) ||
          vet.email.toLowerCase().includes(term) ||
          vet.specialization.some((spec) => spec.toLowerCase().includes(term)),
      )
    }

    setFilteredVetUsers(filtered)
  }

  const handleVerifyVet = async () => {
    if (!selectedVet) return

    try {
      const vetRef = doc(db, "vetUsers", selectedVet.id)
      await updateDoc(vetRef, {
        verified: !selectedVet.verified,
      })

      // Update local state
      setVetUsers((prevVets) =>
        prevVets.map((vet) => (vet.id === selectedVet.id ? { ...vet, verified: !selectedVet.verified } : vet)),
      )

      toast.success(`Vet ${selectedVet.verified ? "unverified" : "verified"} successfully`)
      setIsVerifyDialogOpen(false)
    } catch (error) {
      console.error("Error updating vet verification status:", error)
      toast.error("Failed to update verification status")
    }
  }

  const handleDeleteVet = async () => {
    if (!selectedVet) return

    try {
      await deleteDoc(doc(db, "vetUsers", selectedVet.id))

      // Update local state
      setVetUsers((prevVets) => prevVets.filter((vet) => vet.id !== selectedVet.id))

      toast.success("Vet deleted successfully")
      setIsDeleteDialogOpen(false)
    } catch (error) {
      console.error("Error deleting vet:", error)
      toast.error("Failed to delete vet")
    }
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col min-h-screen bg-[#FFFFFF]">
        <PageHeader title="Vet Users" />
        <main className="flex-grow p-4 pb-24 lg:pb-6">
          <div className="max-w-4xl mx-auto text-center p-8">
            <h2 className="text-2xl font-bold mb-4">Access Restricted</h2>
            <p>You don't have permission to view this page.</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#FFFFFF]">
      <PageHeader title="Vet Users" />
      <main className="flex-grow p-4 pb-24 lg:pb-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div className="relative w-full md:w-auto flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <Input
                type="text"
                placeholder="Search by name, email, or specialization"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={fetchVetUsers} className="flex items-center gap-1">
                <RefreshCw size={16} />
                Refresh
              </Button>
              <Button className="flex items-center gap-1">
                <UserPlus size={16} />
                Add Vet
              </Button>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="all">All Vets</TabsTrigger>
              <TabsTrigger value="verified">Verified</TabsTrigger>
              <TabsTrigger value="unverified">Unverified</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="m-0">
              {loading ? (
                <div className="text-center py-8">
                  <p>Loading vet users...</p>
                </div>
              ) : filteredVetUsers.length === 0 ? (
                <div className="text-center py-8 border rounded-lg">
                  <p className="text-gray-500">No vet users found</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredVetUsers.map((vet) => (
                    <Card key={vet.id} className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-lg">{vet.name}</h3>
                            <Badge variant={vet.verified ? "default" : "outline"}>
                              {vet.verified ? "Verified" : "Unverified"}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600">{vet.email}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedVet(vet)
                              setIsVerifyDialogOpen(true)
                            }}
                          >
                            {vet.verified ? <X size={18} /> : <Check size={18} />}
                          </Button>
                          <Button variant="ghost" size="icon">
                            <Edit size={18} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-500 hover:text-red-700"
                            onClick={() => {
                              setSelectedVet(vet)
                              setIsDeleteDialogOpen(true)
                            }}
                          >
                            <Trash2 size={18} />
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2 mt-4">
                        <p className="text-sm flex items-center gap-2">
                          <Phone size={16} className="text-gray-500" />
                          {vet.phoneNumber || "No phone number"}
                        </p>
                        <p className="text-sm flex items-center gap-2">
                          <MapPin size={16} className="text-gray-500" />
                          {vet.address || "No address"}
                        </p>
                        <p className="text-sm flex items-center gap-2">
                          <Mail size={16} className="text-gray-500" />
                          {vet.email}
                        </p>
                      </div>

                      <div className="mt-4">
                        <p className="text-sm font-medium mb-2">Specializations:</p>
                        <div className="flex flex-wrap gap-2">
                          {vet.specialization && vet.specialization.length > 0 ? (
                            vet.specialization.map((spec, index) => (
                              <Badge key={index} variant="secondary">
                                {spec}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-sm text-gray-500">No specializations listed</span>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t text-sm text-gray-500">
                        Joined: {new Date(vet.createdAt).toLocaleDateString()}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Verify/Unverify Dialog */}
      <Dialog open={isVerifyDialogOpen} onOpenChange={setIsVerifyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedVet?.verified ? "Unverify Vet" : "Verify Vet"}</DialogTitle>
          </DialogHeader>
          <p>
            Are you sure you want to {selectedVet?.verified ? "unverify" : "verify"} {selectedVet?.name}?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsVerifyDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleVerifyVet}>{selectedVet?.verified ? "Unverify" : "Verify"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Vet</DialogTitle>
          </DialogHeader>
          <p>Are you sure you want to delete {selectedVet?.name}? This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteVet}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
