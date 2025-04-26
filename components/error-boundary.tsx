"use client"

import { Component, type ErrorInfo, type ReactNode } from "react"
import { AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error, errorInfo: null }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo)
    this.setState({
      error,
      errorInfo,
    })
  }

  private handleReload = () => {
    window.location.reload()
  }

  private handleGoHome = () => {
    window.location.href = "/"
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-red-100 p-3 rounded-full">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-center mb-2">Something went wrong</h2>

            {this.state.error && (
              <div className="bg-gray-100 p-3 rounded-md mb-4 overflow-auto max-h-40">
                <p className="text-sm font-mono text-gray-800">{this.state.error.toString()}</p>
              </div>
            )}

            <p className="text-gray-600 mb-6 text-center">
              We're sorry for the inconvenience. Please try refreshing the page or going back to the home page.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={this.handleReload} className="flex-1 flex items-center justify-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Refresh Page
              </Button>
              <Button
                onClick={this.handleGoHome}
                variant="outline"
                className="flex-1 flex items-center justify-center gap-2"
              >
                Go to Home Page
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
