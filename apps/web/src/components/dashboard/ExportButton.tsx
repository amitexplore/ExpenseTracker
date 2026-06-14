'use client'

import React, { useState } from 'react'
import { Download, ChevronDown } from 'lucide-react'
import type { MonthData } from '@/app/(dashboard)/dashboard/page'
import { useTheme } from '@/lib/theme'

interface ExportButtonProps {
  monthData: MonthData[]
  year: number
  currency: string
}

function toCsv(rows: string[][]): string {
  return rows
    .map((row) => row.map((cell) => (cell.includes(',') || cell.includes('"') ? `"${cell.replace(/"/g, '""')}"` : cell)).join(','))
    .join('\n')
}

function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url  = URL.createObjectURL(blob)
  const a    = Object.assign(document.createElement('a'), { href: url, download: filename })
  a.click()
  URL.revokeObjectURL(url)
}

export default function ExportButton({ monthData, year, currency }: ExportButtonProps): React.JSX.Element {
  const { theme } = useTheme()
  const [open, setOpen] = useState(false)

  function exportYearlyCsv() {
    const header = ['Month', 'Starting Balance', 'Salary', 'Bonus/Income', 'Fixed Expenses', 'Variable Expenses', 'End Balance']
    const rows   = monthData.map((m) => [
      m.label,
      m.starting !== null ? m.starting.toFixed(2) : '',
      m.salary.toFixed(2),
      m.deposits.toFixed(2),
      m.fixed.toFixed(2),
      m.variable.toFixed(2),
      m.end !== null ? m.end.toFixed(2) : '',
    ])
    const totals = [
      'TOTAL',
      '',
      monthData.reduce((s, m) => s + m.salary,   0).toFixed(2),
      monthData.reduce((s, m) => s + m.deposits, 0).toFixed(2),
      monthData.reduce((s, m) => s + m.fixed,    0).toFixed(2),
      monthData.reduce((s, m) => s + m.variable, 0).toFixed(2),
      '',
    ]
    const csv = toCsv([header, ...rows, totals])
    downloadFile(`expense-tracker-${year}.csv`, csv, 'text/csv;charset=utf-8;')
    setOpen(false)
  }

  function exportCurrentMonthCsv() {
    const now   = new Date()
    const month = now.getMonth() + 1
    const m     = monthData.find((d) => d.month === month)
    if (!m) return

    const rows = [
      ['Field', 'Amount'],
      ['Starting Balance', m.starting !== null ? m.starting.toFixed(2) : ''],
      ['Salary', m.salary.toFixed(2)],
      ['Bonus / Other Income', m.deposits.toFixed(2)],
      ['Fixed Expenses', m.fixed.toFixed(2)],
      ['Variable Expenses', m.variable.toFixed(2)],
      ['End Balance', m.end !== null ? m.end.toFixed(2) : ''],
      ['Currency', currency],
    ]
    const csv = toCsv(rows)
    downloadFile(`expense-tracker-${year}-${String(month).padStart(2,'0')}.csv`, csv, 'text/csv;charset=utf-8;')
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl transition-colors"
        style={{ background: theme.card.bg, border: `1px solid ${theme.card.border}`, color: theme.text.secondary }}
      >
        <Download className="w-4 h-4" />
        Export
        <ChevronDown className="w-3 h-3" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 mt-2 w-52 rounded-xl shadow-xl z-50 overflow-hidden"
            style={{ background: theme.card.bg, border: `1px solid ${theme.card.border}` }}
          >
            <button
              onClick={exportCurrentMonthCsv}
              className="w-full text-left px-4 py-3 text-sm transition-colors"
              style={{ color: theme.text.primary }}
              onMouseEnter={(e) => (e.currentTarget.style.background = theme.accentBg)}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <div className="font-medium">Current month</div>
              <div className="text-xs mt-0.5" style={{ color: theme.text.muted }}>Download as CSV</div>
            </button>
            <div style={{ height: 1, background: theme.card.border }} />
            <button
              onClick={exportYearlyCsv}
              className="w-full text-left px-4 py-3 text-sm transition-colors"
              style={{ color: theme.text.primary }}
              onMouseEnter={(e) => (e.currentTarget.style.background = theme.accentBg)}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <div className="font-medium">Full year {year}</div>
              <div className="text-xs mt-0.5" style={{ color: theme.text.muted }}>All 12 months as CSV</div>
            </button>
          </div>
        </>
      )}
    </div>
  )
}
