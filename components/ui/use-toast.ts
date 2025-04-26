"use client"

import { useState, useEffect } from "react"

type ToastAction = {
  label: string
  onClick: () => void
}

type Toast = {
  id: string
  title?: string
  description?: string
  action?: ToastAction
  duration?: number
  type?: "default" | "destructive"
}

type Toasts = Toast[]

const TOAST_LIMIT = 5
const TOAST_REMOVE_DELAY = 1000

type ToasterToast = Toast & {
  id: string
  title?: string
  description?: string
  action?: ToastAction
}

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const

let count = 0

function generateId() {
  return String(count++)
}

// This is the actual toast state that will be shared
const toasts: ToasterToast[] = []
let listeners: ((toasts: ToasterToast[]) => void)[] = []

function addToast(toast: ToasterToast) {
  toasts.push(toast)
  listeners.forEach((listener) => listener([...toasts]))

  return toast.id
}

function updateToast(id: string, toast: Partial<ToasterToast>) {
  const index = toasts.findIndex((t) => t.id === id)
  if (index !== -1) {
    toasts[index] = { ...toasts[index], ...toast }
    listeners.forEach((listener) => listener([...toasts]))
  }
}

function dismissToast(id: string) {
  const index = toasts.findIndex((t) => t.id === id)
  if (index !== -1) {
    toasts[index] = { ...toasts[index], open: false }
    listeners.forEach((listener) => listener([...toasts]))

    setTimeout(() => {
      removeToast(id)
    }, TOAST_REMOVE_DELAY)
  }
}

function removeToast(id: string) {
  const index = toasts.findIndex((t) => t.id === id)
  if (index !== -1) {
    toasts.splice(index, 1)
    listeners.forEach((listener) => listener([...toasts]))
  }
}

// This is the function that will be exported
export function toast({
  title,
  description,
  type = "default",
  duration = 5000,
  action,
}: {
  title?: string
  description?: string
  type?: "default" | "destructive"
  duration?: number
  action?: ToastAction
}) {
  const id = generateId()

  const newToast: ToasterToast = {
    id,
    title,
    description,
    type,
    duration,
    action,
  }

  addToast(newToast)

  if (duration > 0) {
    setTimeout(() => {
      dismissToast(id)
    }, duration)
  }

  return {
    id,
    dismiss: () => dismissToast(id),
    update: (props: Partial<ToasterToast>) => updateToast(id, props),
  }
}

export function useToast() {
  const [localToasts, setLocalToasts] = useState<ToasterToast[]>([])

  useEffect(() => {
    listeners.push(setLocalToasts)
    setLocalToasts([...toasts])

    return () => {
      listeners = listeners.filter((listener) => listener !== setLocalToasts)
    }
  }, [])

  return {
    toast,
    toasts: localToasts,
    dismiss: dismissToast,
  }
}
