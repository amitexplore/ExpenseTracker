'use client'

import React, { useState, useMemo } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { formatCurrency } from '@tracker/core'
import type { Transaction, ExpenseCategory } from '@tracker/db'
import { useTheme } from '@/lib/theme'

interface SpendingBreakdownProps {
  transactions: Transaction[]
  categories: ExpenseCategory[]
  currency: string
  year: number
}

const UNCATEGORIZED_COLOR = '#94a3b8'

type CategorySpend = {
  id: string
  name: string
  color: string
  amount: number
  pct: number
  budget: number | null
  txCount: number
}

export default function SpendingBreakdown({ transactions, categories, currency, year }: SpendingBreakdownProps): React.JSX.Element {
  const { theme } = useTheme()
  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState(
    now.getFullYear() === year ? now.getMonth() + 1 : 1
  )

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

  // Memoised: re-compute only when transactions, categories, year or selectedMonth changes
  const { items, total } = useMemo(() => {
    const catMap = Object.fromEntries(categories.map((c) => [c.id, c]))
    const monthTx = transactions.filter((t) => {
      if (t.is_income) return false
      if (t.merchant === 'Transfer to Savings') return false
      const d = new Date(t.date)
      return d.getFullYear() === year && d.getMonth() + 1 === selectedMonth
    })

    const grouped: Record<string, { name: string; color: string; amount: number; budget: number | null; txCount: number }> = {}
    for (const tx of monthTx) {
      const key = tx.category_id ?? '__none__'
      const cat = tx.category_id ? catMap[tx.category_id] : null
      if (!grouped[key]) {
        grouped[key] = {
          name:    cat?.name  ?? 'Uncategorized',
          color:   cat?.color ?? UNCATEGORIZED_COLOR,
          amount:  0,
          budget:  (cat as ExpenseCategory | null)?.monthly_budget ?? null,
          txCount: 0,
        }
      }
      grouped[key].amount  += tx.amount
      grouped[key].txCount += 1
    }

    const t = Object.values(grouped).reduce((s, g) => s + g.amount, 0)
    const result: CategorySpend[] = Object.entries(grouped)
      .map(([id, g]) => ({ id, ...g, pct: t > 0 ? (g.amount / t) * 100 : 0 }))
      .sort((a, b) => b.amount - a.amount)
    return { items: result, total: t }
  }, [transactions, categories, year, selectedMonth])

  if (items.length === 0) {
    return (
      <div
        className="rounded-2xl p-6"
        style={{ background: theme.card.bg, border: `1px solid ${theme.card.border}` }}
      >
        <SectionHeader
          selectedMonth={selectedMonth}
          setSelectedMonth={setSelectedMonth}
          months={months}
          year={year}
        />
        <p className="text-sm mt-6 text-center" style={{ color: theme.text.muted }}>
          No expense transactions in {months[selectedMonth - 1]} {year}
        </p>
      </div>
    )
  }

  return (
    <div
      className="rounded-2xl p-6"
      style={{ background: theme.card.bg, border: `1px solid ${theme.card.border}` }}
    >
      <SectionHeader
        selectedMonth={selectedMonth}
        setSelectedMonth={setSelectedMonth}
        months={months}
        year={year}
      />

      <div className="flex flex-col md:flex-row gap-6 mt-4">
        {/* Donut chart */}
        <div className="flex flex-col items-center justify-center" style={{ minWidth: 180 }}>
          <ResponsiveContainer width={180} height={180}>
            <PieChart>
              <Pie
                data={items}
                cx="50%"
                cy="50%"
                innerRadius={54}
                outerRadius={82}
                dataKey="amount"
                paddingAngle={2}
                strokeWidth={0}
              >
                {items.map((item) => (
                  <Cell key={item.id} fill={item.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v: number) => formatCurrency(v, currency)}
                contentStyle={{
                  borderRadius: 10,
                  border: `1px solid ${theme.card.border}`,
                  background: theme.chart.tooltipBg,
                  color: theme.chart.tooltipText,
                  fontSize: 12,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <p className="text-xs mt-1" style={{ color: theme.text.muted }}>Total spend</p>
          <p className="text-base font-bold" style={{ color: theme.text.primary }}>
            {formatCurrency(total, currency)}
          </p>
        </div>

        {/* Category list */}
        <div className="flex-1 space-y-3 min-w-0">
          {items.map((item) => {
            const budgetPct = item.budget ? (item.amount / item.budget) * 100 : null
            const budgetColor =
              budgetPct === null ? null
              : budgetPct >= 100 ? theme.negative
              : budgetPct >= 80  ? '#f59e0b'
              : theme.positive

            return (
              <div key={item.id}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ background: item.color }}
                    />
                    <span className="text-sm font-medium truncate" style={{ color: theme.text.primary }}>
                      {item.name}
                    </span>
                    <span className="text-xs flex-shrink-0" style={{ color: theme.text.muted }}>
                      {item.txCount} tx
                    </span>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                    <span className="text-xs font-medium" style={{ color: theme.text.muted }}>
                      {item.pct.toFixed(1)}%
                    </span>
                    <span className="text-sm font-semibold tabular-nums" style={{ color: theme.text.primary }}>
                      {formatCurrency(item.amount, currency)}
                    </span>
                  </div>
                </div>

                {/* Progress bar row */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 rounded-full h-1.5" style={{ background: theme.ring.track }}>
                    <div
                      className="h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(item.pct, 100)}%`, background: item.color }}
                    />
                  </div>
                  {item.budget && (
                    <span className="text-xs flex-shrink-0" style={{ color: budgetColor ?? theme.text.muted }}>
                      Budget: {formatCurrency(item.budget, currency)}
                      {budgetPct !== null && (
                        <> · {budgetPct >= 100 ? '⚠ Over' : `${budgetPct.toFixed(0)}%`}</>
                      )}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function SectionHeader({
  selectedMonth, setSelectedMonth, months, year,
}: {
  selectedMonth: number
  setSelectedMonth: (m: number) => void
  months: string[]
  year: number
}) {
  const { theme } = useTheme()
  return (
    <div className="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h2 className="text-base font-semibold" style={{ color: theme.text.primary }}>
          Spending Breakdown
        </h2>
        <p className="text-sm" style={{ color: theme.text.muted }}>
          Expenses by category — {months[selectedMonth - 1]} {year}
        </p>
      </div>
      <div className="flex gap-1 flex-wrap">
        {months.map((m, i) => (
          <button
            key={m}
            onClick={() => setSelectedMonth(i + 1)}
            className="px-2 py-1 rounded-lg text-xs font-medium transition-colors"
            style={
              selectedMonth === i + 1
                ? { background: theme.accent, color: theme.btn.primary.text }
                : { background: 'transparent', color: theme.text.muted, border: `1px solid ${theme.card.border}` }
            }
          >
            {m}
          </button>
        ))}
      </div>
    </div>
  )
}
