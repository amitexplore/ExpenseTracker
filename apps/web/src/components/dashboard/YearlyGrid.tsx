'use client'

import Link from 'next/link'
import { formatCurrency } from '@tracker/core'
import { cn } from '@/lib/utils'
import type { MonthData } from '@/app/(dashboard)/dashboard/page'

interface YearlyGridProps {
  monthData: MonthData[]
  year: number
  currency: string
}

export default function YearlyGrid({ monthData, year, currency }: YearlyGridProps) {
  const fmt = (v: number | null) => v !== null ? formatCurrency(v, currency) : '—'

  const ROWS: { label: string; key: keyof MonthData; cls?: string; bold?: boolean }[] = [
    { label: 'Starting Balance', key: 'starting' },
    { label: 'Salary',           key: 'salary' },
    { label: 'Bonus / Income',   key: 'deposits' },
    { label: 'Fixed Expenses',   key: 'fixed',    cls: 'text-red-600' },
    { label: 'Variable Expenses',key: 'variable', cls: 'text-red-600' },
    { label: 'End Balance',      key: 'end',      bold: true },
  ]

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <h2 className="text-base font-semibold text-gray-900 mb-4">Yearly Breakdown — {year}</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr>
              <th className="text-left text-gray-400 font-medium py-2 pr-4 w-40">Category</th>
              {monthData.map(({ month, label }) => (
                <th key={month} className="text-right py-2 px-2 font-medium text-gray-700">
                  <Link href={`/month/${year}/${month}`} className="hover:text-brand-600 transition-colors">
                    {label}
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map(({ label, key, cls, bold }) => (
              <tr
                key={key}
                className={cn(
                  'border-t border-gray-50',
                  key === 'deposits' && 'bg-amber-50',
                  bold && 'bg-brand-50',
                )}
              >
                <td className={cn('py-2.5 pr-4 text-gray-600', bold && 'font-semibold text-gray-900')}>
                  {label}
                </td>
                {monthData.map(({ month, ...vals }) => {
                  const raw = vals[key as keyof typeof vals]
                  const val = typeof raw === 'number' ? raw : (raw === null ? null : null)
                  const isZero = typeof val === 'number' && val === 0
                  return (
                    <td
                      key={month}
                      className={cn(
                        'py-2.5 px-2 text-right tabular-nums',
                        bold ? 'font-semibold text-brand-700' : 'text-gray-700',
                        cls,
                        (val === null || isZero) && !bold ? 'text-gray-300' : '',
                      )}
                    >
                      {val !== null ? fmt(val) : '—'}
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
