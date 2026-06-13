'use client'

import Link from 'next/link'
import { formatCurrency, MONTH_SHORT } from '@tracker/core'
import type { MonthlySnapshot } from '@tracker/db'
import { cn } from '@/lib/utils'

interface YearlyGridProps {
  snapshots: MonthlySnapshot[]
  year: number
  salary: number
  currency: string
  bonusByMonth?: Record<number, number>
}

export default function YearlyGrid({ snapshots, year, salary, currency, bonusByMonth = {} }: YearlyGridProps) {
  const fmt = (v: number) => formatCurrency(v, currency)

  const months = Array.from({ length: 12 }, (_, i) => {
    const s = snapshots.find((snap) => snap.month === i + 1)
    const directBonus = bonusByMonth[i + 1]
    return {
      month: i + 1,
      label: MONTH_SHORT[i],
      starting: s?.starting_balance ?? null,
      salary: s?.salary ?? salary,
      // Prefer directly-fetched bonus total over snapshot value
      deposits: directBonus !== undefined ? directBonus : (s?.total_deposits ?? null),
      fixed: s?.total_fixed_expenses ?? null,
      variable: s?.total_variable_expenses ?? null,
      end: s?.end_balance ?? null,
    }
  })

  const ROWS = [
    { label: 'Starting Balance', key: 'starting', highlight: false },
    { label: 'Salary', key: 'salary', highlight: false },
    { label: 'Bonus / Other Income', key: 'deposits', highlight: true },
    { label: 'Fixed Expenses', key: 'fixed', highlight: false },
    { label: 'Variable Expenses', key: 'variable', highlight: false },
    { label: 'End Balance', key: 'end', highlight: false, bold: true },
  ] as const

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <h2 className="text-base font-semibold text-gray-900 mb-4">Yearly Breakdown — {year}</h2>
      <div className="overflow-x-auto scrollbar-hide">
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr>
              <th className="text-left text-gray-400 font-medium py-2 pr-4 w-40">Category</th>
              {months.map(({ label, month }) => (
                <th key={month} className="text-right py-2 px-2 font-medium text-gray-700">
                  <Link
                    href={`/month/${year}/${month}`}
                    className="hover:text-brand-600 transition-colors"
                  >
                    {label}
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map(({ label, key, highlight, bold }) => (
              <tr
                key={key}
                className={cn(
                  'border-t border-gray-50',
                  highlight && 'bg-yellow-50',
                  bold && 'bg-brand-50',
                )}
              >
                <td className={cn('py-2.5 pr-4 text-gray-600', bold && 'font-semibold text-gray-900')}>
                  {label}
                </td>
                {months.map(({ month, ...values }) => {
                  const val = values[key as keyof typeof values]
                  return (
                    <td
                      key={month}
                      className={cn(
                        'py-2.5 px-2 text-right tabular-nums',
                        bold ? 'font-semibold text-brand-700' : 'text-gray-700',
                        key === 'fixed' || key === 'variable' ? 'text-red-600' : '',
                        val === null ? 'text-gray-200' : '',
                      )}
                    >
                      {val !== null ? fmt(val as number) : '—'}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
