'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function ConfirmPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    async function handleConfirm() {
      const code = searchParams.get('code')
      const supabase = createClient()

      if (code) {
        // Exchange code for session client-side (PKCE verifier is in localStorage)
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) {
          setErrorMsg(error.message)
          setStatus('error')
          return
        }
        router.replace('/dashboard')
        return
      }

      // Handle token-based (magic link) flow — tokens are in URL hash
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.replace('/dashboard')
        return
      }

      setErrorMsg('No confirmation code found. Please try signing up again.')
      setStatus('error')
    }

    handleConfirm()
  }, [searchParams, router])

  if (status === 'error') {
    return (
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center">
        <p className="text-red-600 text-sm">{errorMsg}</p>
        <a href="/signup" className="text-brand-600 text-sm mt-4 block hover:underline">
          Back to Sign up
        </a>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center">
      <div className="w-10 h-10 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
      <p className="text-gray-600 text-sm">Confirming your account...</p>
    </div>
  )
}
