"use client"

import InstallPage from "@/components/install-page"
import { useEffect } from "react"

export default function Install() {
  useEffect(() => {
    // Force a refresh after the component mounts
    window.location.reload()
  }, [])

  return <InstallPage />
}
