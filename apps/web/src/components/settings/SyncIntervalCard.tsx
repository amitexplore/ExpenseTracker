'use client'

import { useState } from 'react'
import { Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { SYNC_INTERVAL_OPTIONS } from '@tracker/core'
import type { Profile } from '@tracker/db'

interface SyncIntervalCardProps {
  profile: Profile | null
  userId: string
}

export default function SyncIntervalCard({ profile, userId }: SyncIntervalCardProps) {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const supabase = createClient()

  async function handleChange(value: number) {
    setLoading(true)
    setSuccess(false)
    await supabase
      .from('profiles')
      .update({ sync_interval_minutes: value })
      .eq('id', userId)
    setSuccess(true)
    setLoading(false)
    setTimeout(() => setSuccess(false), 2000)
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-5 h-5 text-blue-500" />
        <h2 className="text-base font-semibold text-gray-900">Auto-sync Interval</h2>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        How often should we check your Gmail for new orders, even when the app is closed.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {SYNC_INTERVAL_OPTIONS.map((opt) => {
          const active = (profile?.sync_interval_minutes ?? 60) === opt.value
          return (
            <button
              key={opt.value}
              onClick={() => handleChange(opt.value)}
              disabled={loading}
              className={`px-3 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                active
                  ? 'border-brand-500 bg-brand-50 text-brand-700'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {opt.label}
            </button>
          )
        })}
      </div>

      {success && (
        <p className="text-xs text-brand-600 mt-3">Sync interval updated!</p>
      )}
    </div>
  )
}
