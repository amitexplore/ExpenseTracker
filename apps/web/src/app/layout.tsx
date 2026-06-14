import React from 'react'
import type { Metadata } from 'next'
import { Toaster } from 'sonner'
import './globals.css'

export const metadata: Metadata = {
  title: 'ExpenseTracker — Personal Finance Dashboard',
  description: 'Track your expenses, monitor savings goals, and auto-import from Blinkit, Zepto, and Amazon.',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        {children}
        <Toaster
          position="bottom-right"
          richColors
          closeButton
          toastOptions={{ duration: 4000 }}
        />
      </body>
    </html>
  )
}
