"use client"

import type React from "react"

import { useState } from "react"
import { signInWithEmailAndPassword } from "firebase/auth"
import { auth, db, doc, getDoc } from "../../lib/firebase"
import { useRouter } from "next/navigation"
import { ArrowLeft, Eye, EyeOff } from "lucide-react"
import Link from "next/link"

export default function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    try {
      // Sign in with Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      // Check if user is soft-deleted
      const userDoc = await getDoc(doc(db, "users", user.uid))

      if (userDoc.exists() && userDoc.data().deleted === true) {
        // User is soft-deleted, sign them out and show error
        await auth.signOut()
        setError("This account is no longer available. Please contact support for assistance.")
        return
      }

      // User is not deleted, proceed with login
      // Check if there's a redirect path stored in sessionStorage
      const redirectPath = sessionStorage.getItem("redirectAfterLogin")
      if (redirectPath) {
        // Clear the stored path
        sessionStorage.removeItem("redirectAfterLogin")
        // Redirect to the stored path
        router.push(redirectPath)
        return
      }
      router.push("/") // Changed from "/welcome" to "/"
    } catch (error) {
      console.error("Login error:", error)
      setError("Failed to log in. Please check your email and password.")
    }
  }

  return (
    <div className="min-h-screen !bg-[#2D57ED] p-6 relative overflow-hidden">
      {/* Background SVG */}
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden z-0 pointer-events-none">
        <svg viewBox="0 0 568.69 346.17" className="w-[150%] h-auto" preserveAspectRatio="xMidYMid slice">
          <path
            fill="#b5c0eb"
            d="M568.67,241.22c0,37.57-162.22,70.72-210.6,36.85-14.68-10.28-27.56-24.55-37.63-40.23,3.73-1.08,7.39-2.18,11-3.26,37.6-11.27,76.47-22.92,88.13-60.58,9.91-32.04-5.15-70.99-34.29-88.67-19.07-11.57-43.03-13.4-67.48-5.15-20.94,7.06-39.49,20.56-50.88,37.05-16.25,23.51-18.61,53.94-11.47,84.64-5.29-.27-10.65-.98-16.1-2.24-18.65-4.31-37.61-14.77-53.7-28.88,3.14-1.38,6.25-2.88,9.3-4.5,26.81-14.17,45.41-35.69,51.04-59.04,3.62-15.07,2.27-32.59-3.73-48.06-6.81-17.57-18.74-30.86-33.59-37.41-15.71-6.94-34.78-6.31-53.69,1.75-23.59,10.06-43.14,29.8-51.03,51.5-6.32,17.39-5.75,37.72,1.44,58.81-1.84-.53-3.65-1.13-5.43-1.8C62.91,117.97,0,53,0,0c0,0,.03,4.05.08,10.66.11.42.18.88.18,1.38v23.48c.17,25.13.37,57.28.37,74.37,0,36.34,39.49,48.63,83.02,65.12,15.6,5.91,32.63,8.49,49.86,7.82,24.96,30.39,59.97,53.42,95.47,61.62,15.47,3.58,30.05,4.18,43.86,3.05,14.49,27.22,35.27,51.75,58.84,68.25,28.59,20.01,63.33,30.42,101.17,30.42,4.55,0,9.15-.15,13.79-.45,41.96-2.74,122.04-7.06,122.04-35.24l-.02-69.26ZM155.11,132.99c-8.85-16.42-11.75-31.81-7.94-42.28,3.51-9.67,14.14-19.91,25.84-24.9,4.44-1.89,8.67-2.87,12.14-2.87,1.9,0,3.57.29,4.92.89,7.51,3.31,14.28,19.73,11.18,32.63-2.49,10.36-12.89,21.25-27.81,29.13-5.86,3.1-12.03,5.57-18.33,7.41ZM301.27,195.45c-5.55-20.52-5.1-39.66,3.48-52.07,8.55-12.38,27-22.29,42.57-22.29,5.18,0,10.04,1.1,14.1,3.56,11.13,6.75,17.91,23.79,14.21,35.74-4.4,14.23-28.96,21.59-57.43,30.12-5.7,1.71-11.32,3.39-16.92,4.92Z"
          />
        </svg>
      </div>

      {/* Header */}
      <div className="flex items-center mb-12 relative z-20">
        <button onClick={() => router.back()} className="text-white p-2">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-white text-xl font-medium ml-4 font-eb-garamond">Sign in</h1>
      </div>

      <div className="max-w-md mx-auto relative z-10">
        {/* Main Content */}
        <div className="mb-12">
          <h2 className="text-white text-4xl font-bold mb-4">Log in to your PetPulse account</h2>
          <p className="text-white text-xl">Let&apos;s start training again!</p>
        </div>

        {error && <p className="text-white bg-red-500/20 rounded-lg p-3 mb-4">{error}</p>}

        <form onSubmit={handleLogin} className="space-y-6">
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

          {/* Sign In Button */}
          <button
            type="submit"
            className="w-full bg-white text-blue-600 font-semibold rounded-full py-4 px-6 text-lg mt-6 transition-colors hover:bg-blue-100"
          >
            Sign In
          </button>

          {/* Link to Sign Up Page */}
          <p className="text-white text-center mt-4">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="underline hover:text-blue-200">
              Sign up here
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
