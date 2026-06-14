'use client'

import React, { useMemo } from 'react'

import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { formatCurrency } from '@tracker/core'
import type { MonthData } from '@/app/(dashboard)/dashboard/page'
import { useTheme } from '@/lib/theme'

interface MonthlyTrendChartProps {
  monthData: MonthData[]
  year: number
  currency?: string
}

export default function MonthlyTrendChart({ monthData, year, currency = 'INR' }: MonthlyTrendChartProps): React.JSX.Element {
  const { theme } = useTheme()
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  const data = useMemo(() => monthData.map((m) => {
    const future = year > currentYear || (year === currentYear && m.month > currentMonth)
    return {
      month:     m.label,
      salary:    m.salary,
      bonus:     m.deposits,
      fixed:     m.fixed,
      variable:  m.variable,
      balance:   !future && m.end !== null ? m.end : undefined,
      projected: future  && m.end !== null ? m.end : undefined,
    }
  }), [monthData, year, currentYear, currentMonth])

  const fmt = useMemo(() => (v: number) => formatCurrency(v, currency, true), [currency])
  const c = theme.chart

  return (
    <div
      className="rounded-2xl p-6"
      style={{ background: theme.card.bg, border: `1px solid ${theme.card.border}` }}
    >
      <h2 className="text-base font-semibold mb-1" style={{ color: theme.text.primary }}>
        Monthly Overview — {year}
      </h2>
      <p className="text-sm mb-4" style={{ color: theme.text.muted }}>
        Income vs expenses — dashed line = projected
      </p>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={c.grid} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 12, fill: theme.text.secondary }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={fmt}
            tick={{ fontSize: 11, fill: theme.text.secondary }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value: number, name: string) => {
              if (value === 0 || value === undefined) return [null, null]
              return [formatCurrency(value, currency), name]
            }}
            contentStyle={{
              borderRadius: '12px',
              border: `1px solid ${c.tooltipBorder}`,
              background: c.tooltipBg,
              color: c.tooltipText,
              boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
            }}
            labelStyle={{ color: c.tooltipText }}
          />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12, color: theme.text.secondary }} />
          <Bar dataKey="salary"   name="Salary"            fill={c.salary}   radius={[4,4,0,0]} isAnimationActive animationDuration={700} animationEasing="ease-out" animationBegin={0}   />
          <Bar dataKey="bonus"    name="Bonus / Income"    fill={c.bonus}    radius={[4,4,0,0]} isAnimationActive animationDuration={700} animationEasing="ease-out" animationBegin={100} />
          <Bar dataKey="fixed"    name="Fixed Expenses"    fill={c.fixed}    radius={[4,4,0,0]} isAnimationActive animationDuration={700} animationEasing="ease-out" animationBegin={200} />
          <Bar dataKey="variable" name="Variable Expenses" fill={c.variable} radius={[4,4,0,0]} isAnimationActive animationDuration={700} animationEasing="ease-out" animationBegin={300} />
          <Line
            type="monotone"
            dataKey="balance"
            name="End Balance"
            stroke={c.balance}
            strokeWidth={2}
            dot={{ fill: c.balance, r: 4 }}
            connectNulls={false}
            isAnimationActive
            animationDuration={900}
            animationEasing="ease-out"
            animationBegin={400}
          />
          <Line
            type="monotone"
            dataKey="projected"
            name="Projected Balance"
            stroke={c.projected}
            strokeWidth={2}
            strokeDasharray="5 4"
            dot={{ fill: c.projected, r: 3 }}
            connectNulls={false}
            isAnimationActive
            animationDuration={900}
            animationEasing="ease-out"
            animationBegin={500}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
