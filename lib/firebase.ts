"use client"

import {
  signInWithEmailAndPassword,
  fetchSignInMethodsForEmail,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
  updateEmail,
  updatePassword,
} from "firebase/auth"
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  orderBy,
  limit,
  Timestamp,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  startAfter,
  deleteDoc,
} from "firebase/firestore"

// Import from our centralized firebase initialization
import { auth, db, storage } from "./firebase-init"

// Export Firebase services
export {
  auth,
  db,
  storage,
  // Firestore utilities
  addDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  Timestamp,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  startAfter,
  deleteDoc,
}

// Export auth methods
export {
  signInWithEmailAndPassword,
  fetchSignInMethodsForEmail,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
  updateEmail,
  updatePassword,
}

// Export storage utilities
export { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage"
