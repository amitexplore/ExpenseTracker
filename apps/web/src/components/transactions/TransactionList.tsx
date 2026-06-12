'use client'

import { formatCurrency } from '@tracker/core'
import { format } from 'date-fns'
import { Mail, PenLine, Smartphone } from 'lucide-react'
import type { Transaction } from '@tracker/db'

type TransactionWithCategory = Transaction & {
  expense_categories: { name: string; color: string; type: string; icon: string | null } | null
}

const SOURCE_ICONS = {
  gmail: Mail,
  manual: PenLine,
  bank_sms: Smartphone,
}

interface TransactionListProps {
  transactions: TransactionWithCategory[]
  currency: string
}

export default function TransactionList({ transactions, currency }: TransactionListProps) {
  if (transactions.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p className="text-sm">No transactions yet</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-gray-50">
      {transactions.map((tx) => {
        const SourceIcon = SOURCE_ICONS[tx.source as keyof typeof SOURCE_ICONS] ?? PenLine
        const catColor = tx.expense_categories?.color ?? '#94a3b8'
        return (
          <div key={tx.id} className="flex items-center gap-4 py-3">
            {/* Category dot */}
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: catColor + '20' }}
            >
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: catColor }} />
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {tx.merchant ?? tx.description ?? 'Unknown'}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-gray-400">
                  {format(new Date(tx.date), 'dd MMM yyyy')}
                </span>
                {tx.expense_categories && (
                  <span className="text-xs px-1.5 py-0.5 rounded-md text-gray-500 bg-gray-100">
                    {tx.expense_categories.name}
                  </span>
                )}
                <SourceIcon className="w-3 h-3 text-gray-300" />
              </div>
            </div>

            {/* Amount */}
            <p className={`text-sm font-semibold tabular-nums ${tx.is_income ? 'text-brand-600' : 'text-red-500'}`}>
              {tx.is_income ? '+' : '-'}{formatCurrency(tx.amount, currency)}
            </p>
          </div>
        )
      })}
    </div>
  )
}
