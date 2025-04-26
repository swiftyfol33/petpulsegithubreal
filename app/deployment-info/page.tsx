"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function DeploymentInfo() {
  const [info, setInfo] = useState({
    hostname: "",
    protocol: "",
    pathname: "",
    nextData: "Not detected",
    buildId: "Unknown",
    isStatic: "Checking...",
    apiRoutesSupported: "Checking...",
  })

  useEffect(() => {
    // Basic environment info
    setInfo((prev) => ({
      ...prev,
      hostname: window.location.hostname,
      protocol: window.location.protocol,
      pathname: window.location.pathname,
    }))

    // Check for Next.js data
    const nextData = document.getElementById("__NEXT_DATA__")
    if (nextData) {
      try {
        const data = JSON.parse(nextData.textContent || "")
        setInfo((prev) => ({
          ...prev,
          nextData: "Detected",
          buildId: data.buildId || "Not found in NEXT_DATA",
        }))
      } catch (e) {
        setInfo((prev) => ({
          ...prev,
          nextData: "Error parsing: " + e.message,
        }))
      }
    }

    // Check if the site is statically generated
    const metaTags = document.getElementsByTagName("meta")
    let isStatic = "Unknown"
    for (let i = 0; i < metaTags.length; i++) {
      if (metaTags[i].name === "next-head-count") {
        isStatic = "Likely not (found next-head-count)"
        break
      }
    }
    setInfo((prev) => ({ ...prev, isStatic }))

    // Test if API routes work by making a simple fetch request
    // We'll use a timeout to avoid CORS issues
    setTimeout(() => {
      const testApiSupport = async () => {
        try {
          // Create a unique endpoint to avoid caching
          const timestamp = Date.now()
          const response = await fetch(`/api/test-support?t=${timestamp}`, {
            method: "HEAD",
            cache: "no-store",
          })

          // Check if we got HTML back (which would indicate API routes aren't supported)
          const contentType = response.headers.get("content-type") || ""

          if (contentType.includes("text/html")) {
            setInfo((prev) => ({
              ...prev,
              apiRoutesSupported: "No - received HTML instead of API response",
            }))
          } else {
            setInfo((prev) => ({
              ...prev,
              apiRoutesSupported: "Possibly supported (non-HTML response)",
            }))
          }
        } catch (error) {
          setInfo((prev) => ({
            ...prev,
            apiRoutesSupported: `Error testing: ${error.message}`,
          }))
        }
      }

      testApiSupport()
    }, 1000)
  }, [])

  return (
    <div className="container mx-auto p-4">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Deployment Diagnostics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoItem label="Hostname" value={info.hostname} />
              <InfoItem label="Protocol" value={info.protocol} />
              <InfoItem label="Current Path" value={info.pathname} />
              <InfoItem label="Next.js Data" value={info.nextData} />
              <InfoItem label="Build ID" value={info.buildId} />
              <InfoItem label="Static Generation" value={info.isStatic} />
              <InfoItem label="API Routes Support" value={info.apiRoutesSupported} />
            </div>

            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <h3 className="font-medium text-yellow-800 mb-2">Deployment Recommendations</h3>
              <p className="text-sm text-yellow-700">
                Based on the diagnostics, your deployment may not support API routes. Consider:
              </p>
              <ul className="list-disc pl-5 mt-2 text-sm text-yellow-700 space-y-1">
                <li>Vercel - Fully supports Next.js API routes</li>
                <li>Netlify - Requires specific configuration for API routes</li>
                <li>Static hosts (GitHub Pages, etc.) - Do not support API routes</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="border rounded-md p-3">
      <div className="text-sm font-medium text-gray-500">{label}</div>
      <div className="mt-1 font-mono text-sm break-all">{value}</div>
    </div>
  )
}
