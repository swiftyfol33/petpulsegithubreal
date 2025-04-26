"use client"

import Link from "next/link"
import { Settings, LogOut } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"
import { toast } from "react-hot-toast"
import { Button } from "@/components/ui/button"

interface PageHeaderProps {
  title: string
}

export function PageHeader({ title }: PageHeaderProps) {
  const { user, signOut } = useAuth()
  const router = useRouter()

  const handleLogout = async () => {
    try {
      await signOut()
      router.push("/")
      toast.success("Logged out successfully")
    } catch (error) {
      console.error("Error logging out:", error)
      toast.error("Failed to log out. Please try again.")
    }
  }

  return (
    <div
      className="w-full py-3 px-6 flex justify-between items-center lg:pl-6"
      style={{
        background:
          "linear-gradient(90deg, rgba(31,86,143,1) 0%, rgba(52,52,110,1) 26%, rgba(45,87,224,1) 68%, rgba(128,190,255,1) 100%)",
      }}
    >
      <h1 className="text-2xl font-bold text-white">{title}</h1>
      <div className="flex items-center gap-2">
        <Link href="/settings">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 bg-white text-black hover:bg-gray-100 hover:text-black"
          >
            <Settings className="h-5 w-5" />
          </Button>
        </Link>
        {user && (
          <Button
            variant="destructive"
            size="sm"
            onClick={handleLogout}
            className="h-9 bg-red-600 text-white hover:bg-red-700 flex items-center"
          >
            <LogOut className="h-4 w-4" />
            <span className="sm:inline ml-1 text-xs sm:text-sm">Logout</span>
          </Button>
        )}
      </div>
    </div>
  )
}
