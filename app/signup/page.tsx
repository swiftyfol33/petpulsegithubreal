"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { createUserWithEmailAndPassword } from "firebase/auth"
import { auth, db } from "../../lib/firebase"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Eye, EyeOff } from "lucide-react"
import { doc, setDoc } from "firebase/firestore"

export default function SignUp() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [role, setRole] = useState("pet-owner")
  const router = useRouter()

  useEffect(() => {
    // Get role from URL query parameter
    const params = new URLSearchParams(window.location.search)
    const roleParam = params.get("role")
    if (roleParam === "vet" || roleParam === "pet-owner") {
      setRole(roleParam)
    }
  }, [])

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)

      // Store the user role in Firestore
      const userRef = doc(db, "users", userCredential.user.uid)
      await setDoc(userRef, {
        email: email,
        role: role,
        createdAt: new Date().toISOString(),
      })

      // Redirect based on role
      if (role === "vet") {
        router.push("/onboarding/vet/profile") // Create this page later
      } else {
        router.push("/onboarding/name") // Existing onboarding flow for pet owners
      }
    } catch (error) {
      setError("Failed to create an account")
      console.error(error)
    }
  }

  return (
    <div className="min-h-screen !bg-[#2D57ED] p-6">
      {/* Header */}
      <div className="flex items-center mb-12">
        <button onClick={() => router.back()} className="text-white p-2">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-white text-xl font-medium ml-4 font-eb-garamond">Sign up</h1>
      </div>

      <div className="max-w-md mx-auto">
        {/* Main Content */}
        <div className="mb-12">
          <h2 className="text-white text-4xl font-bold mb-4 font-eb-garamond">
            {role === "vet" ? "Veterinary Staff Sign Up" : "Pet Owner Sign Up"}
          </h2>
          <p className="text-white text-xl">
            {role === "vet"
              ? "Join PetPulse as a veterinary professional and connect with pet owners."
              : "Join PetPulse and start your journey with your pet!"}
          </p>
        </div>

        {error && <p className="text-black bg-red-500/20 rounded-lg p-3 mb-4">{error}</p>}

        <form onSubmit={handleSignUp} className="space-y-4">
          {/* Email Input */}
          <div className="relative">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Your email"
              required
              className="w-full px-6 py-4 bg-white text-black placeholder-gray-400 rounded-full border-2 border-white focus:border-blue-300 focus:outline-none text-lg"
            />
          </div>

          {/* Password Input */}
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              className="w-full px-6 py-4 bg-white text-black placeholder-gray-400 rounded-full border-2 border-white focus:border-blue-300 focus:outline-none text-lg pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-black"
            >
              {showPassword ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
            </button>
          </div>

          {/* Sign Up Button */}
          <button
            type="submit"
            className="w-full bg-white text-blue-600 font-semibold rounded-full py-4 px-6 text-lg mt-6 transition-colors hover:bg-blue-100"
          >
            Sign up
          </button>

          {/* Terms Text */}
          <p className="text-white text-center text-sm mt-6">
            By signing up to PetPulse, you agree to our{" "}
            <Link href="/terms" className="underline">
              Terms
            </Link>{" "}
            &{" "}
            <Link href="/privacy" className="underline">
              Privacy statement
            </Link>
          </p>
        </form>

        {/* Login Link */}
        <p className="text-white text-center mt-6">
          Already have an account?{" "}
          <Link href="/login" className="underline font-semibold">
            Log in
          </Link>
        </p>
      </div>
    </div>
  )
}
