"use client"

import { useToast } from "@/components/ui/use-toast"
import {
  Toast,
  ToastProvider,
  ToastViewport,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
} from "@/components/ui/toast"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      <div className="fixed top-0 z-[200] flex flex-col items-end gap-2 p-4 max-h-screen overflow-hidden">
        {toasts.map((toast) => (
          <Toast key={toast.id} className="bg-gray-800 text-white border-gray-700">
            {toast.title && <ToastTitle className="text-white">{toast.title}</ToastTitle>}
            {toast.description && <ToastDescription className="text-gray-200">{toast.description}</ToastDescription>}
            {toast.action && <ToastAction altText="Action">{toast.action}</ToastAction>}
            <ToastClose />
          </Toast>
        ))}
      </div>
      <ToastViewport />
    </ToastProvider>
  )
}
