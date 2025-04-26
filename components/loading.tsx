interface LoadingSpinnerProps {
  size?: "default" | "sm"
}

export function LoadingSpinner({ size = "default" }: LoadingSpinnerProps) {
  const sizeClass = size === "sm" ? "w-4 h-4" : "w-8 h-8"

  return (
    <div className="flex justify-center items-center h-full w-full">
      <div className={`animate-spin rounded-full border-t-2 border-b-2 border-blue-500 ${sizeClass}`}></div>
    </div>
  )
}
