'use client'

import React, { useState } from 'react'
import { ArrowRightLeft, X } from 'lucide-react'
import { toast } from 'sonner'
import { createWriteClient } from '@/lib/supabase'
import { useTheme } from '@/lib/theme'
import { friendlyError } from '@/lib/errors'

interface TransferFundsButtonProps {
  userId: string
  accountBalance: number
  currency: string
  onTransferred: () => void
}

export default function TransferFundsButton({
  userId,
  accountBalance,
  currency,
  onTransferred,
}: TransferFundsButtonProps): React.JSX.Element {
  const { theme } = useTheme()
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const currencySymbol = currency === 'INR' ? '₹' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency
  const inp = theme.input

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const amt = parseFloat(amount)
    if (isNaN(amt) || amt <= 0) { setError('Please enter a valid amount greater than zero.'); return }
    if (amt > accountBalance) { setError('Amount exceeds your current Account Balance.'); return }

    setLoading(true)
    setError(null)

    try {
      const supabase = createWriteClient()

      const { error: txError } = await supabase.from('transactions').insert({
        user_id: userId,
        amount: amt,
        date: new Date().toISOString().split('T')[0],
        merchant: 'Transfer to Savings',
        description: 'Manual transfer to Total Savings',
        source: 'manual',
        is_income: false,
        category_id: null,
      })
      if (txError) throw txError

      const { data: profile, error: readErr } = await supabase
        .from('profiles')
        .select('current_savings')
        .eq('id', userId)
        .single()
      if (readErr) throw readErr

      const newSavings = (profile?.current_savings ?? 0) + amt
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ current_savings: newSavings })
        .eq('id', userId)
      if (profileError) throw profileError

      setAmount('')
      setOpen(false)
      toast.success(`${currencySymbol}${amt.toLocaleString('en-IN')} transferred to Total Savings!`)
      onTransferred()
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl transition-colors"
        style={{ background: theme.accent, color: theme.btn.primary.text }}
      >
        <ArrowRightLeft className="w-4 h-4" />
        Transfer to Savings
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div
            className="rounded-2xl shadow-2xl w-full max-w-md p-6"
            style={{ background: theme.card.bg, border: `1px solid ${theme.card.border}` }}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold" style={{ color: theme.text.primary }}>
                  Transfer to Total Savings
                </h2>
                <p className="text-sm mt-0.5" style={{ color: theme.text.muted }}>
                  Moves funds from Account Balance → Total Savings
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-2 rounded-lg transition-colors"
                style={{ color: theme.text.muted }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div
              className="rounded-xl px-4 py-3 mb-5 text-sm"
              style={{ background: theme.accentBg, color: theme.text.secondary }}
            >
              Available Account Balance:{' '}
              <span className="font-semibold" style={{ color: theme.text.primary }}>
                {currencySymbol}{accountBalance.toLocaleString('en-IN')}
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: theme.text.secondary }}>
                  Transfer Amount
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: theme.text.muted }}>
                    {currencySymbol}
                  </span>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    max={accountBalance}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    autoFocus
                    className="w-full pl-7 pr-3 py-2.5 rounded-xl text-sm focus:outline-none"
                    style={{ background: inp.bg, border: `1px solid ${inp.border}`, color: inp.text }}
                    placeholder="e.g. 50000"
                  />
                </div>
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
                  onClick={() => { setOpen(false); setError(null); setAmount('') }}
                  className="flex-1 py-2.5 text-sm font-medium rounded-xl transition-colors"
                  style={{ background: 'transparent', border: `1px solid ${theme.card.border}`, color: theme.text.secondary }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
                  style={{ background: theme.accent, color: theme.btn.primary.text }}
                >
                  {loading ? 'Transferring...' : 'Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
