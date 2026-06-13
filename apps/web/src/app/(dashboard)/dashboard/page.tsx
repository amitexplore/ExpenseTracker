'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import YearlyGrid from '@/components/dashboard/YearlyGrid'
import SavingsProgressCard from '@/components/dashboard/SavingsProgressCard'
import MonthlyTrendChart from '@/components/dashboard/MonthlyTrendChart'
import AddBonusButton from '@/components/dashboard/AddBonusButton'
import { computeSavingsProgress, calcAvgMonthlySavings, MONTH_SHORT } from '@tracker/core'
import type { MonthlySnapshot, Profile, FixedExpense, Transaction } from '@tracker/db'

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
  currentSavings: number,
): MonthData[] {
  let runningBalance: number | null = null

  return Array.from({ length: 12 }, (_, i) => {
    const month = i + 1
    const snap = snapshots.find((s) => s.month === month)

    if (snap) {
      runningBalance = snap.end_balance
      return {
        month,
        label: MONTH_SHORT[i],
        starting: snap.starting_balance,
        salary: snap.salary,
        deposits: snap.total_deposits,
        fixed: snap.total_fixed_expenses,
        variable: snap.total_variable_expenses,
        end: snap.end_balance,
        hasSnapshot: true,
      }
    }

    // No snapshot — compute directly from source data
    const monthDate = new Date(year, i, 1)

    const monthTx = allTransactions.filter((t) => {
      const d = new Date(t.date)
      return d.getFullYear() === year && d.getMonth() + 1 === month
    })

    const deposits = monthTx
      .filter((t) => t.is_income)
      .reduce((s, t) => s + t.amount, 0)

    const variable = monthTx
      .filter((t) => !t.is_income)
      .reduce((s, t) => s + t.amount, 0)

    const fixed = fixedExpenses
      .filter((fe) => {
        const from = new Date(fe.active_from)
        const to = fe.active_to ? new Date(fe.active_to) : null
        return monthDate >= from && (to === null || monthDate <= to)
      })
      .reduce((s, fe) => {
        return s + (fe.frequency === 'monthly' ? fe.amount : fe.frequency === 'yearly' ? fe.amount / 12 : 0)
      }, 0)

    const hasAnyData = deposits > 0 || variable > 0 || fixed > 0

    if (!hasAnyData && runningBalance === null) {
      return { month, label: MONTH_SHORT[i], starting: null, salary: 0, deposits: 0, fixed: 0, variable: 0, end: null, hasSnapshot: false }
    }

    const starting = runningBalance ?? currentSavings
    const end = starting + salary + deposits - fixed - variable
    runningBalance = end

    return { month, label: MONTH_SHORT[i], starting, salary, deposits, fixed, variable, end, hasSnapshot: false }
  })
}

export default function DashboardPage() {
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
      supabase.from('monthly_snapshots').select('*').eq('user_id', user.id)
        .order('year').order('month'),
      // Active fixed expenses: no end date OR end date in the future
      supabase.from('fixed_expenses').select('*').eq('user_id', user.id)
        .or('active_to.is.null,active_to.gte.' + new Date().toISOString().split('T')[0]),
      // All transactions for the selected year (fetched fresh each year change)
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

  const existingSavings = profile?.current_savings ?? 0
  const salary = profile?.monthly_salary ?? 0

  const yearSnapshots = snapshots.filter((s) => s.year === year)
  const allYearSnapshots = snapshots  // all years for savings progress

  const monthData = buildMonthData(year, yearSnapshots, transactions, fixedExpenses, salary, existingSavings)

  // Savings progress: use latest snapshot end_balance as cumulative savings
  const sortedSnaps = [...allYearSnapshots].sort((a, b) =>
    a.year !== b.year ? a.year - b.year : a.month - b.month
  )
  const latestSnap = sortedSnaps[sortedSnaps.length - 1]
  const trackedSavings = latestSnap ? latestSnap.end_balance : existingSavings

  const avgMonthlySavings = calcAvgMonthlySavings(allYearSnapshots)
  const totalMonthlyFixed = fixedExpenses.reduce((sum, fe) => {
    return sum + (fe.frequency === 'monthly' ? fe.amount : fe.frequency === 'yearly' ? fe.amount / 12 : 0)
  }, 0)
  const effectiveMonthlySavings = avgMonthlySavings > 0
    ? avgMonthlySavings
    : Math.max(0, salary - totalMonthlyFixed)

  const savingsProgress = computeSavingsProgress(
    profile?.target_amount ?? 0,
    profile?.target_date ?? null,
    trackedSavings,
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Your financial overview</p>
        </div>
        <div className="flex items-center gap-3">
          {userId && <AddBonusButton userId={userId} onAdded={load} />}
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

      <SavingsProgressCard
        progress={savingsProgress}
        currency={profile?.currency ?? 'INR'}
        currentSavings={existingSavings}
        targetDate={profile?.target_date}
      />
      <MonthlyTrendChart monthData={monthData} year={year} />
      <YearlyGrid
        monthData={monthData}
        year={year}
        currency={profile?.currency ?? 'INR'}
      />
    </div>
  )
}
