import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ExpenseTracker — Personal Finance Dashboard',
  description: 'Track your expenses, monitor savings goals, and auto-import from Blinkit, Zepto, and Amazon.',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  )
}
