'use client'

import React, { useState } from 'react'
import { ArrowRightLeft, X } from 'lucide-react'
import { createWriteClient } from '@/lib/supabase'

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
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const currencySymbol = currency === 'INR' ? '₹' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) { setError('Enter a valid amount'); return }
    if (amt > accountBalance) { setError(`Cannot transfer more than your Account Balance`); return }

    setLoading(true)
    setError(null)
    const supabase = createWriteClient()

    // 1. Log as an expense transaction (reduces Account Balance)
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
    if (txError) { setError(txError.message); setLoading(false); return }

    // 2. Add the amount to current_savings (Total Savings pot)
    const { data: profile } = await supabase
      .from('profiles')
      .select('current_savings')
      .eq('id', userId)
      .single()

    const newSavings = (profile?.current_savings ?? 0) + amt
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ current_savings: newSavings })
      .eq('id', userId)

    if (profileError) { setError(profileError.message); setLoading(false); return }

    setAmount('')
    setOpen(false)
    setLoading(false)
    onTransferred()
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors"
      >
        <ArrowRightLeft className="w-4 h-4" />
        Transfer to Savings
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Transfer to Total Savings</h2>
                <p className="text-sm text-gray-400 mt-0.5">Moves funds from Account Balance → Total Savings</p>
              </div>
              <button onClick={() => setOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-gray-50 rounded-xl px-4 py-3 mb-5 text-sm text-gray-600">
              Available Account Balance: <span className="font-semibold text-gray-900">{currencySymbol}{accountBalance.toLocaleString('en-IN')}</span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Transfer Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{currencySymbol}</span>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    max={accountBalance}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    autoFocus
                    className="w-full pl-7 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    placeholder="e.g. 50000"
                  />
                </div>
              </div>

              {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setOpen(false); setError(null); setAmount('') }}
                  className="flex-1 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
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
