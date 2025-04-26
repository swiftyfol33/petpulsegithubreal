import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json(
    {
      name: "PetPulse - Pet Health Tracker",
      short_name: "PetPulse",
      description: "Track and monitor your pet's health with AI-powered insights",
      start_url: "/",
      id: "/",
      display: "standalone",
      orientation: "portrait",
      background_color: "#ffffff",
      theme_color: "#2D57ED",
      categories: ["health", "pets", "lifestyle"],
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
      screenshots: [
        {
          src: "/screenshot1.png",
          sizes: "1280x720",
          type: "image/png",
          label: "PetPulse Dashboard",
        },
      ],
      prefer_related_applications: false,
      related_applications: [],
    },
    {
      status: 200,
      headers: {
        "Content-Type": "application/manifest+json",
        "Cache-Control": "public, max-age=3600",
        "Access-Control-Allow-Origin": "*",
      },
    },
  )
}
