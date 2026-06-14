'use client'

import React from 'react'

import Link from 'next/link'
import { formatCurrency } from '@tracker/core'
import type { MonthData } from '@/app/(dashboard)/dashboard/page'
import { useTheme } from '@/lib/theme'

interface YearlyGridProps {
  monthData: MonthData[]
  year: number
  currency: string
}

export default function YearlyGrid({ monthData, year, currency }: YearlyGridProps): React.JSX.Element {
  const { theme } = useTheme()
  const t = theme.table
  const fmt = (v: number | null) => v !== null ? formatCurrency(v, currency) : '—'

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  const isFutureMonth = (month: number) =>
    year > currentYear || (year === currentYear && month > currentMonth)

  const ROWS: { label: string; key: keyof MonthData; isNeg?: boolean; bold?: boolean }[] = [
    { label: 'Starting Balance', key: 'starting' },
    { label: 'Salary',           key: 'salary' },
    { label: 'Bonus / Income',   key: 'deposits' },
    { label: 'Fixed Expenses',   key: 'fixed',    isNeg: true },
    { label: 'Variable Expenses',key: 'variable', isNeg: true },
    { label: 'End Balance',      key: 'end',      bold: true },
  ]

  return (
    <div
      className="rounded-2xl p-6"
      style={{ background: theme.card.bg, border: `1px solid ${theme.card.border}` }}
    >
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-base font-semibold" style={{ color: theme.text.primary }}>
          Yearly Breakdown — {year}
        </h2>
        <div className="flex items-center gap-3 text-xs" style={{ color: theme.text.muted }}>
          <span className="flex items-center gap-1.5">
            <span
              className="w-3 h-3 rounded-sm inline-block"
              style={{ background: t.confirmedBg, border: `1px solid ${t.confirmedText}33` }}
            />
            Confirmed
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="w-3 h-3 rounded-sm inline-block"
              style={{ background: t.projectedBg, border: `1px solid ${t.projectedText}33` }}
            />
            Projected
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th
                className="text-left font-medium py-2 pr-4 w-40"
                style={{ color: t.headerText }}
              >
                Category
              </th>
              {monthData.map(({ month, label }) => {
                const future = isFutureMonth(month)
                return (
                  <th
                    key={month}
                    className="text-right py-2 px-2 font-medium"
                    style={{ color: future ? t.projectedText : theme.text.secondary }}
                  >
                    <Link
                      href={`/month/${year}/${month}`}
                      className="transition-colors hover:opacity-75"
                    >
                      {label}
                    </Link>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {ROWS.map(({ label, key, isNeg, bold }) => (
              <tr
                key={key}
                style={{ borderTop: `1px solid ${t.border}` }}
              >
                <td
                  className="py-2.5 pr-4"
                  style={{
                    color: bold ? theme.text.primary : theme.text.secondary,
                    fontWeight: bold ? 600 : 400,
                  }}
                >
                  {label}
                </td>
                {monthData.map(({ month, ...vals }) => {
                  const future = isFutureMonth(month)
                  const raw = vals[key as keyof typeof vals]
                  const val = typeof raw === 'number' ? raw : null
                  const isZero = typeof val === 'number' && val === 0
                  const isBonus = key === 'deposits'

                  let bg = 'transparent'
                  let color = theme.text.secondary
                  if (bold) {
                    bg    = future ? t.projectedBg   : t.confirmedBg
                    color = future ? t.projectedText  : t.confirmedText
                  } else if (future) {
                    bg    = t.projectedBg + '66'
                    color = t.projectedText + 'aa'
                  } else if (isBonus) {
                    bg = t.rowBonus
                    color = theme.positive
                  } else if (isNeg) {
                    color = theme.negative + 'cc'
                  }
                  if ((val === null || isZero) && !bold) color = theme.text.muted + '55'

                  return (
                    <td
                      key={month}
                      className="py-2.5 px-2 text-right tabular-nums"
                      style={{ background: bg, color, fontWeight: bold ? 600 : 400 }}
                    >
                      {val !== null ? (
                        <>
                          {fmt(val)}
                          {bold && future && (
                            <span className="ml-1 text-[10px] font-normal italic" style={{ color: t.projectedText + '99' }}>
                              est
                            </span>
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
