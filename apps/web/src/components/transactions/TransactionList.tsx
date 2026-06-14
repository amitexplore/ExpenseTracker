'use client'

import React from 'react'

import { useState } from 'react'
import { toast } from 'sonner'
import { formatCurrency } from '@tracker/core'
import { format } from 'date-fns'
import { Mail, PenLine, Smartphone, Pencil, Trash2, X, Check } from 'lucide-react'
import { createWriteClient } from '@/lib/supabase'
import { friendlyError } from '@/lib/errors'
import type { Transaction } from '@tracker/db'

type TransactionWithCategory = Transaction & {
  expense_categories: { name: string; color: string; type: string; icon: string | null } | null
}

const SOURCE_ICONS = {
  gmail: Mail,
  manual: PenLine,
  bank_sms: Smartphone,
}

interface TransactionListProps {
  transactions: TransactionWithCategory[]
  currency: string
  onChanged?: () => void
}

function EditInlineForm({
  tx,
  currency,
  onSave,
  onCancel,
}: {
  tx: TransactionWithCategory
  currency: string
  onSave: () => void
  onCancel: () => void
}) {
  const [amount, setAmount] = useState(String(tx.amount))
  const [description, setDescription] = useState(tx.description ?? '')
  const [date, setDate] = useState(tx.date)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    if (!amount || parseFloat(amount) <= 0) { setError('Invalid amount'); return }
    setSaving(true)
    const supabase = createWriteClient()
    const { error: dbError } = await supabase
      .from('transactions')
      .update({ amount: parseFloat(amount), description, date })
      .eq('id', tx.id)
    if (dbError) { setError(dbError.message); setSaving(false); return }
    // Snapshot recomputed automatically by DB trigger
    setSaving(false)
    onSave()
  }

  return (
    <div className="flex flex-col gap-2 py-3 px-1 bg-amber-50 rounded-xl border border-amber-200">
      <div className="flex gap-2 items-center flex-wrap">
        <div className="relative">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">₹</span>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-32 pl-5 pr-2 py-1.5 text-sm border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description"
          className="flex-1 min-w-[120px] px-2 py-1.5 text-sm border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="px-2 py-1.5 text-sm border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium rounded-lg disabled:opacity-50"
        >
          <Check className="w-3 h-3" /> {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          onClick={onCancel}
          className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-50"
        >
          <X className="w-3 h-3" /> Cancel
        </button>
      </div>
    </div>
  )
}

export default function TransactionList({ transactions, currency, onChanged }: TransactionListProps): React.JSX.Element {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleDelete(tx: TransactionWithCategory) {
    if (!confirm(`Delete "${tx.merchant || 'this transaction'}"?`)) return
    setDeletingId(tx.id)
    try {
      const supabase = createWriteClient()
      const { error } = await supabase.from('transactions').delete().eq('id', tx.id)
      if (error) throw error
      toast.success('Transaction deleted.')
      onChanged?.()
    } catch (err) {
      toast.error(friendlyError(err))
    } finally {
      setDeletingId(null)
    }
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p className="text-sm">No transactions yet</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-gray-50">
      {transactions.map((tx) => {
        const SourceIcon = SOURCE_ICONS[tx.source as keyof typeof SOURCE_ICONS] ?? PenLine
        const catColor = tx.expense_categories?.color ?? '#94a3b8'
        // Allow edit/delete for manually entered transactions (not read-only gmail imports)
        const isEditable = tx.source === 'manual'
        const isEditing = editingId === tx.id
        const isConfirmingDelete = deletingId === tx.id + '_confirm'

        return (
          <div key={tx.id} className="py-3 group">
            {isEditing ? (
              <EditInlineForm
                tx={tx}
                currency={currency}
                onSave={() => { setEditingId(null); onChanged?.() }}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <div className="flex items-center gap-4">
                {/* Category dot */}
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: catColor + '20' }}
                >
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: catColor }} />
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {tx.merchant ?? tx.description ?? 'Unknown'}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-400">
                      {format(new Date(tx.date), 'dd MMM yyyy')}
                    </span>
                    {tx.expense_categories && (
                      <span className="text-xs px-1.5 py-0.5 rounded-md text-gray-500 bg-gray-100">
                        {tx.expense_categories.name}
                      </span>
                    )}
                    <SourceIcon className="w-3 h-3 text-gray-300" />
                  </div>
                </div>

                {/* Amount + actions */}
                <div className="flex items-center gap-2">
                  {/* Edit/Delete shown for all manually entered transactions */}
                  {isEditable && (
                    <div className="hidden group-hover:flex items-center gap-1">
                      {isConfirmingDelete ? (
                        <>
                          <span className="text-xs text-red-600 mr-1">Delete?</span>
                          <button
                            onClick={() => handleDelete(tx)}
                            className="text-xs px-2 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600"
                          >Yes</button>
                          <button
                            onClick={() => setDeletingId(null)}
                            className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
                          >No</button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => setEditingId(tx.id)}
                            title="Edit"
                            className="p-1.5 rounded-lg hover:bg-amber-50 text-gray-400 hover:text-amber-600 transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingId(tx.id + '_confirm')}
                            title="Delete"
                            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  <p className={`text-sm font-semibold tabular-nums ${tx.is_income ? 'text-brand-600' : 'text-red-500'}`}>
                    {tx.is_income ? '+' : '-'}{formatCurrency(tx.amount, currency)}
                  </p>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
