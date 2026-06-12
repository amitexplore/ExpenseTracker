'use client'

import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { MONTH_SHORT, formatINR } from '@tracker/core'
import type { MonthlySnapshot } from '@tracker/db'

interface MonthlyTrendChartProps {
  snapshots: MonthlySnapshot[]
  year: number
}

export default function MonthlyTrendChart({ snapshots, year }: MonthlyTrendChartProps) {
  const data = Array.from({ length: 12 }, (_, i) => {
    const snap = snapshots.find((s) => s.month === i + 1)
    return {
      month: MONTH_SHORT[i],
      salary: snap?.salary ?? 0,
      fixed: snap?.total_fixed_expenses ?? 0,
      variable: snap?.total_variable_expenses ?? 0,
      balance: snap?.end_balance ?? null,
    }
  })

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <h2 className="text-base font-semibold text-gray-900 mb-1">Monthly Overview — {year}</h2>
      <p className="text-sm text-gray-400 mb-4">Income vs expenses vs closing balance</p>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis
            tickFormatter={(v) => formatINR(v, true)}
            tick={{ fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value: number) => formatINR(value)}
            contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.07)' }}
          />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
          <Bar dataKey="salary" name="Salary" fill="#bbf7d0" radius={[4, 4, 0, 0]} />
          <Bar dataKey="fixed" name="Fixed Expenses" fill="#fca5a5" radius={[4, 4, 0, 0]} />
          <Bar dataKey="variable" name="Variable Expenses" fill="#fdba74" radius={[4, 4, 0, 0]} />
          <Line
            type="monotone"
            dataKey="balance"
            name="End Balance"
            stroke="#22c55e"
            strokeWidth={2}
            dot={{ fill: '#22c55e', r: 4 }}
            connectNulls={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
