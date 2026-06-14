'use client'

import React from 'react'

import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { formatCurrency } from '@tracker/core'
import type { MonthData } from '@/app/(dashboard)/dashboard/page'

interface MonthlyTrendChartProps {
  monthData: MonthData[]
  year: number
  currency?: string
}

export default function MonthlyTrendChart({ monthData, year, currency = 'INR' }: MonthlyTrendChartProps): React.JSX.Element {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  const data = monthData.map((m) => {
    const future = year > currentYear || (year === currentYear && m.month > currentMonth)
    return {
      month: m.label,
      salary: m.salary,
      bonus: m.deposits,
      fixed: m.fixed,
      variable: m.variable,
      balance: !future && m.end !== null ? m.end : undefined,
      projected: future && m.end !== null ? m.end : undefined,
    }
  })

  const fmt = (v: number) => formatCurrency(v, currency, true)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <h2 className="text-base font-semibold text-gray-900 mb-1">Monthly Overview — {year}</h2>
      <p className="text-sm text-gray-400 mb-4">Income vs expenses — dashed line = projected</p>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis
            tickFormatter={fmt}
            tick={{ fontSize: 11 }}
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
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.07)',
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
          <Bar dataKey="salary"   name="Salary"             fill="#bbf7d0" radius={[4,4,0,0]} />
          <Bar dataKey="bonus"    name="Bonus / Income"     fill="#fde68a" radius={[4,4,0,0]} />
          <Bar dataKey="fixed"    name="Fixed Expenses"     fill="#fca5a5" radius={[4,4,0,0]} />
          <Bar dataKey="variable" name="Variable Expenses"  fill="#fdba74" radius={[4,4,0,0]} />
          <Line
            type="monotone"
            dataKey="balance"
            name="End Balance"
            stroke="#22c55e"
            strokeWidth={2}
            dot={{ fill: '#22c55e', r: 4 }}
            connectNulls={false}
          />
          <Line
            type="monotone"
            dataKey="projected"
            name="Projected Balance"
            stroke="#0ea5e9"
            strokeWidth={2}
            strokeDasharray="5 4"
            dot={{ fill: '#0ea5e9', r: 3 }}
            connectNulls={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
