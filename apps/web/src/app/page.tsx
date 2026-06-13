import React from 'react'
import { redirect } from 'next/navigation'

export default function HomePage(): React.JSX.Element {
  redirect('/dashboard')
}
