'use client'

import React from 'react'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import YearlyGrid from '@/components/dashboard/YearlyGrid'
import SavingsProgressCard from '@/components/dashboard/SavingsProgressCard'
import MonthlyTrendChart from '@/components/dashboard/MonthlyTrendChart'
import AddBonusButton from '@/components/dashboard/AddBonusButton'
import TransferFundsButton from '@/components/dashboard/TransferFundsButton'
import { computeSavingsProgress, calcAvgMonthlySavings, MONTH_SHORT, formatCurrency } from '@tracker/core'
import type { MonthlySnapshot, Profile, FixedExpense, Transaction } from '@tracker/db'
import { Wallet, PiggyBank, TrendingUp } from 'lucide-react'

/** Per-month computed data used by both YearlyGrid and MonthlyTrendChart */
export interface MonthData {
  month: number
  label: string
  starting: number | null
  salary: number
  deposits: number   // bonuses / income transactions
  fixed: number
  variable: number
  end: number | null
  hasSnapshot: boolean
}

function buildMonthData(
  year: number,
  snapshots: MonthlySnapshot[],
  allTransactions: Transaction[],
  fixedExpenses: FixedExpense[],
  salary: number,
  accountBalanceStart: number,
): MonthData[] {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1
  let runningBalance: number | null = null

  return Array.from({ length: 12 }, (_, i) => {
    const month = i + 1
    const snap = snapshots.find((s) => s.month === month)
    const monthDate = new Date(year, i, 1)

    const fixed = fixedExpenses
      .filter((fe) => {
        const from = new Date(fe.active_from)
        const to = fe.active_to ? new Date(fe.active_to) : null
        return monthDate >= from && (to === null || monthDate <= to)
      })
      .reduce((s, fe) => {
        if (fe.frequency === 'monthly') return s + fe.amount
        if (fe.frequency === 'yearly') return s + fe.amount / 12
        if (fe.frequency === 'one_time') {
          const from = new Date(fe.active_from)
          if (from.getFullYear() === year && from.getMonth() + 1 === month) return s + fe.amount
          return s
        }
        return s
      }, 0)

    // Future month with no snapshot: only show obligations
    const isFuture = year > currentYear || (year === currentYear && month > currentMonth)
    if (isFuture && !snap) {
      return { month, label: MONTH_SHORT[i], starting: null, salary: 0, deposits: 0, fixed: fixed > 0 ? fixed : 0, variable: 0, end: null, hasSnapshot: false }
    }

    // Confirmed snapshot from DB
    if (snap) {
      runningBalance = snap.end_balance
      return { month, label: MONTH_SHORT[i], starting: snap.starting_balance, salary: snap.salary, deposits: snap.total_deposits, fixed: snap.total_fixed_expenses, variable: snap.total_variable_expenses, end: snap.end_balance, hasSnapshot: true }
    }

    // Past/current month with no snapshot: compute from raw transactions
    const monthTx = allTransactions.filter((t) => {
      const d = new Date(t.date)
      return d.getFullYear() === year && d.getMonth() + 1 === month
    })
    const deposits = monthTx.filter((t) => t.is_income).reduce((s, t) => s + t.amount, 0)
    const variable = monthTx.filter((t) => !t.is_income).reduce((s, t) => s + t.amount, 0)
    const hasAnyData = deposits > 0 || variable > 0 || fixed > 0

    if (!hasAnyData && runningBalance === null) {
      return { month, label: MONTH_SHORT[i], starting: null, salary: 0, deposits: 0, fixed: 0, variable: 0, end: null, hasSnapshot: false }
    }

    const starting = runningBalance ?? accountBalanceStart
    const end = starting + salary + deposits - fixed - variable
    runningBalance = end
    return { month, label: MONTH_SHORT[i], starting, salary, deposits, fixed, variable, end, hasSnapshot: false }
  })
}

export default function DashboardPage(): React.JSX.Element {
  const [year, setYear] = useState(new Date().getFullYear())
  const [userId, setUserId] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [snapshots, setSnapshots] = useState<MonthlySnapshot[]>([])
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setUserId(user.id)

    const [{ data: p }, { data: s }, { data: fe }, { data: tx }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('monthly_snapshots').select('*').eq('user_id', user.id).order('year').order('month'),
      supabase.from('fixed_expenses').select('*').eq('user_id', user.id),
      supabase.from('transactions').select('*').eq('user_id', user.id)
        .gte('date', `${year}-01-01`).lte('date', `${year}-12-31`),
    ])

    setProfile(p)
    setSnapshots(s ?? [])
    setFixedExpenses(fe ?? [])
    setTransactions((tx ?? []) as Transaction[])
    setLoading(false)
  }

  useEffect(() => { load() }, [year])

  const currency = profile?.currency ?? 'INR'
  // Total Savings: the separate savings pot — never mixed with Account Balance
  const totalSavings = profile?.current_savings ?? 0
  // Account Balance seed: starting point of the monthly balance chain
  const accountBalanceStart = profile?.account_balance_start ?? 0
  const salary = profile?.monthly_salary ?? 0

  const yearSnapshots = snapshots.filter((s) => s.year === year)
  const monthData = buildMonthData(year, yearSnapshots, transactions, fixedExpenses, salary, accountBalanceStart)

  // Account Balance = latest confirmed snapshot end_balance (or accountBalanceStart if none)
  const now = new Date()
  const confirmedSnaps = snapshots.filter((s) =>
    s.year < now.getFullYear() ||
    (s.year === now.getFullYear() && s.month <= now.getMonth() + 1)
  )
  const sortedConfirmed = [...confirmedSnaps].sort((a, b) =>
    a.year !== b.year ? a.year - b.year : a.month - b.month
  )
  const latestSnap = sortedConfirmed[sortedConfirmed.length - 1]
  const accountBalance = latestSnap ? latestSnap.end_balance : accountBalanceStart

  // Savings progress is based on Total Savings pot only (not Account Balance)
  const avgMonthlySavings = calcAvgMonthlySavings(confirmedSnaps)
  const nowMonthDate = new Date(now.getFullYear(), now.getMonth(), 1)
  const totalMonthlyFixed = fixedExpenses
    .filter((fe) => {
      const from = new Date(fe.active_from)
      const to = fe.active_to ? new Date(fe.active_to) : null
      return nowMonthDate >= from && (to === null || nowMonthDate <= to)
    })
    .reduce((sum, fe) => sum + (fe.frequency === 'monthly' ? fe.amount : fe.frequency === 'yearly' ? fe.amount / 12 : 0), 0)
  const effectiveMonthlySavings = avgMonthlySavings > 0
    ? avgMonthlySavings
    : Math.max(0, salary - totalMonthlyFixed)

  const savingsProgress = computeSavingsProgress(
    profile?.target_amount ?? 0,
    profile?.target_date ?? null,
    totalSavings,
    effectiveMonthlySavings,
  )

  const availableYears = [...new Set(snapshots.map((s) => s.year))].sort((a, b) => b - a)
  if (availableYears.length === 0 || !availableYears.includes(year)) {
    availableYears.unshift(new Date().getFullYear())
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Your financial overview</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {userId && <AddBonusButton userId={userId} onAdded={load} />}
          {userId && (
            <TransferFundsButton
              userId={userId}
              accountBalance={accountBalance}
              currency={currency}
              onTransferred={load}
            />
          )}
          <div className="flex gap-2">
            {availableYears.map((y) => (
              <button
                key={y}
                onClick={() => setYear(y)}
                className={`px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${
                  y === year
                    ? 'bg-brand-600 text-white border-brand-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {y}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Account Balance + Total Savings summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Account Balance */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
            <Wallet className="w-5 h-5 text-blue-600" />
          </div>
          <div className="min-w-0">
            <p className="text-sm text-gray-500 font-medium">Account Balance</p>
            <p className="text-2xl font-bold text-gray-900 mt-0.5">
              {formatCurrency(accountBalance, currency)}
            </p>
            <p className="text-xs text-gray-400 mt-1">Monthly cash flow — salary in, expenses out</p>
          </div>
        </div>

        {/* Total Savings */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
            <PiggyBank className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="min-w-0">
            <p className="text-sm text-gray-500 font-medium">Total Savings</p>
            <p className="text-2xl font-bold text-gray-900 mt-0.5">
              {formatCurrency(totalSavings, currency)}
            </p>
            <p className="text-xs text-gray-400 mt-1">Your savings pot — grows via transfers</p>
          </div>
        </div>
      </div>

      <SavingsProgressCard
        progress={savingsProgress}
        currency={currency}
        currentSavings={totalSavings}
        targetDate={profile?.target_date}
      />
      <MonthlyTrendChart monthData={monthData} year={year} />
      <YearlyGrid
        monthData={monthData}
        year={year}
        currency={currency}
      />
    </div>
  )
}
