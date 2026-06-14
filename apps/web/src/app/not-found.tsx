import React from 'react'
import Link from 'next/link'
import { Compass } from 'lucide-react'

export default function NotFound(): React.JSX.Element {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-10 max-w-md w-full text-center">
        <div className="w-14 h-14 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-5">
          <Compass className="w-7 h-7 text-brand-500" />
        </div>
        <p className="text-5xl font-bold text-gray-200 mb-3">404</p>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Page not found</h1>
        <p className="text-sm text-gray-500 mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-xl transition-colors"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  )
}
