'use client'

import React from 'react'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { formatCurrency, MONTH_NAMES } from '@tracker/core'
import Link from 'next/link'
import { ArrowLeft, TrendingUp, TrendingDown, Wallet, Gift } from 'lucide-react'
import TransactionList from '@/components/transactions/TransactionList'
import type { MonthlySnapshot, Transaction, FixedExpense } from '@tracker/db'

type TransactionWithCategory = Transaction & {
  expense_categories: { name: string; color: string; type: string; icon: string | null } | null
}

export default function MonthPage({ params }: { params: { year: string; month: string } }): React.JSX.Element {
  const year = parseInt(params.year)
  const month = parseInt(params.month)

  const [snapshot, setSnapshot] = useState<MonthlySnapshot | null>(null)
  const [priorEndBalance, setPriorEndBalance] = useState<number | null>(null)
  const [transactions, setTransactions] = useState<TransactionWithCategory[]>([])
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([])
  const [currency, setCurrency] = useState('INR')
  const [salary, setSalary] = useState(0)
  const [currentSavings, setCurrentSavings] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const startDate = `${year}-${String(month).padStart(2, '0')}-01`
      const lastDay = new Date(year, month, 0).getDate()
      const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`

      const [{ data: snap }, { data: txs }, { data: profile }, { data: fe }, { data: priorSnap }] = await Promise.all([
        supabase.from('monthly_snapshots').select('*').eq('user_id', user.id).eq('year', year).eq('month', month).maybeSingle(),
        supabase.from('transactions').select('*, expense_categories(name, color, type, icon)')
          .eq('user_id', user.id).gte('date', startDate).lte('date', endDate).order('date', { ascending: false }),
        supabase.from('profiles').select('currency, monthly_salary, current_savings').eq('id', user.id).single(),
        // Fetch all fixed expenses for accurate per-month filtering
        supabase.from('fixed_expenses').select('*').eq('user_id', user.id),
        // Most-recent prior snapshot for starting balance chain
        // Prior snapshot: year < target year, OR same year with month < target month
        supabase.from('monthly_snapshots').select('end_balance').eq('user_id', user.id)
          .or(`year.lt.${year},and(year.eq.${year},month.lt.${month})`)
          .order('year', { ascending: false }).order('month', { ascending: false }).limit(1).maybeSingle(),
      ])

      setSnapshot(snap)
      setTransactions((txs ?? []) as TransactionWithCategory[])
      const p = profile as { currency?: string; monthly_salary?: number; current_savings?: number } | null
      setCurrency(p?.currency ?? 'INR')
      setSalary(p?.monthly_salary ?? 0)
      setCurrentSavings(p?.current_savings ?? 0)
      setFixedExpenses(fe ?? [])
      const prior = priorSnap as { end_balance?: number } | null
      setPriorEndBalance(prior?.end_balance ?? null)
      setLoading(false)
    }
    load()
  }, [year, month])

  const fmt = (v: number) => formatCurrency(v, currency)

  // Compute from source data when no snapshot exists
  const monthDate = new Date(year, month - 1, 1)
  const income = transactions.filter((t) => t.is_income).reduce((s, t) => s + t.amount, 0)
  const variable = transactions.filter((t) => !t.is_income).reduce((s, t) => s + t.amount, 0)
  const fixed = fixedExpenses
    .filter((fe) => {
      // Compare at month level so mid-month active_from is included for that month
      const fromMonth = new Date(fe.active_from)
      fromMonth.setDate(1)
      const toMonth = fe.active_to ? new Date(fe.active_to) : null
      if (toMonth) toMonth.setDate(1)
      return monthDate >= fromMonth && (toMonth === null || monthDate <= toMonth)
    })
    .reduce((s, fe) => {
      if (fe.frequency === 'monthly') return s + fe.amount
      if (fe.frequency === 'yearly') return s + fe.amount / 12
      if (fe.frequency === 'one_time') {
        const from = new Date(fe.active_from)
        if (from.getFullYear() === year && from.getMonth() + 1 === month) return s + fe.amount
      }
      return s
    }, 0)

  const starting = priorEndBalance ?? currentSavings
  const display = snapshot
    ? {
        starting: snapshot.starting_balance,
        salary: snapshot.salary,
        deposits: snapshot.total_deposits,
        fixed: snapshot.total_fixed_expenses,
        variable: snapshot.total_variable_expenses,
        end: snapshot.end_balance,
      }
    : {
        starting,
        salary,
        deposits: income,
        fixed,
        variable,
        end: starting + salary + income - fixed - variable,
      }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const STAT_CARDS = [
    { label: 'Salary',           value: display.salary,            icon: TrendingUp,  color: 'text-brand-600',  bg: 'bg-brand-50' },
    { label: 'Bonus / Income',   value: display.deposits,          icon: Gift,        color: 'text-amber-600',  bg: 'bg-amber-50' },
    { label: 'Fixed Expenses',   value: display.fixed,             icon: TrendingDown,color: 'text-red-600',    bg: 'bg-red-50' },
    { label: 'Variable Expenses',value: display.variable,          icon: TrendingDown,color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Starting Balance', value: display.starting,          icon: Wallet,      color: 'text-gray-600',   bg: 'bg-gray-50' },
    { label: 'End Balance',      value: display.end,               icon: Wallet,      color: 'text-purple-600', bg: 'bg-purple-50' },
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard" className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{MONTH_NAMES[month - 1]} {year}</h1>
          <p className="text-sm text-gray-500">
            Monthly breakdown{!snapshot && ' (estimated — no confirmed snapshot yet)'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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

      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Transactions this month</h2>
        <TransactionList transactions={transactions} currency={currency} />
      </div>
    </div>
  )
}
