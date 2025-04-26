"use client"

import { PageHeader } from "../../components/page-header"
import { PetHeader } from "../../components/pet-header"
import Navigation from "../../components/navigation"

export default function TrackPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#FFFFFF]">
      <PageHeader title="Track Health" />
      <PetHeader />
      <main className="flex-grow flex flex-col items-center p-6">
        <div className="w-full max-w-md">
          <h2 className="text-2xl font-semibold mb-4">Health Tracking</h2>
          <p>The health tracking features have been moved to the home page for easier access.</p>
          <p>Please visit the home page to add health records, vaccinations, and medications.</p>
        </div>
      </main>
      <Navigation />
    </div>
  )
}
