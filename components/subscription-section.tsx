import type React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Crown } from "lucide-react"

interface SubscriptionSectionProps {
  isPremium: boolean
  subscriptionStatus: {
    adminGranted: boolean
    plan?: string
  }
  isTrialActive: boolean
}

export const SubscriptionSection: React.FC<SubscriptionSectionProps> = ({
  isPremium,
  subscriptionStatus,
  isTrialActive,
}) => {
  return (
    <div className="pb-4 border-b border-gray-200">
      <h3 className="text-lg font-medium mb-2">Subscription</h3>
      <div className="flex flex-col space-y-3">
        <div className="flex items-center">
          {isPremium ? (
            <span className="flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
              <Crown className="h-4 w-4" />
              {subscriptionStatus.adminGranted
                ? "Admin Granted Subscription"
                : isTrialActive
                  ? "Premium Trial"
                  : subscriptionStatus.plan === "monthly"
                    ? "Monthly Subscription"
                    : "Yearly Subscription"}
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">Free Plan</span>
          )}
        </div>
        {isPremium && (
          <Link href="/settings/subscription" className="w-full">
            <Button variant="outline" className="w-full flex items-center justify-center gap-2">
              <Crown className="h-4 w-4" />
              Manage Subscription
            </Button>
          </Link>
        )}
        {!isPremium && (
          <Link href="/subscribe" className="w-full">
            <Button className="w-full flex items-center justify-center gap-2">
              <Crown className="h-4 w-4" />
              Upgrade to Premium
            </Button>
          </Link>
        )}
      </div>
    </div>
  )
}
