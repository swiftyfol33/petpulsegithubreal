"use client"

import { useFirebase } from "@/lib/firebase-provider"
import { AlertCircle, CheckCircle, Loader2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"

export function FirebaseConnectionStatus() {
  const { connectionStatus, connectionError, retryConnection } = useFirebase()
  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Only show for error or disconnected states
    if (connectionStatus === "error" || connectionStatus === "disconnected") {
      setVisible(true)
    } else if (connectionStatus === "connected") {
      // Show briefly when connected, then hide
      setVisible(true)
      const timer = setTimeout(() => {
        setVisible(false)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [connectionStatus])

  // Don't show if dismissed or not visible
  if (!visible || dismissed) return null

  return (
    <div className="fixed bottom-20 left-0 right-0 z-50 flex justify-center px-4">
      <div
        className={`rounded-lg shadow-lg px-4 py-3 flex items-center gap-2 max-w-md ${
          connectionStatus === "connected"
            ? "bg-green-100 text-green-800"
            : connectionStatus === "connecting"
              ? "bg-blue-100 text-blue-800"
              : "bg-red-100 text-red-800"
        }`}
      >
        {connectionStatus === "connected" ? (
          <CheckCircle className="h-5 w-5" />
        ) : connectionStatus === "connecting" ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : connectionStatus === "disconnected" ? (
          <RefreshCw className="h-5 w-5" />
        ) : (
          <AlertCircle className="h-5 w-5" />
        )}

        <div className="flex-1">
          {connectionStatus === "connected" && <p className="text-sm font-medium">Connected to Firebase</p>}
          {connectionStatus === "connecting" && <p className="text-sm font-medium">Connecting to Firebase...</p>}
          {connectionStatus === "disconnected" && (
            <p className="text-sm font-medium">Disconnected from Firebase. Please check your connection.</p>
          )}
          {connectionStatus === "error" && (
            <>
              <p className="text-sm font-medium">Error connecting to Firebase</p>
              {connectionError && <p className="text-xs">{connectionError.message}</p>}
            </>
          )}
        </div>

        {(connectionStatus === "error" || connectionStatus === "disconnected") && (
          <Button
            size="sm"
            variant="outline"
            className="bg-white"
            onClick={() => {
              retryConnection()
              setDismissed(false)
            }}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Retry
          </Button>
        )}

        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 rounded-full" onClick={() => setDismissed(true)}>
          ×
        </Button>
      </div>
    </div>
  )
}
