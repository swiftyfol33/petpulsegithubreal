import Link from "next/link"

interface SubscriptionBannerProps {
  text: string
  className?: string
}

export function SubscriptionBanner({ text, className = "" }: SubscriptionBannerProps) {
  return (
    <div
      className={`bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-lg shadow-md mb-6 ${className}`}
    >
      <div className="container mx-auto flex flex-col md:flex-row justify-between items-center">
        <p className="text-lg font-medium mb-4 md:mb-0">{text}</p>
        <Link
          href="/subscribe"
          className="bg-white text-blue-600 px-6 py-2 rounded-md font-medium hover:bg-blue-50 transition-colors"
        >
          Subscribe Now
        </Link>
      </div>
    </div>
  )
}
