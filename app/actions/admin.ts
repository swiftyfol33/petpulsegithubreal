"use server"

import { db } from "@/lib/firebase"
import { collection, query, where, getDocs, doc, setDoc } from "firebase/firestore"
import { auth as adminAuth } from "firebase-admin"

// Check if a user is an admin
export async function checkAdminStatus(email: string): Promise<boolean> {
  try {
    if (!email) return false

    // Check if the user is the default admin
    if (email === "aaa@gmail.com") return true

    // Check if the user has admin role in Firestore
    const adminQuery = query(collection(db, "userRoles"), where("email", "==", email))
    const adminSnapshot = await getDocs(adminQuery)

    return !adminSnapshot.empty && adminSnapshot.docs[0].data().isAdmin === true
  } catch (error) {
    console.error("Error checking admin status:", error)
    return false
  }
}

// Check if a user exists in Firebase Auth
export async function checkUserExists(email: string, adminEmail: string): Promise<{ exists: boolean; user?: any }> {
  try {
    // Verify the admin status
    const isAdmin = await checkAdminStatus(adminEmail)

    if (!isAdmin) {
      throw new Error("Unauthorized")
    }

    // Check if user exists in Firebase Auth
    try {
      const userRecord = await adminAuth().getUserByEmail(email)
      return { exists: true, user: { email: userRecord.email } }
    } catch (error) {
      // User doesn't exist
      return { exists: false }
    }
  } catch (error) {
    console.error("Error checking user:", error)
    throw error
  }
}

// Add a user to Firestore
export async function addUserToFirestore(
  userData: any,
  adminEmail: string,
): Promise<{ success: boolean; message: string }> {
  try {
    // Verify the admin status
    const isAdmin = await checkAdminStatus(adminEmail)

    if (!isAdmin) {
      throw new Error("Unauthorized")
    }

    // Create a new user document in Firestore
    const userDocRef = doc(collection(db, "users"))
    await setDoc(userDocRef, {
      ...userData,
      addedBy: adminEmail,
      addedAt: new Date().toISOString(),
    })

    return { success: true, message: `User ${userData.email} has been successfully added.` }
  } catch (error) {
    console.error("Error adding user:", error)
    return { success: false, message: error instanceof Error ? error.message : "Failed to add user" }
  }
}
