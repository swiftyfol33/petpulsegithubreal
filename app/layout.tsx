import "./globals.css"
import type React from "react"
import ClientLayout from "./clientLayout"
import { FirebaseProvider } from "@/lib/firebase-provider"
import { AuthProvider } from "@/contexts/AuthContext"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Get Firebase config from environment variables with fallbacks
  const firebaseApiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyAJCuaWjV4Mh5TuppTOYnC8Ai3agO1jVmo"
  const firebaseAuthDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "petpulse-95c5f.firebaseapp.com"
  const firebaseProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "petpulse-95c5f"
  const firebaseStorageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "petpulse-95c5f.appspot.com"
  const firebaseMessagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "970470884362"
  const firebaseAppId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:970470884362:web:4125c525822c263251cbf3"

  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
        <meta name="theme-color" content="#2D57ED" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="PetPulse" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        {/* Explicitly add the manifest link */}
        <link rel="manifest" href="/manifest.json" />
        {/* Initialize environment variables as early as possible - MUST be placed before any other scripts */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Initialize the environment configuration immediately
              window.ENV = {
                OPENAI_API_KEY: "${process.env.OPENAI_API_KEY || ""}",
                FIREBASE_API_KEY: "${firebaseApiKey}",
                FIREBASE_AUTH_DOMAIN: "${firebaseAuthDomain}",
                FIREBASE_PROJECT_ID: "${firebaseProjectId}",
                FIREBASE_STORAGE_BUCKET: "${firebaseStorageBucket}",
                FIREBASE_MESSAGING_SENDER_ID: "${firebaseMessagingSenderId}",
                FIREBASE_APP_ID: "${firebaseAppId}"
              };
              
              // Log that environment variables are initialized
              console.log("Environment variables initialized in window.ENV:", {
                FIREBASE_API_KEY: window.ENV.FIREBASE_API_KEY ? "Set (starts with " + window.ENV.FIREBASE_API_KEY.substring(0, 3) + "...)" : "Not set",
                FIREBASE_AUTH_DOMAIN: window.ENV.FIREBASE_AUTH_DOMAIN ? "Set" : "Not set",
                FIREBASE_PROJECT_ID: window.ENV.FIREBASE_PROJECT_ID ? "Set" : "Not set"
              });
              
              // Register service worker
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(registration) {
                      console.log('ServiceWorker registration successful with scope: ', registration.scope);
                    })
                    .catch(function(error) {
                      console.log('ServiceWorker registration failed: ', error);
                    });
                });
              }
              
              // Listen for beforeinstallprompt event
              let deferredPrompt;
              window.addEventListener('beforeinstallprompt', (e) => {
                // Prevent Chrome 67 and earlier from automatically showing the prompt
                e.preventDefault();
                // Stash the event so it can be triggered later
                deferredPrompt = e;
                console.log('beforeinstallprompt event fired');
                
                // Optionally, send a message to your app that the app can be installed
                if (window.dispatchEvent) {
                  window.dispatchEvent(new CustomEvent('pwaInstallable'));
                }
              });
              
              // Listen for appinstalled event
              window.addEventListener('appinstalled', (evt) => {
                console.log('appinstalled event fired');
                // Log the installation to analytics
                if (window.dispatchEvent) {
                  window.dispatchEvent(new CustomEvent('pwaInstalled'));
                }
              });
            `,
          }}
        />
      </head>
      <body>
        <FirebaseProvider>
          <AuthProvider>
            <ClientLayout>{children}</ClientLayout>
          </AuthProvider>
        </FirebaseProvider>
      </body>
    </html>
  )
}

export const metadata = {
      generator: 'v0.dev'
    };
