"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import Link from "next/link"

export default function InstallPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [installPrompt, setInstallPrompt] = useState<any>(null)
  const [isInstallable, setIsInstallable] = useState(false)
  const [countdown, setCountdown] = useState(3)
  const [refreshing, setRefreshing] = useState(false)

  // Manifest data embedded directly in the component
  const manifestData = {
    name: "PetPulse",
    short_name: "PetPulse",
    description: "Track your pet's health and wellness",
    start_url: "/",
    id: "/",
    display: "standalone",
    background_color: "#4F46E5",
    theme_color: "#4F46E5",
    orientation: "portrait",
    icons: [
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any maskable",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable",
      },
    ],
    related_applications: [],
  }

  useEffect(() => {
    // Create a blob URL for the manifest
    const manifestBlob = new Blob([JSON.stringify(manifestData)], { type: "application/manifest+json" })
    const manifestUrl = URL.createObjectURL(manifestBlob)

    // Add manifest link to document head
    const linkElement = document.createElement("link")
    linkElement.rel = "manifest"
    linkElement.href = manifestUrl
    document.head.appendChild(linkElement)

    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("Service Worker registered with scope:", registration.scope)
          // Start countdown to refresh
          setRefreshing(true)
          const timer = setInterval(() => {
            setCountdown((prev) => {
              if (prev <= 1) {
                clearInterval(timer)
                // Refresh the page
                window.location.reload()
                return 0
              }
              return prev - 1
            })
          }, 1000)
        })
        .catch((error) => {
          console.error("Service Worker registration failed:", error)
          // If service worker fails, still show the install page after a delay
          setTimeout(() => {
            setIsLoading(false)
          }, 2000)
        })
    } else {
      // If service worker is not supported, still show the install page after a delay
      setTimeout(() => {
        setIsLoading(false)
      }, 2000)
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e)
      setIsInstallable(true)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)

    // Clean up
    return () => {
      URL.revokeObjectURL(manifestUrl)
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
      if (linkElement.parentNode) {
        linkElement.parentNode.removeChild(linkElement)
      }
    }
  }, [])

  const handleInstall = async () => {
    if (!installPrompt) return

    // Show the install prompt
    installPrompt.prompt()

    // Wait for the user to respond to the prompt
    const choiceResult = await installPrompt.userChoice
    console.log("User choice:", choiceResult.outcome)

    // Reset the install prompt
    setInstallPrompt(null)
  }

  if (isLoading || refreshing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center bg-gradient-to-b from-blue-50 to-white">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full">
          <img src="/icon-192x192.png" alt="PetPulse Logo" className="w-24 h-24 mx-auto mb-6" />

          <div className="relative w-24 h-24 mx-auto mb-6">
            <Spinner className="w-24 h-24 text-blue-500" />
            {refreshing && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-blue-600">{countdown}</span>
              </div>
            )}
          </div>

          <h1 className="text-2xl font-bold mb-2 text-blue-800">
            {refreshing ? "Preparing Installation..." : "Loading Manifest..."}
          </h1>

          <p className="text-gray-600 mb-4">
            {refreshing ? `Page will refresh in ${countdown} seconds` : "Please wait while we prepare the installation"}
          </p>

          <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300 ease-in-out"
              style={{
                width: refreshing ? `${((3 - countdown) / 3) * 100}%` : "30%",
              }}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center bg-gradient-to-b from-blue-50 to-white">
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full">
        <img src="/icon-512x512.png" alt="PetPulse Logo" className="w-32 h-32 mx-auto mb-6" />
        <h1 className="text-3xl font-bold mb-2 text-blue-800">Install PetPulse</h1>
        <p className="text-gray-600 mb-8 max-w-md mx-auto">
          Install PetPulse on your device for quick access to your pet's health tracking.
        </p>

        {isInstallable ? (
          <Button
            size="lg"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-lg rounded-xl"
            onClick={handleInstall}
          >
            Install Now
          </Button>
        ) : (
          <div className="space-y-4">
            <p className="font-medium text-blue-800">Installation instructions:</p>
            <div className="text-left space-y-2 bg-blue-50 p-4 rounded-lg">
              <p className="flex items-center">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center mr-2 text-sm">
                  1
                </span>
                Open this page in Safari (iOS) or Chrome (Android)
              </p>
              <p className="flex items-center">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center mr-2 text-sm">
                  2
                </span>
                Tap the share icon in your browser
              </p>
              <p className="flex items-center">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center mr-2 text-sm">
                  3
                </span>
                Select "Add to Home Screen" or "Install App"
              </p>
              <p className="flex items-center">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center mr-2 text-sm">
                  4
                </span>
                Confirm by tapping "Add" or "Install"
              </p>
            </div>
          </div>
        )}

        <div className="mt-6">
          <Link href="/" className="text-blue-600 hover:text-blue-800 underline">
            Return to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
