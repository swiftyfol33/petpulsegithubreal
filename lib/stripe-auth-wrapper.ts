// This file provides a wrapper for Stripe functionality that uses the existing Firebase Auth instance
import { auth } from "./firebase"

// Export the auth instance for Stripe-related components to use
export const stripeAuth = auth

// Helper function to get the current user's ID safely
export const getCurrentUserId = () => {
  return auth?.currentUser?.uid
}

// Helper function to get the current user's email safely
export const getCurrentUserEmail = () => {
  return auth?.currentUser?.email
}

// Export any other Firebase Auth functionality that Stripe components might need
export const isUserAuthenticated = () => {
  return !!auth?.currentUser
}
