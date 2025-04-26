// Environment variables configuration
// This file centralizes all environment variable access

// Server-side only environment variables (never exposed to the client)
export const serverEnv = {
  // API Keys (server-side only)
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || "",
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || "", // Not prefixed with NEXT_PUBLIC
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
    monthlyPriceId: process.env.STRIPE_MONTHLY_PRICE_ID || "",
    yearlyPriceId: process.env.STRIPE_YEARLY_PRICE_ID || "",
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || "",
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || "",
  },
  google: {
    mapsApiKey: process.env.GOOGLE_MAPS_API_KEY || "",
    placesApiKey: process.env.GOOGLE_PLACES_API_KEY || "",
  },
  admin: {
    apiKey: process.env.ADMIN_API_KEY || "", // Not prefixed with NEXT_PUBLIC
  },
  firebase: {
    adminClientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL || "",
    adminPrivateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY || "",
  },
  zoom: {
    accountId: process.env.ZOOM_ACCOUNT_ID || "",
    clientId: process.env.ZOOM_CLIENT_ID || "",
    clientSecret: process.env.ZOOM_CLIENT_SECRET || "",
  },
  baseUrl: process.env.BASE_URL || "", // Not prefixed with NEXT_PUBLIC
}

// Client-side safe environment variables (must be prefixed with NEXT_PUBLIC_)
export const clientEnv = {
  firebase: {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
  },
  // Add other client-safe variables here
}

// Validate environment variables
export function validateServerEnv() {
  const missingServerVars = Object.entries(serverEnv).flatMap(([category, vars]) => {
    if (typeof vars === "object") {
      return Object.entries(vars)
        .filter(([_, value]) => !value)
        .map(([key]) => `${category}.${key}`)
    } else {
      return !vars ? [category] : []
    }
  })

  if (missingServerVars.length > 0) {
    console.warn("⚠️ Missing server environment variables:", missingServerVars.join(", "))
    return false
  }

  return true
}

// Validate client environment variables
export function validateClientEnv() {
  const missingClientVars = Object.entries(clientEnv).flatMap(([category, vars]) => {
    if (typeof vars === "object") {
      return Object.entries(vars)
        .filter(([_, value]) => !value)
        .map(([key]) => `${category}.${key}`)
    } else {
      return !vars ? [category] : []
    }
  })

  if (missingClientVars.length > 0) {
    console.warn("⚠️ Missing client environment variables:", missingClientVars.join(", "))
    return false
  }

  return true
}
