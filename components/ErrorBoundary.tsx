"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"

interface Props {
  children: React.ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo)
    this.setState({ errorInfo })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
          <AlertCircle className="w-12 h-12 text-destructive mb-4" />
          <h2 className="text-2xl font-bold mb-2">Something went wrong</h2>
          <p className="text-muted-foreground mb-4">{this.state.error?.message || "An unexpected error occurred"}</p>
          <pre className="bg-gray-100 p-4 rounded-md mb-4 max-w-full overflow-x-auto text-left">
            <strong>Error Stack:</strong>
            {this.state.error?.stack}
          </pre>
          <pre className="bg-gray-100 p-4 rounded-md mb-4 max-w-full overflow-x-auto text-left">
            <strong>Component Stack:</strong>
            {this.state.errorInfo?.componentStack}
          </pre>
          <Button onClick={() => window.location.reload()}>Refresh Page</Button>
        </div>
      )
    }

    return this.props.children
  }
}

