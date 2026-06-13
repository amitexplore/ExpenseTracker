'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { formatCurrency, MONTH_NAMES } from '@tracker/core'
import Link from 'next/link'
import { ArrowLeft, TrendingUp, TrendingDown, Wallet } from 'lucide-react'
import TransactionList from '@/components/transactions/TransactionList'
import type { MonthlySnapshot, Transaction, ExpenseCategory } from '@tracker/db'

type TransactionWithCategory = Transaction & {
  expense_categories: { name: string; color: string; type: string; icon: string | null } | null
}

export default function MonthPage({ params }: { params: { year: string; month: string } }) {
  const year = parseInt(params.year)
  const month = parseInt(params.month)
  const [snapshot, setSnapshot] = useState<MonthlySnapshot | null>(null)
  const [transactions, setTransactions] = useState<TransactionWithCategory[]>([])
  const [currency, setCurrency] = useState('INR')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const startDate = `${year}-${String(month).padStart(2, '0')}-01`
      const lastDay = new Date(year, month, 0).getDate()
      const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`

      const [{ data: snap }, { data: txs }, { data: profile }] = await Promise.all([
        supabase.from('monthly_snapshots').select('*').eq('user_id', user.id).eq('year', year).eq('month', month).single(),
        supabase.from('transactions').select('*, expense_categories(name, color, type, icon)').eq('user_id', user.id).gte('date', startDate).lte('date', endDate).order('date', { ascending: false }),
        supabase.from('profiles').select('currency').eq('id', user.id).single(),
      ])

      setSnapshot(snap)
      setTransactions((txs ?? []) as TransactionWithCategory[])
      setCurrency(profile?.currency ?? 'INR')
      setLoading(false)
    }
    load()
  }, [year, month])

  const fmt = (v: number) => formatCurrency(v, currency)

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const STAT_CARDS = [
    { label: 'Starting Balance', value: snapshot?.starting_balance ?? 0, icon: Wallet, color: 'text-gray-600', bg: 'bg-gray-50' },
    { label: 'Salary', value: snapshot?.salary ?? 0, icon: TrendingUp, color: 'text-brand-600', bg: 'bg-brand-50' },
    { label: 'Total Expenses', value: (snapshot?.total_fixed_expenses ?? 0) + (snapshot?.total_variable_expenses ?? 0), icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'End Balance', value: snapshot?.end_balance ?? 0, icon: Wallet, color: 'text-purple-600', bg: 'bg-purple-50' },
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard" className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{MONTH_NAMES[month - 1]} {year}</h1>
          <p className="text-sm text-gray-500">Monthly breakdown</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {STAT_CARDS.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className={`inline-flex p-2 rounded-xl ${bg} mb-3`}>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <p className="text-xs text-gray-500">{label}</p>
            <p className={`text-lg font-bold mt-1 ${color}`}>{fmt(value)}</p>
          </div>
        ))}
      </div>

      {snapshot && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Fixed Expenses</h3>
            <p className="text-2xl font-bold text-red-600">{fmt(snapshot.total_fixed_expenses)}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Variable Expenses</h3>
            <p className="text-2xl font-bold text-orange-600">{fmt(snapshot.total_variable_expenses)}</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Transactions</h2>
        <TransactionList transactions={transactions} currency={currency} />
      </div>
    </div>
  )
}
