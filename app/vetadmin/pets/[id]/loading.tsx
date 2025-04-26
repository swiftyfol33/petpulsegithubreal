import { PageHeader } from "@/components/page-header"
import { Loader2 } from "lucide-react"

export default function Loading() {
  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader title="Pet Details" />
      <main className="flex-grow flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </main>
    </div>
  )
}
