import type React from "react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Pet Owner Forum | PetPal",
  description: "Connect with other pet owners, share experiences, and get advice",
}

export default function ForumLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
