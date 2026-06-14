'use client'

import React, { useEffect } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: ErrorProps): React.JSX.Element {
  useEffect(() => {
    // Log to server-side monitoring in production
    console.error('[GlobalError]', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-10 max-w-md w-full text-center">
        <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5">
          <AlertTriangle className="w-7 h-7 text-red-500" />
        </div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Something went wrong</h1>
        <p className="text-sm text-gray-500 mb-8">
          An unexpected error occurred. Your data is safe — this is just a display issue.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-xl transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Try again
          </button>
          <a
            href="/dashboard"
            className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
          >
            <Home className="w-4 h-4" />
            Go home
          </a>
        </div>
      </div>
    </div>
  )
}
