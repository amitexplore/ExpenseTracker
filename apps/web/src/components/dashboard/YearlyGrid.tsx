'use client'

import React from 'react'

import Link from 'next/link'
import { formatCurrency } from '@tracker/core'
import { cn } from '@/lib/utils'
import type { MonthData } from '@/app/(dashboard)/dashboard/page'

interface YearlyGridProps {
  monthData: MonthData[]
  year: number
  currency: string
}

export default function YearlyGrid({ monthData, year, currency }: YearlyGridProps): React.JSX.Element {
  const fmt = (v: number | null) => v !== null ? formatCurrency(v, currency) : '—'

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  const isFutureMonth = (month: number) =>
    year > currentYear || (year === currentYear && month > currentMonth)

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
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-base font-semibold text-gray-900">Yearly Breakdown — {year}</h2>
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-brand-50 border border-brand-200 inline-block" />
            Confirmed
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-sky-50 border border-sky-200 inline-block" />
            Projected
          </span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr>
              <th className="text-left text-gray-400 font-medium py-2 pr-4 w-40">Category</th>
              {monthData.map(({ month, label }) => {
                const future = isFutureMonth(month)
                return (
                  <th
                    key={month}
                    className={cn(
                      'text-right py-2 px-2 font-medium',
                      future ? 'text-sky-400' : 'text-gray-700',
                    )}
                  >
                    <Link
                      href={`/month/${year}/${month}`}
                      className={cn('transition-colors', future ? 'hover:text-sky-600' : 'hover:text-brand-600')}
                    >
                      {label}
                    </Link>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {ROWS.map(({ label, key, cls, bold }) => (
              <tr
                key={key}
                className={cn('border-t border-gray-50', key === 'deposits' && 'bg-amber-50')}
              >
                <td className={cn('py-2.5 pr-4 text-gray-600', bold && 'font-semibold text-gray-900')}>
                  {label}
                </td>
                {monthData.map(({ month, hasSnapshot, ...vals }) => {
                  const future = isFutureMonth(month)
                  const raw = vals[key as keyof typeof vals]
                  const val = typeof raw === 'number' ? raw : null
                  const isZero = typeof val === 'number' && val === 0

                  return (
                    <td
                      key={month}
                      className={cn(
                        'py-2.5 px-2 text-right tabular-nums',
                        bold
                          ? future
                            ? 'font-semibold text-sky-600 bg-sky-50'
                            : 'font-semibold text-brand-700 bg-brand-50'
                          : future
                            ? 'text-sky-500 bg-sky-50/40'
                            : 'text-gray-700',
                        cls && !future ? cls : '',
                        cls && future ? 'text-red-300' : '',
                        (val === null || isZero) && !bold ? 'text-gray-300' : '',
                      )}
                    >
                      {val !== null ? (
                        <>
                          {fmt(val)}
                          {bold && future && (
                            <span className="ml-1 text-[10px] text-sky-400 font-normal italic">est</span>
                          )}
                        </>
                      ) : '—'}
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
