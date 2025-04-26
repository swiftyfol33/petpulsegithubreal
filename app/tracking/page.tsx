import { PageHeader } from "../../components/page-header"
import { PetHeader } from "../../components/pet-header"
import Navigation from "../../components/navigation"

export default function TrackingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#FFFFFF]">
      <PageHeader title="Tracking" />
      <PetHeader />
      <main className="flex-grow flex flex-col items-center p-6">
        <div className="w-full max-w-md">
          <h2 className="text-2xl font-semibold mb-4">Health Tracking</h2>
          <p>Monitor your pet's health metrics and view trends over time.</p>
          {/* Add more content and functionality for the Tracking page */}
        </div>
      </main>
      <Navigation />
    </div>
  )
}
