'use client'

import React from 'react'

import { useState } from 'react'
import { Gift, X } from 'lucide-react'
import { toast } from 'sonner'
import { createWriteClient } from '@/lib/supabase'
import { useTheme } from '@/lib/theme'
import { friendlyError } from '@/lib/errors'

interface AddBonusButtonProps {
  userId: string
  onAdded: () => void
}

export default function AddBonusButton({ userId, onAdded }: AddBonusButtonProps): React.JSX.Element {
  const { theme } = useTheme()
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsed = parseFloat(amount)
    if (!amount || isNaN(parsed) || parsed <= 0) {
      setError('Please enter a valid amount greater than zero.')
      return
    }
    setLoading(true)
    setError(null)

    try {
      const supabase = createWriteClient()

      const { data: categories } = await supabase
        .from('expense_categories')
        .select('id')
        .eq('user_id', userId)
        .eq('name', 'Bonus')
        .single()

      const { error: dbError } = await supabase.from('transactions').insert({
        user_id: userId,
        amount: parsed,
        date,
        merchant: 'Bonus',
        description: description || 'Bonus income',
        source: 'manual',
        category_id: categories?.id ?? null,
        is_income: true,
      })

      if (dbError) throw dbError

      setAmount('')
      setDescription('')
      setDate(new Date().toISOString().split('T')[0])
      setOpen(false)
      toast.success('Bonus logged successfully!')
      onAdded()
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setLoading(false)
    }
  }

  const inp = theme.input

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl transition-colors"
        style={{ background: theme.savingsAccent + '22', color: theme.savingsAccent, border: `1px solid ${theme.savingsAccent}44` }}
      >
        <Gift className="w-4 h-4" />
        Log Bonus
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div
            className="rounded-2xl shadow-2xl w-full max-w-md p-6"
            style={{ background: theme.card.bg, border: `1px solid ${theme.card.border}` }}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold" style={{ color: theme.text.primary }}>Log a Bonus</h2>
                <p className="text-sm mt-0.5" style={{ color: theme.text.muted }}>Added as income to your monthly balance</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-2 rounded-lg transition-colors"
                style={{ color: theme.text.muted }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: theme.text.secondary }}>
                  Bonus Amount
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: theme.text.muted }}>₹</span>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    autoFocus
                    className="w-full pl-7 pr-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2"
                    style={{
                      background: inp.bg,
                      border: `1px solid ${inp.border}`,
                      color: inp.text,
                      // @ts-ignore
                      '--tw-ring-color': theme.savingsAccent,
                    }}
                    placeholder="e.g. 100000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: theme.text.secondary }}>
                  Description (optional)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none"
                  style={{ background: inp.bg, border: `1px solid ${inp.border}`, color: inp.text }}
                  placeholder="e.g. Annual performance bonus"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: theme.text.secondary }}>
                  Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none"
                  style={{ background: inp.bg, border: `1px solid ${inp.border}`, color: inp.text }}
                />
              </div>

              {error && (
                <p
                  className="text-sm px-3 py-2 rounded-lg"
                  style={{ color: theme.negative, background: theme.negative + '18' }}
                >
                  {error}
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 py-2.5 text-sm font-medium rounded-xl transition-colors"
                  style={{ background: 'transparent', border: `1px solid ${theme.card.border}`, color: theme.text.secondary }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
                  style={{ background: theme.savingsAccent, color: theme.btn.primary.text }}
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
