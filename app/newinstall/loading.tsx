import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="container mx-auto p-4">
      <div className="max-w-md mx-auto">
        <Skeleton className="h-12 w-full mb-4 rounded-lg" />
        <Skeleton className="h-6 w-3/4 mb-8 rounded-lg" />
        <Skeleton className="h-12 w-full mb-6 rounded-lg" />
        <div className="space-y-2 mb-6">
          <Skeleton className="h-4 w-full rounded-lg" />
          <Skeleton className="h-4 w-5/6 rounded-lg" />
          <Skeleton className="h-4 w-4/6 rounded-lg" />
        </div>
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    </div>
  )
}
