'use client'

import React, { useState } from 'react'
import { Save } from 'lucide-react'
import { createWriteClient } from '@/lib/supabase'
import { useTheme } from '@/lib/theme'
import type { ExpenseCategory } from '@tracker/db'

interface CategoryBudgetsProps {
  categories: ExpenseCategory[]
  onChanged: () => void
}

export default function CategoryBudgets({ categories, onChanged }: CategoryBudgetsProps): React.JSX.Element {
  const { theme } = useTheme()

  // Only show variable/fixed categories that make sense to budget
  const budgetable = categories.filter((c) => c.type === 'variable' || c.type === 'fixed')

  const [budgets, setBudgets] = useState<Record<string, string>>(
    Object.fromEntries(budgetable.map((c) => [c.id, c.monthly_budget != null ? String(c.monthly_budget) : '']))
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setSaving(true)
    setError(null)
    const supabase = createWriteClient()

    const updates = budgetable.map((c) => {
      const raw = budgets[c.id]
      const val = raw.trim() === '' ? null : parseFloat(raw)
      return supabase
        .from('expense_categories')
        .update({ monthly_budget: val })
        .eq('id', c.id)
    })

    const results = await Promise.all(updates)
    const failed  = results.find((r) => r.error)
    if (failed?.error) {
      setError(failed.error.message)
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      onChanged()
    }
    setSaving(false)
  }

  const inp = theme.input

  return (
    <div
      className="rounded-2xl p-6"
      style={{ background: theme.card.bg, border: `1px solid ${theme.card.border}` }}
    >
      <div className="mb-5">
        <h2 className="text-base font-semibold" style={{ color: theme.text.primary }}>Monthly Budget Limits</h2>
        <p className="text-sm mt-1" style={{ color: theme.text.muted }}>
          Set a spending cap per category. The spending breakdown on your dashboard will show a warning when you approach the limit.
        </p>
      </div>

      {budgetable.length === 0 ? (
        <p className="text-sm" style={{ color: theme.text.muted }}>No categories found. Add transactions to create categories.</p>
      ) : (
        <div className="space-y-3">
          {budgetable.map((cat) => (
            <div key={cat.id} className="flex items-center gap-4">
              <div className="flex items-center gap-2 w-40 flex-shrink-0">
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: cat.color }} />
                <span className="text-sm font-medium truncate" style={{ color: theme.text.primary }}>{cat.name}</span>
              </div>
              <div className="relative flex-1 max-w-xs">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: theme.text.muted }}>₹</span>
                <input
                  type="number"
                  min="0"
                  step="500"
                  value={budgets[cat.id]}
                  onChange={(e) => setBudgets({ ...budgets, [cat.id]: e.target.value })}
                  className="w-full pl-7 pr-3 py-2 rounded-xl text-sm focus:outline-none"
                  style={{ background: inp.bg, border: `1px solid ${inp.border}`, color: inp.text }}
                  placeholder="No limit"
                />
              </div>
              {budgets[cat.id] && (
                <button
                  onClick={() => setBudgets({ ...budgets, [cat.id]: '' })}
                  className="text-xs px-2 py-1 rounded-lg"
                  style={{ color: theme.text.muted, border: `1px solid ${theme.card.border}` }}
                >
                  Clear
                </button>
              )}
            </div>
          ))}

          {error && (
            <p className="text-sm px-3 py-2 rounded-lg" style={{ color: theme.negative, background: theme.negative + '18' }}>
              {error}
            </p>
          )}

          <div className="pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-xl disabled:opacity-50 transition-colors"
              style={{ background: saved ? theme.positive : theme.accent, color: theme.btn.primary.text }}
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Budget Limits'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
