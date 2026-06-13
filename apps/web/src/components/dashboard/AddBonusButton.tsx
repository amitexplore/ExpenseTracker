'use client'

import React from 'react'

import { useState } from 'react'
import { Gift, X } from 'lucide-react'
import { createWriteClient } from '@/lib/supabase'

interface AddBonusButtonProps {
  userId: string
  onAdded: () => void
}

export default function AddBonusButton({ userId, onAdded }: AddBonusButtonProps): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount')
      return
    }
    setLoading(true)
    setError(null)

                const supabase = createWriteClient()

    // Find the Bonus category
    const { data: categories } = await supabase
      .from('expense_categories')
      .select('id')
      .eq('user_id', userId)
      .eq('name', 'Bonus')
      .single()

    const { error: dbError } = await supabase.from('transactions').insert({
      user_id: userId,
      amount: parseFloat(amount),
      date,
      merchant: 'Bonus',
      description: description || 'Bonus income',
      source: 'manual',
      category_id: categories?.id ?? null,
      is_income: true,
    })

    if (dbError) {
      setError(dbError.message)
      setLoading(false)
      return
    }

    // Snapshot is recomputed automatically by DB trigger on transaction insert
    setAmount('')
    setDescription('')
    setDate(new Date().toISOString().split('T')[0])
    setOpen(false)
    setLoading(false)
    onAdded()
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-xl transition-colors"
      >
        <Gift className="w-4 h-4" />
        Log Bonus
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Log a Bonus</h2>
                <p className="text-sm text-gray-400 mt-0.5">Added as income to your monthly balance</p>
              </div>
              <button onClick={() => setOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bonus Amount (₹)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    autoFocus
                    className="w-full pl-7 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                    placeholder="e.g. 100000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  placeholder="e.g. Annual performance bonus"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>

              {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Add Bonus'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
