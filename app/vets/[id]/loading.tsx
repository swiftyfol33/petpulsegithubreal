import { PageHeader } from "@/components/page-header"

export default function Loading() {
  return (
    <div className="container mx-auto px-4 py-6">
      <PageHeader heading="Vet Calendar" text="View appointments and shared pets" />
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
      </div>
    </div>
  )
}
