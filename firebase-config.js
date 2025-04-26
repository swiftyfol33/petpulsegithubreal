// firebase-config.js
const firebaseConfig = {
  apiKey:
    typeof window !== "undefined" && window.ENV?.FIREBASE_API_KEY
      ? window.ENV.FIREBASE_API_KEY
      : process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyAJCuaWjV4Mh5TuppTOYnC8Ai3agO1jVmo",
  authDomain:
    typeof window !== "undefined" && window.ENV?.FIREBASE_AUTH_DOMAIN
      ? window.ENV.FIREBASE_AUTH_DOMAIN
      : process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "petpulse-95c5f.firebaseapp.com",
  projectId:
    typeof window !== "undefined" && window.ENV?.FIREBASE_PROJECT_ID
      ? window.ENV.FIREBASE_PROJECT_ID
      : process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "petpulse-95c5f",
  storageBucket:
    typeof window !== "undefined" && window.ENV?.FIREBASE_STORAGE_BUCKET
      ? window.ENV.FIREBASE_STORAGE_BUCKET
      : process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "petpulse-95c5f.appspot.com",
  messagingSenderId:
    typeof window !== "undefined" && window.ENV?.FIREBASE_MESSAGING_SENDER_ID
      ? window.ENV.FIREBASE_MESSAGING_SENDER_ID
      : process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "970470884362",
  appId:
    typeof window !== "undefined" && window.ENV?.FIREBASE_APP_ID
      ? window.ENV.FIREBASE_APP_ID
      : process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:970470884362:web:4125c525822c263251cbf3",
}

// Add detailed logging for the config
console.log("Firebase config loaded with values:", {
  apiKey: firebaseConfig.apiKey ? "Set (starts with " + firebaseConfig.apiKey.substring(0, 3) + "...)" : "Not set",
  authDomain: firebaseConfig.authDomain ? "Set" : "Not set",
  projectId: firebaseConfig.projectId ? "Set" : "Not set",
  storageBucket: firebaseConfig.storageBucket ? "Set" : "Not set",
  messagingSenderId: firebaseConfig.messagingSenderId ? "Set" : "Not set",
  appId: firebaseConfig.appId ? "Set" : "Not set",
})

// Check if window.ENV exists
if (typeof window !== "undefined") {
  console.log("window.ENV exists:", !!window.ENV)
  if (window.ENV) {
    console.log("window.ENV Firebase keys:", {
      apiKey: window.ENV.FIREBASE_API_KEY ? "Set" : "Not set",
      authDomain: window.ENV.FIREBASE_AUTH_DOMAIN ? "Set" : "Not set",
      projectId: window.ENV.FIREBASE_PROJECT_ID ? "Set" : "Not set",
    })
  }
}

// Check environment variables
console.log("Environment variables:", {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? "Set" : "Not set",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ? "Set" : "Not set",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? "Set" : "Not set",
})

export default firebaseConfig
