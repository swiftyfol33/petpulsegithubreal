// This file contains legacy user accounts that need to be maintained
// for backward compatibility. Both this method and the newer user management
// system will continue to work together.

export interface LegacyUser {
  email: string
  startDate: string
  endDate: string
  userId: string
}

// Update the legacyUsers array to include the additional users
export const legacyUsers: LegacyUser[] = [
  {
    email: "buckeyetransportlogistics@gmail.com",
    startDate: "Apr 8, 2025",
    endDate: "Apr 8, 2025",
    userId: "BjfzXmIv0vcaKuAtHkzLVhYrORI2",
  },
  {
    email: "aassdasdtasd212@gmail.com",
    startDate: "Apr 5, 2025",
    endDate: "Apr 5, 2025",
    userId: "1u7KjAv0vrfgDViwkh9XdpEqa8Z2",
  },
  {
    email: "petpulseai2025@gmail.com",
    startDate: "Apr 2, 2025",
    endDate: "Apr 7, 2025",
    userId: "FekDuY8zGDNm02EKRmsTPW9ghB83",
  },
  {
    email: "andrejfoltaa@reusable.email",
    startDate: "Apr 2, 2025",
    endDate: "Apr 5, 2025",
    userId: "mXP1e785psgvZNO3CcMWgjLro7k2",
  },
  {
    email: "testacc3@gmail.com",
    startDate: "Apr 1, 2025",
    endDate: "Apr 1, 2025",
    userId: "IntUZSP0TnT99pVIfu8LH8rVMb93",
  },
  {
    email: "testaccount2@gmail.com",
    startDate: "Apr 1, 2025",
    endDate: "Apr 1, 2025",
    userId: "pEgCGbTb5lTu8z9yXC1sJ2us3U52",
  },
  {
    email: "testingtrial@gmail.com",
    startDate: "Apr 1, 2025",
    endDate: "Apr 15, 2025",
    userId: "Z8q0thgHB0ef4vCYwRqkwgLH7NG3",
  },
  {
    email: "testingtrial@gmail.com",
    startDate: "Apr 1, 2025",
    endDate: "Apr 1, 2025",
    userId: "xEhHnfeOp5dEMZ5Rd5rOQJVAQUf1",
  },
  {
    email: "aliahmedwardheere@gmail.com",
    startDate: "Mar 24, 2025",
    endDate: "Apr 6, 2025",
    userId: "JSbBT8Y86uarzzKj0zxNJlmZoyz2",
  },
  // Adding the new user
  {
    email: "testingoijoij1@gmail.com",
    startDate: "Feb 19, 2025",
    endDate: "Feb 25, 2025",
    userId: "NKGkszmZBKY4N0OFoBAF4oehHeF2",
  },
  {
    email: "mbyanyuma108@gmail.com",
    startDate: "Feb 17, 2025",
    endDate: "Apr 2, 2025",
    userId: "A5RIlWgyDkYI1Y4NJx60f9S2rZz1",
  },
  {
    email: "yasinwarsame@hotmail.com",
    startDate: "Feb 13, 2025",
    endDate: "Apr 15, 2025",
    userId: "f0BV4abWK2RMVLBRuYcTSlrPPZc2",
  },
  {
    email: "abdurahmanmursal@gmail.com",
    startDate: "Feb 10, 2025",
    endDate: "Apr 8, 2025",
    userId: "qm2kkNcV0mgLVumTHMsNJUQfuRJ3",
  },
  {
    email: "testingaccount@gmail.com",
    startDate: "Feb 9, 2025",
    endDate: "Feb 9, 2025",
    userId: "PWr4N1xOe9Ta1fGZvFVdvEQQhiZ2",
  },
]

/**
 * Helper function to check if a user exists in the legacy users list
 * @param userId The Firebase user ID to check
 * @returns The legacy user object if found, undefined otherwise
 */
export function findLegacyUserById(userId: string): LegacyUser | undefined {
  return legacyUsers.find((user) => user.userId === userId)
}

/**
 * Helper function to check if an email exists in the legacy users list
 * @param email The email to check
 * @returns The legacy user object if found, undefined otherwise
 */
export function findLegacyUserByEmail(email: string): LegacyUser | undefined {
  return legacyUsers.find((user) => user.email === email)
}

/**
 * Helper function to check if a user has an active subscription based on the end date
 * @param userId The Firebase user ID to check
 * @returns Boolean indicating if the user has an active subscription
 */
export function hasActiveLegacySubscription(userId: string): boolean {
  const user = findLegacyUserById(userId)
  if (!user) return false

  const endDate = new Date(user.endDate)
  const currentDate = new Date()

  return endDate >= currentDate
}
