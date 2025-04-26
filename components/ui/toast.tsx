"use client"

import * as React from "react"
import * as ToastPrimitive from "@radix-ui/react-toast"

import { cn } from "@/lib/utils"

const ToastProvider = ToastPrimitive.Provider

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Viewport
    ref={ref}
    className={cn(
      "fixed bottom-0 right-0 z-[200] flex max-h-screen w-[380px] flex-col gap-2 p-4 sm:pointer-events-auto sm:pl-[calc(var(--viewport-padding)-1.5rem)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-80 data-[state=open]:zoom-in-100 data-[state=closed]:zoom-out-95 data-[side=top]:translate-y-0 data-[side=bottom]:translate-y-0 data-[side=right]:translate-x-0 data-[side=left]:translate-x-0 data-[side=bottom]:data-[swipe=move]:translate-y-[calc(var(--swipe-end-y)*-1)] data-[side=left]:data-[swipe=move]:translate-x-[var(--swipe-end-x)] data-[side=right]:data-[swipe=move]:translate-x-[calc(var(--swipe-end-x)*-1)] data-[side=top]:data-[swipe=move]:translate-y-[var(--swipe-end-y)]",
      className,
    )}
    {...props}
  />
))
ToastViewport.displayName = ToastPrimitive.Viewport.displayName

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Root>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Root
    ref={ref}
    className={cn(
      "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-4 pr-8 shadow-lg transition-opacity data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-80 data-[state=open]:slide-in-from-bottom-10 data-[state=closed]:slide-out-to-bottom-10 bg-gray-800 text-white border-gray-700",
      className,
    )}
    {...props}
  />
))
Toast.displayName = ToastPrimitive.Root.displayName

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Title
    ref={ref}
    className={cn(
      "text-sm font-semibold text-white [&[data-state=closed]]:animate-fade-out [&[data-state=open]]:animate-fade-in",
      className,
    )}
    {...props}
  />
))
ToastTitle.displayName = ToastPrimitive.Title.displayName

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Description
    ref={ref}
    className={cn(
      "text-sm text-gray-200 [&[data-state=closed]]:animate-fade-out [&[data-state=open]]:animate-fade-in",
      className,
    )}
    {...props}
  />
))
ToastDescription.displayName = ToastPrimitive.Description.displayName

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Close
    ref={ref}
    className={cn(
      "absolute right-2 top-2 rounded-md opacity-0 transition-opacity hover:bg-gray-700 focus:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-600 focus:ring-offset-2 focus:ring-offset-gray-800 data-[state=open]:opacity-100 group-hover:opacity-100 text-gray-300",
      className,
    )}
    {...props}
  />
))
ToastClose.displayName = ToastPrimitive.Close.displayName

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Action
    ref={ref}
    className={cn(
      "inline-flex h-8 items-center justify-center rounded-md bg-gray-700 px-3 text-sm font-medium text-white transition-colors hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-600 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:pointer-events-none",
      className,
    )}
    {...props}
  />
))
ToastAction.displayName = ToastPrimitive.Action.displayName

export { ToastProvider, Toast, ToastTitle, ToastDescription, ToastClose, ToastAction, ToastViewport }
