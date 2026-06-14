import React from 'react'

export default function AuthLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-brand-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md" style={{ animation: 'page-enter 0.35s ease-out both' }}>
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-600 mb-4">
            <span className="text-white text-2xl font-bold">₹</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">ExpenseTracker</h1>
          <p className="text-gray-500 text-sm mt-1">Your personal finance dashboard</p>
        </div>
        {children}
      </div>
    </div>
  )
}
