'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import type { Profile } from '@tracker/db'
import { CURRENCY_OPTIONS } from '@tracker/core'
import { DollarSign, Target } from 'lucide-react'

interface ProfileFormProps {
  profile: Profile | null
  userId: string
}

export default function ProfileForm({ profile, userId }: ProfileFormProps) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    const form = new FormData(e.currentTarget)
    const updates = {
      monthly_salary: parseFloat(form.get('monthly_salary') as string),
      target_amount: parseFloat(form.get('target_amount') as string),
      target_date: (form.get('target_date') as string) || null,
      currency: form.get('currency') as string,
    }

    const { error: dbError } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)

    if (dbError) {
      setError(dbError.message)
    } else {
      setSuccess(true)
    }
    setLoading(false)
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <div className="flex items-center gap-2 mb-5">
        <DollarSign className="w-5 h-5 text-brand-600" />
        <h2 className="text-base font-semibold text-gray-900">Income & Savings Target</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Monthly Salary
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
              <input
                name="monthly_salary"
                type="number"
                step="1"
                min="0"
                defaultValue={profile?.monthly_salary ?? ''}
                required
                className="w-full pl-7 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="500000"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
            <select
              name="currency"
              defaultValue={profile?.currency ?? 'INR'}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {CURRENCY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <div className="flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5" /> Savings Target Amount
              </div>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
              <input
                name="target_amount"
                type="number"
                step="1"
                min="0"
                defaultValue={profile?.target_amount ?? ''}
                required
                className="w-full pl-7 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="4000000"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Target Date</label>
            <input
              name="target_date"
              type="date"
              defaultValue={profile?.target_date ?? ''}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
        {success && <p className="text-sm text-brand-600 bg-brand-50 px-3 py-2 rounded-lg">Saved successfully!</p>}

        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  )
}
