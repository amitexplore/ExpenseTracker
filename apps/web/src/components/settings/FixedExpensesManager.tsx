'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Home } from 'lucide-react'
import { formatINR } from '@tracker/core'
import type { FixedExpense } from '@tracker/db'

type FixedExpenseWithCategory = FixedExpense & {
  expense_categories: { name: string; color: string } | null
}

interface FixedExpensesManagerProps {
  fixedExpenses: FixedExpenseWithCategory[]
  categories: { id: string; name: string; color: string; type: string }[]
  userId: string
}

export default function FixedExpensesManager({
  fixedExpenses, categories, userId,
}: FixedExpensesManagerProps) {
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const fixedCategories = categories.filter((c) => c.type === 'fixed' || c.type === 'savings')

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const form = new FormData(e.currentTarget)
    const { error: dbError } = await supabase.from('fixed_expenses').insert({
      user_id: userId,
      category_id: form.get('category_id') as string,
      name: form.get('name') as string,
      amount: parseFloat(form.get('amount') as string),
      frequency: form.get('frequency') as 'monthly' | 'yearly' | 'one_time',
      active_from: form.get('active_from') as string,
      active_to: (form.get('active_to') as string) || null,
    })

    if (dbError) {
      setError(dbError.message)
    } else {
      setShowForm(false)
      router.refresh()
    }
    setLoading(false)
  }

  async function handleDelete(id: string) {
    await supabase.from('fixed_expenses').delete().eq('id', id)
    router.refresh()
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Home className="w-5 h-5 text-orange-500" />
          <h2 className="text-base font-semibold text-gray-900">Fixed Monthly Expenses</h2>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-brand-600 hover:bg-brand-50 rounded-lg transition-colors font-medium"
        >
          <Plus className="w-4 h-4" />
          Add
        </button>
      </div>

      {/* Existing list */}
      <div className="space-y-2 mb-4">
        {fixedExpenses.length === 0 && !showForm && (
          <p className="text-sm text-gray-400 py-4 text-center">
            No fixed expenses yet. Add your Home Loan, RD, School Fees, etc.
          </p>
        )}
        {fixedExpenses.map((fe) => (
          <div key={fe.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <div
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: fe.expense_categories?.color ?? '#94a3b8' }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">{fe.name}</p>
              <p className="text-xs text-gray-400">
                {fe.expense_categories?.name} · {fe.frequency}
              </p>
            </div>
            <p className="text-sm font-semibold text-red-600 tabular-nums">
              {formatINR(fe.amount)}
            </p>
            <button
              onClick={() => handleDelete(fe.id)}
              className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Add form */}
      {showForm && (
        <form onSubmit={handleAdd} className="border border-dashed border-gray-200 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
              <input
                name="name"
                required
                placeholder="Home Loan EMI"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Amount (₹)</label>
              <input
                name="amount"
                type="number"
                step="1"
                min="1"
                required
                placeholder="155000"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
              <select
                name="category_id"
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {fixedCategories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Frequency</label>
              <select
                name="frequency"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
                <option value="one_time">One-time</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Active from</label>
              <input
                name="active_from"
                type="date"
                required
                defaultValue={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Active until (optional)</label>
              <input
                name="active_to"
                type="date"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="flex-1 py-2 border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 bg-brand-600 text-white text-sm rounded-lg hover:bg-brand-700 disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Expense'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
