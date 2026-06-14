'use client'

import React, { useEffect, useState } from 'react'
import { Plus, Edit2, Trash2, X, Target } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@tracker/core'
import { format } from 'date-fns'
import { createClient } from '@/lib/supabase'
import { createWriteClient } from '@/lib/supabase'
import { useTheme } from '@/lib/theme'
import { friendlyError } from '@/lib/errors'
import type { SavingsGoal } from '@tracker/db'

interface SavingsGoalsListProps {
  userId: string
  currency: string
}

const PRESET_COLORS = [
  '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b',
  '#ef4444', '#06b6d4', '#ec4899', '#84cc16',
  '#f97316', '#a78bfa', '#6ee7b7', '#fbbf24',
]

function GoalRing({ pct, color, size = 64 }: { pct: number; color: string; size?: number }) {
  const r = size / 2 - 6
  const cx = size / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (Math.min(pct, 100) / 100) * circ
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0">
      <circle cx={cx} cy={cx} r={r} fill="none" stroke={color + '22'} strokeWidth={5} />
      <circle
        cx={cx} cy={cx} r={r}
        fill="none" stroke={color} strokeWidth={5}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cx})`}
        style={{ transition: 'stroke-dashoffset .5s ease' }}
      />
      <text x={cx} y={cx + 4} textAnchor="middle" fontSize={size > 56 ? 11 : 9} fontWeight={700} fill={color}>
        {Math.min(Math.round(pct), 100)}%
      </text>
    </svg>
  )
}

type GoalForm = {
  name: string
  target_amount: string
  current_amount: string
  target_date: string
  color: string
}

const EMPTY_FORM: GoalForm = { name: '', target_amount: '', current_amount: '0', target_date: '', color: PRESET_COLORS[0] }

export default function SavingsGoalsList({ userId, currency }: SavingsGoalsListProps): React.JSX.Element {
  const { theme } = useTheme()
  const [goals, setGoals] = useState<SavingsGoal[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editGoal, setEditGoal] = useState<SavingsGoal | null>(null)
  const [form, setForm] = useState<GoalForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function loadGoals() {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('savings_goals')
        .select('*')
        .eq('user_id', userId)
        .order('sort_order')
        .order('created_at')
      if (error) throw error
      setGoals((data ?? []) as SavingsGoal[])
    } catch (err) {
      toast.error(friendlyError(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (userId) loadGoals() }, [userId])

  function openAdd() {
    setEditGoal(null)
    setForm(EMPTY_FORM)
    setError(null)
    setModalOpen(true)
  }

  function openEdit(g: SavingsGoal) {
    setEditGoal(g)
    setForm({
      name: g.name,
      target_amount: String(g.target_amount),
      current_amount: String(g.current_amount),
      target_date: g.target_date ?? '',
      color: g.color,
    })
    setError(null)
    setModalOpen(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const target = parseFloat(form.target_amount)
    const current = parseFloat(form.current_amount) || 0
    if (!form.name.trim() || !target || target <= 0) {
      setError('Name and target amount are required')
      return
    }
    setSaving(true)
    setError(null)
    const supabase = createWriteClient()

    try {
      if (editGoal) {
        const { error: err } = await supabase
          .from('savings_goals')
          .update({
            name: form.name.trim(),
            target_amount: target,
            current_amount: current,
            target_date: form.target_date || null,
            color: form.color,
          })
          .eq('id', editGoal.id)
        if (err) throw err
        toast.success('Goal updated!')
      } else {
        const { error: err } = await supabase
          .from('savings_goals')
          .insert({
            user_id: userId,
            name: form.name.trim(),
            target_amount: target,
            current_amount: current,
            target_date: form.target_date || null,
            color: form.color,
            sort_order: goals.length,
          })
        if (err) throw err
        toast.success('New savings goal created!')
      }
      setModalOpen(false)
      loadGoals()
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this savings goal? This cannot be undone.')) return
    try {
      const supabase = createWriteClient()
      const { error } = await supabase.from('savings_goals').delete().eq('id', id)
      if (error) throw error
      toast.success('Goal deleted.')
      loadGoals()
    } catch (err) {
      toast.error(friendlyError(err))
    }
  }

  const inp = theme.input

  return (
    <>
      <div
        className="rounded-2xl p-6"
        style={{ background: theme.card.bg, border: `1px solid ${theme.card.border}` }}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-semibold" style={{ color: theme.text.primary }}>
              Additional Goals
            </h2>
            <p className="text-sm" style={{ color: theme.text.muted }}>
              Track multiple savings targets independently
            </p>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors"
            style={{ background: theme.accentBg, color: theme.accent, border: `1px solid ${theme.accent}33` }}
          >
            <Plus className="w-4 h-4" /> Add Goal
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-6">
            <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: theme.accent, borderTopColor: 'transparent' }} />
          </div>
        ) : goals.length === 0 ? (
          <div
            className="rounded-xl p-6 text-center"
            style={{ background: theme.accentBg, border: `1px dashed ${theme.card.border}` }}
          >
            <Target className="w-8 h-8 mx-auto mb-2" style={{ color: theme.text.muted }} />
            <p className="text-sm font-medium" style={{ color: theme.text.secondary }}>No additional goals yet</p>
            <p className="text-xs mt-1" style={{ color: theme.text.muted }}>Add goals like "Emergency Fund", "Vacation", "Car"</p>
          </div>
        ) : (
          <div className="space-y-3">
            {goals.map((g) => {
              const pct = g.target_amount > 0 ? (g.current_amount / g.target_amount) * 100 : 0
              const remaining = Math.max(0, g.target_amount - g.current_amount)
              return (
                <div
                  key={g.id}
                  className="flex items-center gap-4 rounded-xl p-4"
                  style={{ background: g.color + '0d', border: `1px solid ${g.color}33` }}
                >
                  <GoalRing pct={pct} color={g.color} size={60} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold truncate" style={{ color: theme.text.primary }}>{g.name}</p>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => openEdit(g)} className="p-1.5 rounded-lg transition-colors" style={{ color: theme.text.muted }} title="Edit">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(g.id)} className="p-1.5 rounded-lg transition-colors" style={{ color: theme.negative + 'aa' }} title="Delete">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-1 flex-wrap">
                      <span className="text-xs" style={{ color: theme.text.muted }}>
                        <span style={{ color: g.color, fontWeight: 600 }}>{formatCurrency(g.current_amount, currency)}</span>
                        {' / '}{formatCurrency(g.target_amount, currency)}
                      </span>
                      {remaining > 0 && (
                        <span className="text-xs" style={{ color: theme.text.muted }}>
                          {formatCurrency(remaining, currency)} remaining
                        </span>
                      )}
                      {g.target_date && (
                        <span className="text-xs" style={{ color: theme.text.muted }}>
                          by {format(new Date(g.target_date), 'MMM yyyy')}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 rounded-full h-1.5" style={{ background: theme.ring.track }}>
                      <div
                        className="h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(pct, 100)}%`, background: g.color }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add / Edit modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div
            className="rounded-2xl shadow-2xl w-full max-w-md p-6"
            style={{ background: theme.card.bg, border: `1px solid ${theme.card.border}` }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold" style={{ color: theme.text.primary }}>
                {editGoal ? 'Edit Goal' : 'New Savings Goal'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="p-2 rounded-lg" style={{ color: theme.text.muted }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: theme.text.secondary }}>Goal Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required autoFocus
                  className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none"
                  style={{ background: inp.bg, border: `1px solid ${inp.border}`, color: inp.text }}
                  placeholder="e.g. Emergency Fund, Vacation, Car"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: theme.text.secondary }}>Target Amount</label>
                  <input
                    type="number" min="1" step="1000" value={form.target_amount}
                    onChange={(e) => setForm({ ...form, target_amount: e.target.value })}
                    required
                    className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none"
                    style={{ background: inp.bg, border: `1px solid ${inp.border}`, color: inp.text }}
                    placeholder="500000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: theme.text.secondary }}>Already Saved</label>
                  <input
                    type="number" min="0" step="1000" value={form.current_amount}
                    onChange={(e) => setForm({ ...form, current_amount: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none"
                    style={{ background: inp.bg, border: `1px solid ${inp.border}`, color: inp.text }}
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: theme.text.secondary }}>Target Date (optional)</label>
                <input
                  type="date" value={form.target_date}
                  onChange={(e) => setForm({ ...form, target_date: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none"
                  style={{ background: inp.bg, border: `1px solid ${inp.border}`, color: inp.text }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: theme.text.secondary }}>Colour</label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c} type="button"
                      onClick={() => setForm({ ...form, color: c })}
                      className="w-7 h-7 rounded-full transition-transform"
                      style={{
                        background: c,
                        transform: form.color === c ? 'scale(1.25)' : 'scale(1)',
                        boxShadow: form.color === c ? `0 0 0 2px ${theme.card.bg}, 0 0 0 4px ${c}` : 'none',
                      }}
                    />
                  ))}
                </div>
              </div>

              {error && (
                <p className="text-sm px-3 py-2 rounded-lg" style={{ color: theme.negative, background: theme.negative + '18' }}>
                  {error}
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button" onClick={() => setModalOpen(false)}
                  className="flex-1 py-2.5 text-sm font-medium rounded-xl"
                  style={{ background: 'transparent', border: `1px solid ${theme.card.border}`, color: theme.text.secondary }}
                >
                  Cancel
                </button>
                <button
                  type="submit" disabled={saving}
                  className="flex-1 py-2.5 text-sm font-medium rounded-xl disabled:opacity-50"
                  style={{ background: form.color, color: '#fff' }}
                >
                  {saving ? 'Saving…' : editGoal ? 'Save Changes' : 'Create Goal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
