'use client'

import React from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { formatCurrency } from '@tracker/core'
import type { MonthData } from '@/app/(dashboard)/dashboard/page'
import { useTheme } from '@/lib/theme'

interface MonthComparisonProps {
  monthData: MonthData[]
  currency: string
}

interface DeltaItemProps {
  label: string
  current: number
  prev: number
  currency: string
  invertColor?: boolean  // true = increase is bad (expenses)
}

function DeltaItem({ label, current, prev, currency, invertColor }: DeltaItemProps) {
  const { theme } = useTheme()
  const delta = current - prev
  const pct = prev > 0 ? ((delta / prev) * 100) : 0
  const isZero = Math.abs(delta) < 1

  const isPositive = delta > 0
  const isGood = invertColor ? !isPositive : isPositive

  const color = isZero
    ? theme.text.muted
    : isGood ? theme.positive : theme.negative

  const Icon = isZero ? Minus : isPositive ? TrendingUp : TrendingDown

  return (
    <div
      className="rounded-xl p-4 flex-1 min-w-0"
      style={{ background: theme.card.bg, border: `1px solid ${theme.card.border}` }}
    >
      <p className="text-xs font-medium mb-2 truncate" style={{ color: theme.text.muted }}>{label}</p>
      <p className="text-base font-bold tabular-nums" style={{ color: theme.text.primary }}>
        {formatCurrency(current, currency)}
      </p>
      <div className="flex items-center gap-1 mt-1">
        <Icon className="w-3 h-3 flex-shrink-0" style={{ color }} />
        <span className="text-xs font-semibold" style={{ color }}>
          {isZero ? 'No change' : `${delta > 0 ? '+' : ''}${formatCurrency(Math.abs(delta), currency)}`}
        </span>
        {!isZero && prev > 0 && (
          <span className="text-xs" style={{ color: theme.text.muted }}>
            ({pct > 0 ? '+' : ''}{pct.toFixed(1)}%)
          </span>
        )}
      </div>
    </div>
  )
}

export default function MonthComparison({ monthData, currency }: MonthComparisonProps): React.JSX.Element {
  const { theme } = useTheme()
  const now = new Date()
  const currentMonth = now.getMonth() + 1

  const curr = monthData.find((m) => m.month === currentMonth)
  const prev = monthData.find((m) => m.month === currentMonth - 1)

  if (!curr || !prev || (curr.salary === 0 && curr.fixed === 0 && curr.variable === 0)) return <></>

  const prevMonthName = prev.label
  const currMonthName = curr.label

  return (
    <div>
      <p className="text-xs font-semibold mb-2" style={{ color: theme.text.muted, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        {currMonthName} vs {prevMonthName}
      </p>
      <div className="flex gap-3 flex-wrap">
        <DeltaItem label="Income" current={curr.salary + curr.deposits} prev={prev.salary + prev.deposits} currency={currency} />
        <DeltaItem label="Fixed Expenses" current={curr.fixed} prev={prev.fixed} currency={currency} invertColor />
        <DeltaItem label="Variable Expenses" current={curr.variable} prev={prev.variable} currency={currency} invertColor />
        <DeltaItem label="End Balance" current={curr.end ?? 0} prev={prev.end ?? 0} currency={currency} />
      </div>
    </div>
  )
}
