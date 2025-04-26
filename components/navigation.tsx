"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "../contexts/AuthContext"
import { useMediaQuery } from "@/hooks/use-media-query"
import Image from "next/image"
import { useEffect, useState } from "react"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useRouter } from "next/navigation"
import { toast } from "react-hot-toast"
import {
  HomeIcon,
  PawPrintIcon,
  UserRoundIcon,
  MessagesSquareIcon,
  BarChartIcon as ChartBarIcon,
  LogOut,
  Settings,
} from "lucide-react"

const Navigation = () => {
  const pathname = usePathname()
  const { user, signOut } = useAuth()
  const router = useRouter()
  const isDesktop = useMediaQuery("(min-width: 800px)")
  const [userRole, setUserRole] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user) {
        setIsLoading(false)
        return
      }

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid))
        if (userDoc.exists()) {
          setUserRole(userDoc.data().role || "pet-owner") // Default to pet-owner if role is not set
        } else {
          setUserRole("pet-owner") // Default role
        }
      } catch (error) {
        console.error("Error fetching user role:", error)
        setUserRole("pet-owner") // Default on error
      } finally {
        setIsLoading(false)
      }
    }

    fetchUserRole()
  }, [user])

  if (!user || isLoading) {
    return null
  }

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

  const isVet = userRole === "vet"

  // For pet owners - removed Settings
  const petOwnerNavItems = [
    { name: "Home", href: "/", icon: HomeIcon },
    { name: "Pets", href: "/pets", icon: PawPrintIcon },
    { name: "Analytics", href: "/analytics", icon: ChartBarIcon },
    { name: "Analyze", href: "/analyze", icon: UserRoundIcon },
    { name: "Forum", href: "/forum", icon: MessagesSquareIcon },
    { name: "Vets", href: "/vets", icon: PawPrintIcon },
    { name: "Emergency", href: "/emergency", icon: UserRoundIcon },
  ]

  // For vets - removed Settings
  const vetNavItems = [
    { name: "Home", href: "/vetadmin", icon: HomeIcon },
    { name: "Patients", href: "/vetadmin/patients", icon: PawPrintIcon },
    { name: "Forum", href: "/forum", icon: MessagesSquareIcon },
  ]

  const navigationItems = isVet ? vetNavItems : petOwnerNavItems

  const isActivePath = (itemHref: string) => {
    if (!pathname) return false

    // Special case for home page - must be exact match
    if (itemHref === "/" && pathname !== "/") {
      return false
    }

    // Exact match for vetadmin home
    if (itemHref === "/vetadmin" && pathname === "/vetadmin") {
      return true
    }

    // For other vetadmin pages
    if (itemHref.startsWith("/vetadmin/") && pathname.startsWith(itemHref)) {
      return true
    }

    // For non-vetadmin pages
    if (!itemHref.startsWith("/vetadmin") && !pathname.startsWith("/vetadmin") && pathname.includes(itemHref)) {
      return true
    }

    return false
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t lg:top-0 lg:left-0 lg:bottom-0 lg:right-auto lg:w-64 lg:border-r lg:border-l lg:border-t-0 lg:flex lg:flex-col z-50">
      {isDesktop && (
        <div className="hidden lg:block p-4 border-b">
          <div className="relative w-[150px] h-[44px]">
            <Image
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logo_white-W0YALdeeQEgQhUWkqHdtQXPgBTuxUv.svg"
              alt="PetPulse"
              fill
              priority
              className="object-contain filter-to-blue"
            />
          </div>
        </div>
      )}
      <div className="max-w-md mx-auto lg:max-w-none lg:flex-grow">
        <ul className="flex justify-between items-center p-1 px-6 lg:flex-col lg:items-start lg:justify-start lg:p-4 lg:space-y-4">
          {navigationItems.map((item) => (
            <li key={item.href} className="flex-1 lg:w-full">
              <Link
                href={item.href}
                className={`flex flex-col items-center p-2 lg:flex-row lg:space-x-4 ${
                  isActivePath(item.href) ? "text-[#2D57ED] font-semibold" : "text-black"
                }`}
              >
                {/* @ts-expect-error */}
                <item.icon className={`w-5 h-5 ${isActivePath(item.href) ? "text-[#2D57ED]" : "text-black"}`} />
                <span
                  className={`text-[10px] mt-0.5 lg:text-base lg:mt-0 ${isActivePath(item.href) ? "font-semibold" : ""}`}
                >
                  {item.name}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {/* Settings and Logout Buttons - Only visible on desktop (min-width: 800px) */}
      {isDesktop && (
        <div className="hidden lg:block p-4 mt-auto border-t space-y-3">
          {/* Settings Button */}
          <Link
            href="/settings"
            className={`w-full flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-800 py-2 px-4 rounded-md transition-colors ${
              pathname?.includes("/settings") ? "bg-gray-200 font-semibold" : ""
            }`}
          >
            <Settings className="h-4 w-4 mr-2" />
            <span>Settings</span>
          </Link>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-md transition-colors"
          >
            <LogOut className="h-4 w-4 mr-2" />
            <span>Log Out</span>
          </button>
        </div>
      )}
    </nav>
  )
}

export default Navigation

// Add this CSS
const styles = `
.filter-to-blue {
  filter: brightness(0) saturate(100%) invert(27%) sepia(91%) saturate(1857%) hue-rotate(220deg) brightness(98%) contrast(98%);
}
`

// Add this line right after the styles constant
if (typeof document !== "undefined") {
  const styleElement = document.createElement("style")
  styleElement.innerHTML = styles
  document.head.appendChild(styleElement)
}
