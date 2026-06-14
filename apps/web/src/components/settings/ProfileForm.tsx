'use client'

import React from 'react'

import { useState } from 'react'
import { toast } from 'sonner'
import { createWriteClient } from '@/lib/supabase'
import type { Profile } from '@tracker/db'
import { CURRENCY_OPTIONS } from '@tracker/core'
import { DollarSign, Target } from 'lucide-react'
import { friendlyError } from '@/lib/errors'

interface ProfileFormProps {
  profile: Profile | null
  userId: string
  onChanged?: () => void
}

export default function ProfileForm({ profile, userId, onChanged }: ProfileFormProps): React.JSX.Element {
  const supabase = createWriteClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const form = new FormData(e.currentTarget)

      const salary = parseFloat(form.get('monthly_salary') as string)
      const targetAmount = parseFloat(form.get('target_amount') as string)
      if (isNaN(salary) || salary < 0) throw new Error('Please enter a valid monthly salary.')
      if (isNaN(targetAmount) || targetAmount < 0) throw new Error('Please enter a valid savings target.')

      const updates = {
        monthly_salary: salary,
        account_balance_start: Math.max(0, parseFloat(form.get('account_balance_start') as string) || 0),
        current_savings: Math.max(0, parseFloat(form.get('current_savings') as string) || 0),
        target_amount: targetAmount,
        target_date: (form.get('target_date') as string) || null,
        currency: form.get('currency') as string,
      }

      const { error: dbError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)

      if (dbError) throw dbError

      toast.success('Profile saved!')
      onChanged?.()
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setLoading(false)
    }
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Salary</label>
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

        {/* Account Balance Start */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Starting Account Balance
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
            <input
              name="account_balance_start"
              type="number"
              step="1"
              min="0"
              defaultValue={profile?.account_balance_start ?? ''}
              className="w-full pl-7 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="0"
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">The opening balance for your Account Balance tracker (e.g. amount in your salary account)</p>
        </div>

        {/* Total Savings */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Total Savings (savings pot)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
            <input
              name="current_savings"
              type="number"
              step="1"
              min="0"
              defaultValue={profile?.current_savings ?? ''}
              className="w-full pl-7 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="1899000"
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">Your dedicated savings — separate from Account Balance. Transfer from dashboard to grow this.</p>
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
