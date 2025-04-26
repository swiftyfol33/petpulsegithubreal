"use client"

import type React from "react"

import { useState, useEffect } from "react"
import {
  collection,
  query,
  orderBy,
  getDocs,
  addDoc,
  serverTimestamp,
  where,
  updateDoc,
  increment,
  deleteDoc,
  doc,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  MessagesSquare,
  Stethoscope,
  Brain,
  Utensils,
  Search,
  MessageCircle,
  Calendar,
  Filter,
  ThumbsUp,
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Skeleton } from "@/components/ui/skeleton"
// Add the import for PageHeader at the top with the other imports
import { PageHeader } from "@/components/page-header"

// Add this list of blocked words near the top of the file, after the imports
const BLOCKED_WORDS = [
  "retard",
  "retarded",
  "spaz",
  "cheap-meds",
  "counterfeit",
  "discount-vaccinations",
  "fake-certificate",
  "free-pills",
  "knock-off",
  "mail-order-prescription",
  "no-prescription",
  "no-rx",
  "offshore-pharmacy",
  "pill-alternative",
  "viagra",
  "flamewar",
  "newbie",
  "noob",
  "reported",
  "spam",
  "troll",
  "idiot",
  "moron",
  "dumbass",
  "fag",
  "faggot",
  "homo",
  "queer",
  "nigger",
  "nigga",
  "spic",
  "chink",
  "kike",
  "gook",
  "wetback",
  "beaner",
  "cracker",
  "honky",
  "zipperhead",
  "towelhead",
  "raghead",
  "tranny",
  "dyke",
  "faggit",
  "coon",
  "redskin",
  "midget",
  "whore",
  "slut",
  "skank",
  "hooker",
  "cunt",
  "bitch",
  "fucker",
  "fucking",
  "fuck",
  "ass",
  "asshole",
  "motherfucker",
  "dickhead",
  "bastard",
  "jackass",
  "shithead",
  "bullshit",
  "horseshit",
  "dipshit",
  "douchebag",
  "prick",
  "dickwad",
  "fuckwad",
  "fuckface",
  "dickface",
  "assface",
  "asswipe",
  "fuckwit",
  "shitstain",
  "cumstain",
  "jizz",
  "piss",
  "prick",
  "penis",
  "dick",
  "dickhead",
  "cocksucking",
  "cocksucker",
  "blowjob",
  "rimjob",
  "handjob",
  "wanker",
  "jerkoff",
  "jackoff",
  "cum",
  "cumshot",
  "facial",
  "buttfuck",
  "assfuck",
  "anal",
  "rimming",
  "snowballing",
  "felching",
  "fisting",
  "deepthroat",
  "creampie",
  "golden-shower",
  "cleveland-steamer",
  "rusty-trombone",
  "dirty-sanchez",
  "hot-carl",
  "make-money-fast",
  "get-rich-quick",
  "work-from-home",
  "earn-money-online",
  "guaranteed-results",
  "lose-weight-fast",
  "weight-loss-pill",
  "enlargement",
  "enhancement",
  "cialis",
  "levitra",
  "propecia",
  "clickbait",
  "click-here",
  "free-money",
]

// Define post categories
const POST_CATEGORIES = [
  { id: "all", label: "All Topics", icon: <MessagesSquare className="h-4 w-4 mr-2" />, color: "bg-gray-100" },
  { id: "health", label: "Pet Health", icon: <Stethoscope className="h-4 w-4 mr-2" />, color: "bg-blue-100" },
  { id: "behavior", label: "Behavior", icon: <Brain className="h-4 w-4 mr-2" />, color: "bg-purple-100" },
  { id: "nutrition", label: "Nutrition", icon: <Utensils className="h-4 w-4 mr-2" />, color: "bg-green-100" },
]

// Add a function to get category details by ID
const getCategoryById = (categoryId) => {
  return POST_CATEGORIES.find((cat) => cat.id === categoryId) || POST_CATEGORIES[0]
}

// Add this function after the BLOCKED_WORDS list
const containsBlockedWords = (text: string): { contains: boolean; word: string } => {
  if (!text) return { contains: false, word: "" }

  const lowerText = text.toLowerCase()

  for (const word of BLOCKED_WORDS) {
    if (lowerText.includes(word)) {
      return { contains: true, word }
    }
  }

  return { contains: false, word: "" }
}

export default function ForumPage() {
  const { user, loading } = useAuth()
  const [posts, setPosts] = useState([])
  const [filteredPosts, setFilteredPosts] = useState([])
  const [newPost, setNewPost] = useState({ title: "", content: "" })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loadingPosts, setLoadingPosts] = useState(true)
  const [userLikes, setUserLikes] = useState<Record<string, boolean>>({})
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({})
  const [comments, setComments] = useState<Record<string, any[]>>({})
  const [newComments, setNewComments] = useState<Record<string, string>>({})
  const [userRole, setUserRole] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const { toast } = useToast()

  const [newPostTitle, setNewPostTitle] = useState("")
  const [newPostContent, setNewPostContent] = useState("")
  const [newPostCategory, setNewPostCategory] = useState("all")
  const [isLoading, setIsLoading] = useState(false)

  const fetchPosts = async () => {
    try {
      const postsQuery = query(collection(db, "forumPosts"), orderBy("createdAt", "desc"))
      const snapshot = await getDocs(postsQuery)
      const postsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      setPosts(postsData)
      setFilteredPosts(postsData)
    } catch (error) {
      console.error("Error fetching posts:", error)
    } finally {
      setLoadingPosts(false)
    }
  }

  // Add a function to filter posts based on category and search query
  const filterPosts = () => {
    let filtered = [...posts]

    // Filter by category if not "all"
    if (activeCategory !== "all") {
      filtered = filtered.filter((post) => post.category === activeCategory)
    }

    // Filter by search query if not empty
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (post) =>
          post.title?.toLowerCase().includes(query) ||
          post.content?.toLowerCase().includes(query) ||
          post.authorName?.toLowerCase().includes(query),
      )
    }

    setFilteredPosts(filtered)
  }

  // Update useEffect to call filterPosts when dependencies change
  useEffect(() => {
    filterPosts()
  }, [posts, activeCategory, searchQuery])

  useEffect(() => {
    fetchPosts()
  }, [])

  useEffect(() => {
    const fetchUserRole = async () => {
      if (user) {
        try {
          const userDoc = await getDocs(query(collection(db, "users"), where("uid", "==", user.uid)))
          if (!userDoc.empty) {
            const userData = userDoc.docs[0].data()
            // Handle different possible role values
            const role = userData.role || "pet_owner"
            // Normalize role value
            if (role === "vet" || role === "veterinarian") {
              setUserRole("vet")
            } else {
              setUserRole("pet_owner")
            }
          }
        } catch (error) {
          console.error("Error fetching user role:", error)
          setUserRole("pet_owner") // Default to pet_owner on error
        }
      }
    }

    fetchUserRole()
  }, [user])

  const handleLike = async (postId: string) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to like posts.",
        variant: "destructive",
      })
      return
    }

    try {
      const isLiked = userLikes[postId]

      if (isLiked) {
        // Unlike the post
        const likeQuery = query(
          collection(db, "userLikes"),
          where("userId", "==", user.uid),
          where("postId", "==", postId),
        )

        const likeSnapshot = await getDocs(likeQuery)

        if (!likeSnapshot.empty) {
          await deleteDoc(doc(db, "userLikes", likeSnapshot.docs[0].id))
        }

        // Update post likes count
        const postRef = doc(db, "forumPosts", postId)
        await updateDoc(postRef, {
          likes: increment(-1),
        })

        // Update local state
        setUserLikes((prev) => {
          const updated = { ...prev }
          delete updated[postId]
          return updated
        })

        setPosts((prev) => prev.map((post) => (post.id === postId ? { ...post, likes: (post.likes || 1) - 1 } : post)))
      } else {
        // Like the post
        await addDoc(collection(db, "userLikes"), {
          userId: user.uid,
          postId: postId,
          createdAt: serverTimestamp(),
        })

        // Update post likes count
        const postRef = doc(db, "forumPosts", postId)
        await updateDoc(postRef, {
          likes: increment(1),
        })

        // Update local state
        setUserLikes((prev) => ({
          ...prev,
          [postId]: true,
        }))

        setPosts((prev) => prev.map((post) => (post.id === postId ? { ...post, likes: (post.likes || 0) + 1 } : post)))
      }
    } catch (error) {
      console.error("Error handling like:", error)
      toast({
        title: "Error",
        description: "Failed to process your like. Please try again.",
        variant: "destructive",
      })
    }
  }

  const toggleComments = (postId: string) => {
    setExpandedComments((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }))
  }

  // Update the handleAddComment function to check for blocked words
  const handleAddComment = async (postId: string) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to comment.",
        variant: "destructive",
      })
      return
    }

    const commentText = newComments[postId]

    if (!commentText || !commentText.trim()) {
      toast({
        title: "Error",
        description: "Comment cannot be empty.",
        variant: "destructive",
      })
      return
    }

    // Check for blocked words in comment
    const commentCheck = containsBlockedWords(commentText)

    if (commentCheck.contains) {
      // Show a more prominent alert for blocked content
      alert(
        "Your comment contains inappropriate language and cannot be posted. Please remove any offensive terms and try again.",
      )

      toast({
        title: "Content Moderation Alert",
        description: `Your comment contains inappropriate language and cannot be published. Please revise your content.`,
        variant: "destructive",
      })
      return
    }

    try {
      // Add comment to Firestore
      const commentData = {
        postId,
        content: commentText.trim(),
        authorId: user.uid,
        authorName: user.displayName || user.email?.split("@")[0] || "User",
        authorPhotoURL: user.photoURL || "",
        authorRole: userRole || "pet_owner", // Use normalized role
        createdAt: serverTimestamp(),
      }

      const docRef = await addDoc(collection(db, "postComments"), commentData)

      // Update post comments count
      const postRef = doc(db, "forumPosts", postId)
      await updateDoc(postRef, {
        comments: increment(1),
      })

      // Update local state
      const newComment = {
        id: docRef.id,
        ...commentData,
        createdAt: new Date(), // Use current date for immediate display
      }

      setComments((prev) => ({
        ...prev,
        [postId]: [...(prev[postId] || []), newComment],
      }))

      setPosts((prev) =>
        prev.map((post) => (post.id === postId ? { ...post, comments: (post.comments || 0) + 1 } : post)),
      )

      // Clear comment input
      setNewComments((prev) => ({
        ...prev,
        [postId]: "",
      }))

      toast({
        title: "Success",
        description: "Your comment has been added.",
      })
    } catch (error) {
      console.error("Error adding comment:", error)
      toast({
        title: "Error",
        description: "Failed to add your comment. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Update the handleSubmitPost function to check for blocked words
  const handleSubmitPost = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to post.",
        variant: "destructive",
      })
      return
    }

    if (!newPostTitle.trim() || !newPostContent.trim()) {
      toast({
        title: "Error",
        description: "Please provide both a title and content for your post.",
        variant: "destructive",
      })
      return
    }

    // Check for blocked words in title and content
    const titleCheck = containsBlockedWords(newPostTitle)
    const contentCheck = containsBlockedWords(newPostContent)

    if (titleCheck.contains || contentCheck.contains) {
      // Show a more prominent alert for blocked content
      alert(
        "Your post contains inappropriate language and cannot be published. Please remove any offensive terms and try again.",
      )

      toast({
        title: "Content Moderation Alert",
        description: `Your post contains inappropriate language and cannot be published. Please revise your content.`,
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      await addDoc(collection(db, "forumPosts"), {
        title: newPostTitle,
        content: newPostContent,
        category: newPostCategory,
        authorId: user.uid,
        authorName: user.displayName || user.email?.split("@")[0] || "User",
        authorPhotoURL: user.photoURL || "",
        authorRole: userRole || "pet_owner", // Use normalized role
        createdAt: serverTimestamp(),
        likes: 0,
        comments: 0,
      })

      setNewPostTitle("")
      setNewPostContent("")
      setNewPostCategory("all")

      toast({
        title: "Success",
        description: "Your post has been published!",
      })

      // Refresh posts
      await fetchPosts()
    } catch (error) {
      console.error("Error creating post:", error)
      toast({
        title: "Error",
        description: "Failed to create post. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Add a function to handle category changes
  const handleCategoryChange = (category) => {
    setActiveCategory(category)
  }

  // Add a function to handle search input changes
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value)
  }

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <PageHeader
          title="Pet Health Community Forum"
          description="Connect with other pet owners and veterinarians to discuss pet health topics"
        />
        <div className="flex justify-center items-center h-64">
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4">
      <PageHeader
        title="Pet Health Community Forum"
        description="Connect with other pet owners and veterinarians to discuss pet health topics"
        actions={
          <Button onClick={() => document.querySelector('[data-value="create"]')?.click()} variant="default">
            Create Post
          </Button>
        }
      />

      <Tabs defaultValue="browse" className="mb-8">
        <TabsList className="mb-4">
          <TabsTrigger value="browse">Browse Posts</TabsTrigger>
          <TabsTrigger value="create">Create Post</TabsTrigger>
        </TabsList>

        <TabsContent value="browse">
          {/* Add search and filter section */}
          <div className="mb-6 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <Input
                placeholder="Search posts..."
                className="pl-10"
                value={searchQuery}
                onChange={handleSearchChange}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <div className="flex items-center mr-2">
                <Filter size={16} className="mr-1" />
                <span className="text-sm font-medium">Filter:</span>
              </div>
              {POST_CATEGORIES.map((category) => (
                <Badge
                  key={category.id}
                  variant={activeCategory === category.id ? "default" : "outline"}
                  className={`cursor-pointer flex items-center ${activeCategory === category.id ? "" : "hover:bg-gray-100"}`}
                  onClick={() => handleCategoryChange(category.id)}
                >
                  {category.icon}
                  {category.label}
                </Badge>
              ))}
            </div>
          </div>

          {loadingPosts ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="mb-4 overflow-hidden border-0 shadow-md">
                  <CardHeader className="bg-gray-50 pb-2">
                    <div className="flex items-center gap-3 mb-2">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div>
                        <Skeleton className="h-4 w-24 mb-1" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                    <Skeleton className="h-6 w-3/4 mb-1" />
                  </CardHeader>
                  <CardContent className="pt-4">
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-2/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredPosts.length > 0 ? (
            <div className="space-y-4">
              {filteredPosts.map((post) => {
                const category = getCategoryById(post.category)
                return (
                  <Card
                    key={post.id}
                    className="mb-4 overflow-hidden border-0 shadow-md hover:shadow-lg transition-shadow"
                  >
                    <CardHeader className={`${category.color} pb-2`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <Avatar className="border-2 border-white">
                            <AvatarImage
                              src={post.authorPhotoURL || "/placeholder.svg?height=40&width=40&query=user"}
                            />
                            <AvatarFallback>{post.authorName?.charAt(0) || "A"}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{post.authorName || "Anonymous"}</p>
                            <p className="text-xs text-muted-foreground">
                              {post.createdAt ? new Date(post.createdAt.toDate()).toLocaleString() : "Just now"}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className="flex items-center gap-1">
                          {category.icon}
                          {category.label}
                        </Badge>
                      </div>
                      <CardTitle className="text-xl">{post.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <p className="whitespace-pre-line text-gray-700">{post.content}</p>
                    </CardContent>
                    <CardFooter className="flex justify-between bg-gray-50 py-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1 text-gray-600 hover:text-blue-600"
                        onClick={() => handleLike(post.id)}
                      >
                        <ThumbsUp size={16} className={userLikes[post.id] ? "fill-blue-500 text-blue-500" : ""} />
                        <span>{post.likes || 0}</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1 text-gray-600 hover:text-purple-600"
                        onClick={() => toggleComments(post.id)}
                      >
                        <MessageCircle size={16} />
                        <span>{post.comments || 0}</span>
                      </Button>
                      <div className="text-xs text-gray-500 flex items-center">
                        <Calendar size={14} className="mr-1" />
                        {post.createdAt ? new Date(post.createdAt.toDate()).toLocaleDateString() : "Today"}
                      </div>
                    </CardFooter>
                  </Card>
                )
              })}
            </div>
          ) : (
            <div className="text-center p-8 border rounded-lg bg-gray-50">
              <p className="text-muted-foreground mb-4">
                {searchQuery ? "No posts match your search criteria." : "No posts yet. Be the first to share!"}
              </p>
              <Button variant="outline" onClick={() => document.querySelector('[data-value="create"]')?.click()}>
                Create a Post
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="create">
          {user ? (
            <Card className="border-0 shadow-md">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
                <CardTitle>Create a New Post</CardTitle>
                <CardDescription>Share your pet health questions or tips with the community</CardDescription>
              </CardHeader>
              <form onSubmit={handleSubmitPost}>
                <CardContent className="space-y-4 pt-6">
                  <div>
                    <label htmlFor="title" className="block text-sm font-medium mb-1">
                      Title
                    </label>
                    <Input
                      id="title"
                      value={newPostTitle}
                      onChange={(e) => setNewPostTitle(e.target.value)}
                      placeholder="What's your topic?"
                      required
                      className="border-gray-300 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="content" className="block text-sm font-medium mb-1">
                      Content
                    </label>
                    <Textarea
                      id="content"
                      value={newPostContent}
                      onChange={(e) => setNewPostContent(e.target.value)}
                      placeholder="Share your thoughts, questions, or advice..."
                      rows={6}
                      required
                      className="border-gray-300 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="category" className="block text-sm font-medium mb-2">
                      Category
                    </label>
                    <div className="flex flex-wrap gap-3">
                      {POST_CATEGORIES.map((category) => (
                        <div
                          key={category.id}
                          className={`flex items-center p-2 rounded-md cursor-pointer border transition-colors ${
                            newPostCategory === category.id
                              ? "border-blue-500 bg-blue-50"
                              : "border-gray-200 hover:bg-gray-50"
                          }`}
                          onClick={() => setNewPostCategory(category.id)}
                        >
                          <div className="mr-2">{category.icon}</div>
                          <span className="text-sm">{category.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="bg-gray-50">
                  <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
                    {isLoading ? "Posting..." : "Post to Forum"}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="mb-4">You need to be logged in to create a post.</p>
                <Button>Log In</Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
