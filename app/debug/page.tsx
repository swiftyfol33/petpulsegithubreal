"use client"

import { useEffect, useState } from "react"
import { debugFirebaseConfig } from "@/lib/firebase-debug"

export default function DebugPage() {
  const [debug, setDebug] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      const result = debugFirebaseConfig()
      setDebug(result)
    } catch (err: any) {
      setError(err.message || "An error occurred")
    }
  }, [])

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Firebase Debug Page</h1>

      {error && (
        <div className="p-4 mb-6 bg-red-50 border border-red-200 rounded-md">
          <h2 className="font-semibold text-red-800">Error</h2>
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {debug && (
        <div className="space-y-6">
          <div className="p-4 bg-gray-50 border rounded-md">
            <h2 className="font-semibold mb-2">Firebase Initialization Status</h2>
            <p>
              Firebase is{" "}
              <span className={debug.isInitialized ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                {debug.isInitialized ? "initialized" : "not initialized"}
              </span>
            </p>
          </div>

          <div className="p-4 bg-gray-50 border rounded-md">
            <h2 className="font-semibold mb-2">Environment Variables</h2>
            <p className="mb-2">
              Status:{" "}
              <span className={debug.allVarsPresent ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                {debug.allVarsPresent ? "All variables present" : "Missing variables"}
              </span>
            </p>

            {debug.missingVars.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-red-800">Missing Variables:</h3>
                <ul className="list-disc pl-5 text-red-700">
                  {debug.missingVars.map((variable: string) => (
                    <li key={variable}>{variable}</li>
                  ))}
                </ul>
              </div>
            )}

            <h3 className="text-sm font-medium mb-1">Config Values:</h3>
            <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto">
              {JSON.stringify(
                {
                  ...debug.config,
                  apiKey: debug.config.apiKey ? "✓ Present (value hidden)" : "✗ Missing",
                },
                null,
                2,
              )}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}
