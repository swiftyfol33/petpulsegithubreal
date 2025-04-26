"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useFirebase } from "@/lib/firebase-provider"

export default function DebugFirebasePage() {
  const firebase = useFirebase()
  const [windowEnv, setWindowEnv] = useState<Record<string, any> | null>(null)
  const [processEnv, setProcessEnv] = useState<Record<string, boolean>>({})

  useEffect(() => {
    // Check window.ENV variables
    if (typeof window !== "undefined") {
      const env = window.ENV || {}
      setWindowEnv({
        FIREBASE_API_KEY: env.FIREBASE_API_KEY ? `Set (starts with ${env.FIREBASE_API_KEY.substring(0, 3)}...)` : "Not set",
        FIREBASE_AUTH_DOMAIN: env.FIREBASE_AUTH_DOMAIN || "Not set",
        FIREBASE_PROJECT_ID: env.FIREBASE_PROJECT_ID || "Not set",
        FIREBASE_STORAGE_BUCKET: env.FIREBASE_STORAGE_BUCKET || "Not set",
        FIREBASE_MESSAGING_SENDER_ID: env.FIREBASE_MESSAGING_SENDER_ID || "Not set",
        FIREBASE_APP_ID: env.FIREBASE_APP_ID || "Not set",
      })
    }

    // Check process.env variables
    setProcessEnv({
      NEXT_PUBLIC_FIREBASE_API_KEY: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: !!process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: !!process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: !!process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      NEXT_PUBLIC_FIREBASE_APP_ID: !!process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    })
  }, [])

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Firebase Debug</h1>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Firebase Connection Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Status:</span> 
                  <span className={`font-mono ${
                    firebase.connectionStatus === "connected" 
                      ? "text-green-600" 
                      : firebase.connectionStatus === "connecting"
                      ? "text-orange-500"
                      : "text-red-600"
                  }`}>
                    {firebase.connectionStatus}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="font-medium">Auth Initialized:</span>
                  <span className={`font-mono ${firebase.auth ? "text-green-600" : "text-red-600"}`}>
                    {firebase.auth ? "Yes" : "No"}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="font-medium">Firestore Initialized:</span>
                  <span className={`font-mono ${firebase.db ? "text-green-600" : "text-red-600"}`}>
                    {firebase.db ? "Yes" : "No"}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="font-medium">Authentication:</span>
                  <span className={`font-mono ${!firebase.loading && firebase.user ? "text-green-600" : "text-gray-600"}`}>
                    {firebase.loading ? "Loading..." : firebase.user ? "Authenticated" : "Not authenticated"}
                  </span>
                </div>
              </div>
              
              {firebase.connectionError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="font-medium text-red-800">Error:</p>
                  <pre className="text-sm text-red-700 mt-1 overflow-auto max-h-24">
                    {firebase.connectionError.message}
                  </pre>
                </div>
              )}
              
              {firebase.connectionStatus === "error" && (
                <button 
                  onClick={firebase.retryConnection}
                  className="w-full px-4 py-2 mt-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Retry Connection
                </button>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Environment Variables</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">window.ENV Variables:</h3>
                {windowEnv ? (
                  <div className="space-y-1">
                    {Object.entries(windowEnv).map(([key, value]) => (
                      <div key={key} className="flex justify-between items-center">
                        <span className="font-mono text-sm">{key}:</span>
                        <span className={`font-mono text-sm ${
                          value && value !== "Not set" ? "text-green-600" : "text-red-600"
                        }`}>
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 italic">Checking window.ENV...</p>
                )}
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">process.env Variables:</h3>
                <div className="space-y-1">
                  {Object.entries(processEnv).map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center">
                      <span className="font-mono text-sm">{key}:</span>
                      <span className={`font-mono text-sm ${value ? "text-green-600" : "text-red-600"}`}>
                        {value ? "Set" : "Not set"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> In production, process.env values may not be accurate on the client side. 
                  The window.ENV values are more reliable for client-side code.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Deployment Troubleshooting</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p>
                If you're experiencing Firebase authentication issues in production, check the following:
              </p>
              
              <ol className="list-decimal pl-5 space-y-2">
                <li>Verify that environment variables are properly set in your Vercel project settings</li>
                <li>Make sure your Firebase API key is available in the window.ENV object</li>
                <li>Check that Firebase initialization happens after window.ENV is populated</li>
                <li>Look for the "Neither apiKey nor config.authenticator provided" error in the console, which indicates missing Firebase credentials</li>
                <li>Test the app in debug mode by navigating to /debug-firebase</li>
              </ol>
              
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-800">
                  <strong>Tip:</strong> You can fix most Firebase configuration issues by ensuring that the environment variables 
                  are properly set in your Vercel project and that the window.ENV object is populated before Firebase initialization.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}