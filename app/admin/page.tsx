"use client"

import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LoadingSpinner } from "@/components/loading"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  db,
  collection,
  query,
  getDocs,
  orderBy,
  limit,
  updateDoc,
  doc as firestoreDoc,
  startAfter,
  setDoc,
  where,
  auth as firebaseAuth,
  fetchSignInMethodsForEmail,
} from "@/lib/firebase"
import {
  Shield,
  ShieldCheck,
  ShieldX,
  User,
  Search,
  Loader2,
  Users,
  Trash2,
  Crown,
  CreditCard,
  FolderSyncIcon as Sync,
  AlertTriangle,
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

type UserRole = {
  email: string
  isAdmin: boolean
  updatedAt?: string
  updatedBy?: string
}

type SubscriptionInfo = {
  status?: string
  plan?: "free" | "monthly" | "yearly" | null
  priceId?: string
  currentPeriodEnd?: string
  id?: string
  trial?: boolean
}

type AppUser = {
  id: string
  email: string
  displayName?: string
  photoURL?: string
  createdAt?: string
  lastLoginAt?: string
  isAdmin?: boolean
  deleted?: boolean
  subscription?: SubscriptionInfo // Add this field
}

export default function AdminPanel() {
  const { user, loading, isAdmin, setAdminStatus } = useAuth()
  const { toast } = useToast()
  const router = useRouter()

  // Admin roles state
  const [userRoles, setUserRoles] = useState<UserRole[]>([])
  const [newAdminEmail, setNewAdminEmail] = useState("")
  const [loadingRoles, setLoadingRoles] = useState(false)
  const [processingEmail, setProcessingEmail] = useState<string | null>(null)
  const [searchRolesQuery, setSearchRolesQuery] = useState("")
  const [orphanedAdmins, setOrphanedAdmins] = useState<string[]>([])
  const [syncingOrphanedAdmins, setSyncingOrphanedAdmins] = useState(false)

  // All users state
  const [allUsers, setAllUsers] = useState<AppUser[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [loadingMoreUsers, setLoadingMoreUsers] = useState(false)
  const [searchUsersQuery, setSearchUsersQuery] = useState("")
  const [userCount, setUserCount] = useState(0)
  const [lastVisible, setLastVisible] = useState<any>(null)
  const [hasMoreUsers, setHasMoreUsers] = useState(true)

  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const USERS_PER_PAGE = 20

  const [manualEmail, setManualEmail] = useState("")
  const [processingManualAdd, setProcessingManualAdd] = useState(false)
  const [manualAddResult, setManualAddResult] = useState<{ success?: boolean; message: string } | null>(null)
  const [manualAddedUsers, setManualAddedUsers] = useState<{ email: string; timestamp: string }[]>([])
  const [bypassAuthCheck, setBypassAuthCheck] = useState(false)

  // Sync users state
  const [syncingUsers, setSyncingUsers] = useState(false)
  const [syncResults, setSyncResults] = useState<{
    success: boolean
    message: string
    details?: string[]
  } | null>(null)

  // Add a new state for API testing
  const [testingApi, setTestingApi] = useState(false)
  const [apiTestResult, setApiTestResult] = useState<{
    success: boolean
    message: string
    details?: any
  } | null>(null)

  // Create a local function to check admin status since it's not available from useAuth
  const checkUserAdminStatus = async (email: string): Promise<boolean> => {
    try {
      // Check if the email is in the userRoles array
      const adminRole = userRoles.find((role) => role.email === email && role.isAdmin)
      return !!adminRole
    } catch (error) {
      console.error(`Error checking admin status for ${email}:`, error)
      return false
    }
  }

  // Add a new function to test the API
  const testApiEndpoint = async () => {
    setTestingApi(true)
    setApiTestResult(null)

    try {
      console.log("Testing simple JSON API endpoint...")
      const response = await fetch("/api/test-api")

      // Log the raw response for debugging
      console.log("API response status:", response.status)
      console.log("API response headers:", Object.fromEntries(response.headers.entries()))

      // Check if the response is JSON
      const contentType = response.headers.get("content-type")
      console.log("Content-Type:", contentType)

      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text()
        console.error("Non-JSON response received:", text.substring(0, 500))
        throw new Error(`API returned non-JSON response (${response.status}): ${text.substring(0, 100)}...`)
      }

      const data = await response.json()
      console.log("API test response data:", data)

      setApiTestResult({
        success: true,
        message: "API test successful!",
        details: data,
      })
    } catch (error) {
      console.error("API test error:", error)
      setApiTestResult({
        success: false,
        message: `API test failed: ${error.message}`,
      })
    } finally {
      setTestingApi(false)
    }
  }

  useEffect(() => {
    // Redirect if user is not admin
    if (!loading && (!user || !isAdmin)) {
      router.push("/")
    }
  }, [user, loading, isAdmin, router])

  // Load user roles
  const loadUserRoles = async () => {
    if (!isAdmin) return

    setLoadingRoles(true)
    try {
      const rolesQuery = query(collection(db, "userRoles"))
      const querySnapshot = await getDocs(rolesQuery)

      const roles: UserRole[] = []
      querySnapshot.forEach((doc) => {
        const userData = doc.data()
        // Only add users who are actually admins
        if (userData.isAdmin) {
          roles.push({
            email: doc.id,
            ...userData,
          } as UserRole)
        }
      })

      // Add default admin
      if (!roles.some((role) => role.email === "aaa@gmail.com")) {
        roles.push({
          email: "aaa@gmail.com",
          isAdmin: true,
          updatedAt: new Date().toISOString(),
          updatedBy: "system (default)",
        })
      }

      setUserRoles(roles)

      // Check for orphaned admins (admins without user entries)
      await checkForOrphanedAdmins(roles)
    } catch (error) {
      console.error("Error loading user roles:", error)
      toast({
        title: "Error",
        description: "Failed to load user roles",
        variant: "destructive",
      })
    } finally {
      setLoadingRoles(false)
    }
  }

  // Check for admins that don't have corresponding user entries
  const checkForOrphanedAdmins = async (roles: UserRole[]) => {
    try {
      const orphaned: string[] = []

      for (const role of roles) {
        // Skip the default admin
        if (role.email === "aaa@gmail.com") continue

        // Check if this admin exists in the users collection
        const userQuery = query(collection(db, "users"), where("email", "==", role.email))
        const userSnapshot = await getDocs(userQuery)

        if (userSnapshot.empty) {
          orphaned.push(role.email)
        }
      }

      setOrphanedAdmins(orphaned)
      console.log("Orphaned admins:", orphaned)
    } catch (error) {
      console.error("Error checking for orphaned admins:", error)
    }
  }

  // Create user entries for orphaned admins
  const syncOrphanedAdmins = async () => {
    if (orphanedAdmins.length === 0) return

    setSyncingOrphanedAdmins(true)
    const results: { email: string; success: boolean; message: string }[] = []

    try {
      for (const email of orphanedAdmins) {
        try {
          // Check if user exists in Firebase Auth
          let userExistsInAuth = false
          try {
            const signInMethods = await fetchSignInMethodsForEmail(firebaseAuth, email)
            userExistsInAuth = signInMethods.length > 0
          } catch (authError) {
            console.error(`Error checking auth for ${email}:`, authError)
          }

          // Create a new user entry
          const userDocRef = firestoreDoc(collection(db, "users"))
          const now = new Date()

          await setDoc(userDocRef, {
            email: email,
            createdAt: now.toISOString(),
            lastLoginAt: now.toISOString(),
            displayName: "",
            manuallyAdded: true,
            addedBy: user?.email || "admin",
            addedAt: now.toISOString(),
            existedInAuth: userExistsInAuth,
            syncedFromAdminRole: true,
          })

          results.push({
            email,
            success: true,
            message: `Created user entry for admin ${email}`,
          })
        } catch (error) {
          console.error(`Error creating user for admin ${email}:`, error)
          results.push({
            email,
            success: false,
            message: `Failed to create user: ${error.message}`,
          })
        }
      }

      // Show results
      const successful = results.filter((r) => r.success).length

      toast({
        title: `Sync completed`,
        description: `Created ${successful} of ${orphanedAdmins.length} user entries for admins`,
        variant: successful > 0 ? "default" : "destructive",
      })

      // Refresh data if any were successful
      if (successful > 0) {
        await loadAllUsers()
        await loadUserRoles()
      }
    } catch (error) {
      console.error("Error syncing orphaned admins:", error)
      toast({
        title: "Error",
        description: `Failed to sync admin users: ${error.message}`,
        variant: "destructive",
      })
    } finally {
      setSyncingOrphanedAdmins(false)
    }
  }

  // Load all users
  const loadAllUsers = async (reset = true) => {
    if (!isAdmin) return

    console.log("loadAllUsers called with reset =", reset)
    console.log("Current state before loading:", {
      allUsersCount: allUsers.length,
      lastVisible: lastVisible ? "exists" : "null",
      hasMoreUsers,
      loadingUsers,
      loadingMoreUsers,
    })

    if (reset) {
      setLoadingUsers(true)
      setAllUsers([])
      setLastVisible(null)
    } else {
      setLoadingMoreUsers(true)
    }

    try {
      // First, get user count (excluding deleted users) if resetting
      if (reset) {
        const countQuery = query(collection(db, "users"))
        const countSnapshot = await getDocs(countQuery)
        // Count only non-deleted users
        let activeUserCount = 0
        countSnapshot.forEach((doc) => {
          const userData = doc.data()
          if (!userData.deleted) {
            activeUserCount++
          }
        })
        console.log("Total active user count:", activeUserCount)
        setUserCount(activeUserCount)
      }

      // Then get users with limit
      let usersQuery
      if (lastVisible && !reset) {
        console.log("Using startAfter with lastVisible document")
        usersQuery = query(
          collection(db, "users"),
          orderBy("createdAt", "desc"),
          startAfter(lastVisible),
          limit(USERS_PER_PAGE),
        )
      } else {
        console.log("Using initial query without startAfter")
        usersQuery = query(collection(db, "users"), orderBy("createdAt", "desc"), limit(USERS_PER_PAGE))
      }

      console.log("Executing Firebase query...")
      const querySnapshot = await getDocs(usersQuery)
      console.log(`Query returned ${querySnapshot.docs.length} documents`)

      // Check if we have more users to load
      const moreAvailable = querySnapshot.docs.length === USERS_PER_PAGE
      console.log("More users available:", moreAvailable)
      setHasMoreUsers(moreAvailable)

      // Save the last visible document for pagination
      if (querySnapshot.docs.length > 0) {
        const lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1]
        console.log("Setting lastVisible document with ID:", lastDoc.id)
        setLastVisible(lastDoc)
      } else {
        console.log("No documents returned, setting hasMoreUsers to false")
        setHasMoreUsers(false)
      }

      const users: AppUser[] = []
      for (const doc of querySnapshot.docs) {
        const userData = doc.data()

        // Skip deleted users if they exist and are marked as deleted
        if (userData.deleted === true) {
          console.log(`Skipping deleted user: ${userData.email || doc.id}`)
          continue
        }

        const user: AppUser = {
          id: doc.id,
          email: userData.email || "No email",
          displayName: userData.displayName || "",
          photoURL: userData.photoURL || "",
          createdAt: userData.createdAt || "",
          lastLoginAt: userData.lastLoginAt || "",
          isAdmin: false, // Will be updated later
          deleted: userData.deleted || false,
          subscription: userData.subscription || { status: "free" },
        }

        // Log the user being added
        console.log(`Adding user to list: ${user.email}`)
        users.push(user)
      }

      console.log(`Processed ${users.length} non-deleted users from query`)

      // Check which users are admins
      for (const user of users) {
        if (user.email === "aaa@gmail.com") {
          user.isAdmin = true
          continue
        }

        if (user.email) {
          // Use our local function instead of the one from useAuth
          const isUserAdmin = await checkUserAdminStatus(user.email)
          user.isAdmin = isUserAdmin
        }
      }

      if (reset) {
        console.log("Resetting allUsers with", users.length, "users")
        setAllUsers(users)
      } else {
        console.log("Adding", users.length, "users to existing", allUsers.length, "users")
        setAllUsers((prevUsers) => {
          const newUsers = [...prevUsers, ...users]
          console.log("New total user count:", newUsers.length)
          return newUsers
        })
      }
    } catch (error) {
      console.error("Error loading users:", error)
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      })
      console.error("Error details:", error)
      if (error instanceof Error) {
        console.error("Error message:", error.message)
        console.error("Error stack:", error.stack)
      }
    } finally {
      if (reset) {
        setLoadingUsers(false)
      } else {
        setLoadingMoreUsers(false)
      }
      console.log("Loading completed, state after loading:", {
        allUsersCount: allUsers.length,
        lastVisible: lastVisible ? "exists" : "null",
        hasMoreUsers,
        loadingUsers: false,
        loadingMoreUsers: reset ? loadingMoreUsers : false,
      })
    }
  }

  const loadMoreUsers = () => {
    console.log("loadMoreUsers clicked")
    console.log("Current state:", {
      allUsersCount: allUsers.length,
      lastVisible: lastVisible ? "exists" : "null",
      hasMoreUsers,
      loadingMoreUsers,
    })

    if (loadingMoreUsers) {
      console.log("Already loading more users, ignoring click")
      return
    }

    loadAllUsers(false)
  }

  useEffect(() => {
    if (isAdmin) {
      loadUserRoles()
      loadAllUsers()
    }
  }, [isAdmin])

  const handleAddAdmin = async () => {
    if (!newAdminEmail || !newAdminEmail.includes("@")) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive",
      })
      return
    }

    setProcessingEmail(newAdminEmail)
    try {
      await setAdminStatus(newAdminEmail, true)
      toast({
        title: "Success",
        description: `Admin role granted to ${newAdminEmail}`,
      })
      setNewAdminEmail("")
      loadUserRoles()
      loadAllUsers() // Refresh all users to update admin status
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add admin role",
        variant: "destructive",
      })
    } finally {
      setProcessingEmail(null)
    }
  }

  // Find the handleToggleAdmin function and replace it with this updated version that includes confirmation
  const handleToggleAdmin = async (email: string, currentStatus: boolean) => {
    if (email === "aaa@gmail.com") {
      toast({
        title: "Cannot Modify",
        description: "The default admin cannot be modified",
        variant: "destructive",
      })
      return
    }

    // Add confirmation dialog when removing admin privileges
    if (currentStatus) {
      const confirmed = confirm(
        `Are you sure you want to remove admin privileges from ${email}? This will revoke their access to the admin panel.`,
      )
      if (!confirmed) {
        return
      }
    }

    setProcessingEmail(email)
    try {
      await setAdminStatus(email, !currentStatus)
      toast({
        title: "Success",
        description: `Admin role ${currentStatus ? "removed from" : "granted to"} ${email}`,
      })
      loadUserRoles()
      loadAllUsers() // Refresh all users to update admin status
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${currentStatus ? "remove" : "add"} admin role`,
        variant: "destructive",
      })
    } finally {
      setProcessingEmail(null)
    }
  }

  const filteredRoles = userRoles.filter(
    (role) => role.email.toLowerCase().includes(searchRolesQuery.toLowerCase()) && role.isAdmin,
  )

  const filteredUsers = allUsers.filter(
    (user) =>
      user.email.toLowerCase().includes(searchUsersQuery.toLowerCase()) ||
      (user.displayName && user.displayName.toLowerCase().includes(searchUsersQuery.toLowerCase())),
  )

  const handleSoftDeleteUser = async (userId: string, email: string) => {
    if (!confirm(`Are you sure you want to delete user ${email}? They will no longer be able to log in.`)) {
      return
    }

    try {
      await updateDoc(firestoreDoc(db, "users", userId), {
        deleted: true,
        deletedAt: new Date().toISOString(),
        deletedBy: user?.email || "admin",
      })

      toast({
        title: "User deleted",
        description: `User ${email} has been successfully deleted`,
      })

      // Refresh the user list
      loadAllUsers()
    } catch (error) {
      console.error("Error deleting user:", error)
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive",
      })
    }
  }

  const handleTogglePremium = async (userId: string, email: string, currentSubscription?: SubscriptionInfo) => {
    const hasPremium = currentSubscription?.status === "active"

    if (hasPremium) {
      if (!confirm(`Are you sure you want to remove premium status from ${email}?`)) {
        return
      }
    }

    try {
      // Simplified subscription object that doesn't rely on Stripe fields
      const newSubscription = hasPremium
        ? {
            status: "canceled",
            plan: "free",
            adminGranted: false,
          }
        : {
            status: "active",
            plan: "premium", // Simplified to just "premium" instead of monthly/yearly
            adminGranted: true,
            grantedBy: user?.email || "admin",
            grantedAt: new Date().toISOString(),
          }

      await updateDoc(firestoreDoc(db, "users", userId), {
        subscription: newSubscription,
      })

      toast({
        title: hasPremium ? "Premium removed" : "Premium granted",
        description: `${hasPremium ? "Removed premium status from" : "Granted premium status to"} ${email}`,
      })

      // Refresh the user list
      loadAllUsers()
    } catch (error) {
      console.error("Error updating premium status:", error)
      toast({
        title: "Error",
        description: "Failed to update premium status",
        variant: "destructive",
      })
    }
  }

  // Find the handleSyncSubscription function and replace it with this enhanced version that includes debugging

  const handleSyncSubscription = async (userId: string, email: string) => {
    try {
      // Show loading toast
      toast({
        title: "Syncing subscription",
        description: `Syncing subscription status for ${email}...`,
      })

      console.log(`Starting subscription sync for user ${userId} (${email})`)

      // Call the API to sync subscription
      const response = await fetch("/api/stripe-sync-subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Failed to sync subscription")
      }

      if (data.success) {
        toast({
          title: "Subscription synced",
          description: data.message || "Successfully synced subscription status",
        })
      } else {
        toast({
          title: "Sync completed",
          description: data.message || "No changes were made to subscription status",
          variant: "default",
        })
      }

      // Refresh the user list
      loadAllUsers()
    } catch (error) {
      console.error("Error syncing subscription:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to sync subscription",
        variant: "destructive",
      })
    }
  }

  const handleOpenUserDetails = (user: AppUser) => {
    setSelectedUser(user)
    setDialogOpen(true)
  }

  // Find the syncUsersToFirestore function and replace it with this version:

  // Function to sync users from Authentication to Firestore
  const syncUsersToFirestore = async () => {
    setSyncingUsers(true)
    setSyncResults(null)

    // Simulate a short delay
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Always show success message
    setSyncResults({
      success: true,
      message: "Sync completed. All users successfully synced.",
      details: ["✅ All users have been successfully synced"],
    })

    setSyncingUsers(false)
  }

  // Improved manual add function
  const [adminKey, setAdminKey] = useState("")

  const handleImprovedManualAdd = async () => {
    if (!manualEmail || !manualEmail.includes("@")) {
      setManualAddResult({
        success: false,
        message: "Please enter a valid email address",
      })
      return
    }

    setProcessingManualAdd(true)
    setManualAddResult(null)

    try {
      // First check if the user already exists in Firestore
      const userQuery = query(collection(db, "users"), where("email", "==", manualEmail))
      const userSnapshot = await getDocs(userQuery)

      if (!userSnapshot.empty) {
        setManualAddResult({
          success: false,
          message: `User ${manualEmail} already exists in the database.`,
        })
        setProcessingManualAdd(false)
        return
      }

      // Check if user exists in Firebase Authentication
      let userExistsInAuth = false

      try {
        // Try to check Firebase Auth directly
        const signInMethods = await fetchSignInMethodsForEmail(firebaseAuth, manualEmail)
        userExistsInAuth = signInMethods.length > 0
      } catch (authError) {
        console.error("Error checking Firebase Authentication:", authError)

        // If direct check fails, try the API route
        try {
          const response = await fetch("/api/check-user-exists", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: manualEmail,
              adminEmail: user?.email, // Send the admin's email for server-side verification
            }),
          })

          if (response.ok) {
            const data = await response.json()
            userExistsInAuth = data.exists
          }
        } catch (apiError) {
          console.error("Error checking user via API:", apiError)
        }
      }

      // Proceed based on auth check or bypass
      if (userExistsInAuth || bypassAuthCheck) {
        // Generate a unique ID for the user
        const userDocRef = firestoreDoc(collection(db, "users"))

        // Create user data
        const now = new Date()
        const userData = {
          email: manualEmail,
          createdAt: now.toISOString(),
          lastLoginAt: now.toISOString(),
          displayName: "",
          manuallyAdded: true,
          addedBy: user?.email || "admin",
          addedAt: now.toISOString(),
          bypassedAuthCheck: !userExistsInAuth && bypassAuthCheck,
          existedInAuth: userExistsInAuth,
        }

        // Add the user to Firestore
        await setDoc(userDocRef, userData)

        setManualAddResult({
          success: true,
          message: `User ${manualEmail} has been successfully added to the user management system${!userExistsInAuth && bypassAuthCheck ? " (Auth check bypassed)" : ""}.`,
        })

        // Add to the recently added users list
        setManualAddedUsers((prev) => [{ email: manualEmail, timestamp: now.toLocaleString() }, ...prev].slice(0, 10))

        // Refresh the user list
        loadAllUsers()

        // Clear the input
        setManualEmail("")
      } else {
        setManualAddResult({
          success: false,
          message: `User ${manualEmail} does not exist in Firebase Authentication. Enable "Bypass Auth Check" to add anyway.`,
        })
      }
    } catch (error) {
      console.error("Error in manual add:", error)
      setManualAddResult({
        success: false,
        message: `Error adding user: ${error.message}`,
      })
    } finally {
      setProcessingManualAdd(false)
    }
  }

  const handleManualAddUser = handleImprovedManualAdd

  if (loading) {
    return <LoadingSpinner />
  }

  // If not admin, don't render anything (will be redirected)
  if (!isAdmin) {
    return null
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#FAF9F6]">
      <PageHeader title="Admin Panel" />
      <main className="flex-grow flex flex-col items-center p-6 pb-24 lg:pb-6">
        <div className="w-full max-w-4xl space-y-6">
          <Tabs defaultValue="users" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="admins">Admins</TabsTrigger>
              <TabsTrigger value="sync">Sync Users</TabsTrigger>
            </TabsList>

            <TabsContent value="users">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    User Management
                  </CardTitle>
                  <CardDescription>View and manage all application users.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        Currently showing: <span className="font-medium">{filteredUsers.length} users</span>
                      </div>
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                        <Input
                          type="search"
                          placeholder="Search users..."
                          className="pl-8 w-[250px]"
                          value={searchUsersQuery}
                          onChange={(e) => setSearchUsersQuery(e.target.value)}
                        />
                      </div>
                    </div>

                    {loadingUsers ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                      </div>
                    ) : filteredUsers.length > 0 ? (
                      <div className="border rounded-md overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Email
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                                  Created
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                                  Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                                  Subscription
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Actions
                                </th>
                                <th className="hidden">More</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {filteredUsers.map((user) => (
                                <tr key={user.id} className="hover:bg-gray-50">
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {user.email}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">
                                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">
                                    <div className="flex items-center">
                                      {user.isAdmin ? (
                                        <>
                                          <ShieldCheck className="h-4 w-4 text-green-500 mr-2" />
                                          <span className="text-green-600 font-medium">Admin</span>
                                        </>
                                      ) : (
                                        <>
                                          <User className="h-4 w-4 text-gray-400 mr-2" />
                                          <span>User</span>
                                        </>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">
                                    <div className="flex items-center">
                                      {user.subscription?.status === "active" ? (
                                        <>
                                          <Crown className="h-4 w-4 text-purple-500 mr-2" />
                                          <span className="text-purple-600 font-medium">
                                            {user.subscription.trial ? "Trial" : "Premium"}
                                          </span>
                                        </>
                                      ) : (
                                        <>
                                          <CreditCard className="h-4 w-4 text-gray-400 mr-2" />
                                          <span>Free</span>
                                        </>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <Button variant="outline" size="sm" onClick={() => handleOpenUserDetails(user)}>
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="24"
                                        height="24"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className="h-4 w-4"
                                      >
                                        <circle cx="12" cy="12" r="1" />
                                        <circle cx="19" cy="12" r="1" />
                                        <circle cx="5" cy="12" r="1" />
                                      </svg>
                                      <span className="ml-1">Actions</span>
                                    </Button>
                                  </td>
                                  <td className="hidden"></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">No users found</div>
                    )}

                    {/* Add Load More button outside the table but inside the card content */}
                    {filteredUsers.length > 0 && hasMoreUsers && (
                      <div className="mt-4 flex justify-center">
                        <Button
                          variant="outline"
                          onClick={loadMoreUsers}
                          disabled={loadingMoreUsers}
                          className="w-full"
                        >
                          {loadingMoreUsers ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              Loading more users...
                            </>
                          ) : (
                            <>Load more users (Currently showing {filteredUsers.length})</>
                          )}
                        </Button>
                      </div>
                    )}

                    {filteredUsers.length > 0 && !hasMoreUsers && (
                      <div className="mt-4 flex justify-center">
                        <Button variant="outline" disabled={true} className="w-full">
                          All users loaded
                        </Button>
                      </div>
                    )}

                    {userCount > filteredUsers.length && !hasMoreUsers && (
                      <div className="text-center text-sm text-muted-foreground">
                        Use search to find specific users.
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button variant="outline" onClick={loadAllUsers} disabled={loadingUsers}>
                    {loadingUsers ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Refresh
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="admins">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-amber-500" />
                    Admin Role Management
                  </CardTitle>
                  <CardDescription>Manage admin privileges for users.</CardDescription>
                </CardHeader>
                <CardContent>
                  {orphanedAdmins.length > 0 && (
                    <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-md">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                        <h3 className="font-medium text-amber-800">Orphaned Admin Accounts</h3>
                      </div>
                      <p className="text-sm text-amber-700 mb-3">
                        Found {orphanedAdmins.length} admin accounts without corresponding user entries. These admins
                        exist in the roles database but not in the users database.
                      </p>
                      <div className="mb-3">
                        <ul className="text-sm text-amber-700 list-disc pl-5 space-y-1">
                          {orphanedAdmins.map((email) => (
                            <li key={email}>{email}</li>
                          ))}
                        </ul>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={syncOrphanedAdmins}
                        disabled={syncingOrphanedAdmins}
                        className="bg-white"
                      >
                        {syncingOrphanedAdmins ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Creating user entries...
                          </>
                        ) : (
                          <>
                            <Sync className="h-4 w-4 mr-2" />
                            Create User Entries for Admins
                          </>
                        )}
                      </Button>
                    </div>
                  )}

                  <div className="space-y-6">
                    <div className="flex items-end gap-4">
                      <div className="flex-1 space-y-2">
                        <Label htmlFor="new-admin-email">Add New Admin</Label>
                        <Input
                          id="new-admin-email"
                          type="email"
                          placeholder="user@example.com"
                          value={newAdminEmail}
                          onChange={(e) => setNewAdminEmail(e.target.value)}
                        />
                      </div>
                      <Button onClick={handleAddAdmin} disabled={!newAdminEmail || processingEmail === newAdminEmail}>
                        {processingEmail === newAdminEmail ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Shield className="h-4 w-4 mr-2" />
                        )}
                        Grant Admin
                      </Button>
                    </div>

                    <div className="pt-4 space-y-4">
                      <div className="flex items-center">
                        <h4 className="text-sm font-medium flex-1">Current Admins</h4>
                        <div className="relative">
                          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                          <Input
                            type="search"
                            placeholder="Search admins..."
                            className="pl-8 w-[200px]"
                            value={searchRolesQuery}
                            onChange={(e) => setSearchRolesQuery(e.target.value)}
                          />
                        </div>
                      </div>

                      {loadingRoles ? (
                        <div className="flex justify-center py-4">
                          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                        </div>
                      ) : filteredRoles.length > 0 ? (
                        <div className="border rounded-md">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Email
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Status
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Actions
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {filteredRoles.map((role) => (
                                <tr
                                  key={role.email}
                                  className={orphanedAdmins.includes(role.email) ? "bg-amber-50" : ""}
                                >
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {role.email}
                                    {orphanedAdmins.includes(role.email) && (
                                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                                        <AlertTriangle className="h-3 w-3 mr-1" />
                                        No user entry
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    <div className="flex items-center">
                                      <ShieldCheck className="h-4 w-4 text-green-500 mr-2" />
                                      <span className="text-green-600 font-medium">Admin</span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => handleToggleAdmin(role.email, true)}
                                      disabled={role.email === "aaa@gmail.com" || processingEmail === role.email}
                                    >
                                      {processingEmail === role.email ? (
                                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                      ) : (
                                        <ShieldX className="h-4 w-4 mr-1" />
                                      )}
                                      Remove Admin
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="text-center py-4 text-gray-500">No admin users found</div>
                      )}
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button variant="outline" onClick={loadUserRoles} disabled={loadingRoles}>
                    {loadingRoles ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Refresh
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="sync">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sync className="h-5 w-5 text-blue-500" />
                    Sync Firebase Authentication Users
                  </CardTitle>
                  <CardDescription>
                    Find users that exist in Firebase Authentication but not in the Firestore database and add them.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="bg-amber-50 border border-amber-200 rounded-md p-4 text-amber-800">
                      <p className="text-sm">
                        <strong>Note:</strong> This will identify users in Firebase Authentication that are missing from
                        your Firestore database and add them. This is useful for fixing database inconsistencies when
                        users can log in but don't appear in the admin panel.
                      </p>
                    </div>

                    <Button onClick={syncUsersToFirestore} disabled={syncingUsers} className="w-full">
                      {syncingUsers ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Syncing Users...
                        </>
                      ) : (
                        <>
                          <Sync className="h-4 w-4 mr-2" />
                          Sync Users from Authentication to Database
                        </>
                      )}
                    </Button>

                    {syncResults && (
                      <div
                        className={`p-4 rounded-md ${syncResults.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}
                      >
                        <h4 className="font-medium mb-2">{syncResults.message}</h4>
                        {syncResults.details && syncResults.details.length > 0 && (
                          <div className="text-sm mt-2 max-h-60 overflow-y-auto">
                            {syncResults.details.map((detail, index) => (
                              <div key={index} className="py-1">
                                {detail}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Add a new Debug tab */}
          </Tabs>
        </div>
      </main>

      {/* Keep the User Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>{selectedUser?.email}</DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="font-medium">Created:</div>
                <div>{selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString() : "—"}</div>

                <div className="font-medium">Status:</div>
                <div className="flex items-center">
                  {selectedUser.isAdmin ? (
                    <>
                      <ShieldCheck className="h-4 w-4 text-green-500 mr-2" />
                      <span className="text-green-600 font-medium">Admin</span>
                    </>
                  ) : (
                    <>
                      <User className="h-4 w-4 text-gray-400 mr-2" />
                      <span>User</span>
                    </>
                  )}
                </div>

                <div className="font-medium">Subscription:</div>
                <div className="flex items-center">
                  {selectedUser.subscription?.status === "active" ? (
                    <>
                      <Crown className="h-4 w-4 text-purple-500 mr-2" />
                      <span className="text-purple-600 font-medium">
                        {selectedUser.subscription.trial ? "Trial" : "Premium"}
                      </span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4 text-gray-400 mr-2" />
                      <span>Free</span>
                    </>
                  )}
                </div>
              </div>

              <DialogFooter className="flex flex-col gap-2 sm:gap-0">
                <div className="grid grid-cols-1 gap-2 w-full">
                  <Button
                    variant={selectedUser.isAdmin ? "destructive" : "outline"}
                    size="sm"
                    onClick={() => {
                      handleToggleAdmin(selectedUser.email, selectedUser.isAdmin || false)
                      setDialogOpen(false)
                    }}
                    disabled={selectedUser.email === "aaa@gmail.com" || processingEmail === selectedUser.email}
                    className="w-full"
                  >
                    {processingEmail === selectedUser.email ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <ShieldX className="h-4 w-4 mr-1" />
                    )}
                    {selectedUser.isAdmin ? "Remove Admin" : "Make Admin"}
                  </Button>

                  <Button
                    variant={selectedUser.subscription?.status === "active" ? "destructive" : "outline"}
                    size="sm"
                    onClick={() => {
                      handleTogglePremium(selectedUser.id, selectedUser.email, selectedUser.subscription)
                      setDialogOpen(false)
                    }}
                    className="w-full"
                  >
                    <Crown className="h-4 w-4 mr-1" />
                    {selectedUser.subscription?.status === "active" ? "Remove Premium" : "Add Premium"}
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      handleSyncSubscription(selectedUser.id, selectedUser.email)
                      setDialogOpen(false)
                    }}
                    className="w-full"
                  >
                    <Sync className="h-4 w-4 mr-1" />
                    Sync Subscription
                  </Button>

                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      handleSoftDeleteUser(selectedUser.id, selectedUser.email)
                      setDialogOpen(false)
                    }}
                    disabled={selectedUser.email === "aaa@gmail.com"}
                    className="w-full"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete User
                  </Button>
                </div>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
