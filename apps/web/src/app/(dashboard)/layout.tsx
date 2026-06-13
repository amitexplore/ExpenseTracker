import React from 'react'
import ClientLayout from './ClientLayout'

export default function DashboardLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <ClientLayout>{children}</ClientLayout>
}
