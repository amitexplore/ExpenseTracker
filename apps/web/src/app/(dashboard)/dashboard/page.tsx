'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import YearlyGrid from '@/components/dashboard/YearlyGrid'
import SavingsProgressCard from '@/components/dashboard/SavingsProgressCard'
import MonthlyTrendChart from '@/components/dashboard/MonthlyTrendChart'
import AddBonusButton from '@/components/dashboard/AddBonusButton'
import { computeSavingsProgress, calcAvgMonthlySavings, getCumulativeSavings } from '@tracker/core'
import type { MonthlySnapshot, Profile, FixedExpense } from '@tracker/db'

export default function DashboardPage() {
  const [year, setYear] = useState(new Date().getFullYear())
  const [userId, setUserId] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [allSnapshots, setAllSnapshots] = useState<MonthlySnapshot[]>([])
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([])
  // bonusByMonth[month] = total income (bonuses) for that month, fetched directly
  const [bonusByMonth, setBonusByMonth] = useState<Record<number, number>>({})
  const [loading, setLoading] = useState(true)

  async function load() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setUserId(user.id)

    const [{ data: p }, { data: s }, { data: fe }, { data: incTx }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('monthly_snapshots').select('*').eq('user_id', user.id)
        .order('year', { ascending: false }).order('month', { ascending: true }),
      // Fixed: use .is() for null check, not .eq()
      supabase.from('fixed_expenses').select('*').eq('user_id', user.id).is('active_to', null),
      // Fetch all income transactions directly so bonuses always appear
      supabase.from('transactions').select('amount, date')
        .eq('user_id', user.id)
        .eq('is_income', true),
    ])

    setProfile(p)
    setAllSnapshots(s ?? [])
    setFixedExpenses(fe ?? [])

    // Group income transactions by month for the current/selected year
    const byMonth: Record<number, number> = {}
    for (const tx of incTx ?? []) {
      const d = new Date(tx.date)
      const m = d.getMonth() + 1
      byMonth[m] = (byMonth[m] ?? 0) + tx.amount
    }
    setBonusByMonth(byMonth)

    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const existingSavings = profile?.current_savings ?? 0
  const salary = profile?.monthly_salary ?? 0
  const totalMonthlyFixed = fixedExpenses.reduce((sum, fe) => {
    return sum + (fe.frequency === 'monthly' ? fe.amount : fe.frequency === 'yearly' ? fe.amount / 12 : 0)
  }, 0)

  const yearSnapshots = allSnapshots.filter((s) => s.year === year)

  // Use the directly-fetched total bonus as cumulative "tracked savings" supplement
  const totalBonus = Object.values(bonusByMonth).reduce((a, b) => a + b, 0)
  const trackedSavings = getCumulativeSavings(allSnapshots, existingSavings) + (allSnapshots.length === 0 ? 0 : 0)
  // If no snapshots yet, use current_savings + total bonuses logged
  const effectiveSavings = allSnapshots.length > 0 ? trackedSavings : existingSavings + totalBonus

  const avgMonthlySavings = calcAvgMonthlySavings(allSnapshots)
  const effectiveMonthlySavings = avgMonthlySavings > 0
    ? avgMonthlySavings
    : Math.max(0, salary - totalMonthlyFixed)

  const savingsProgress = computeSavingsProgress(
    profile?.target_amount ?? 0,
    profile?.target_date ?? null,
    effectiveSavings,
    effectiveMonthlySavings,
  )

  const availableYears = [...new Set(allSnapshots.map((s) => s.year))].sort((a, b) => b - a)
  if (availableYears.length === 0) availableYears.push(new Date().getFullYear())

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
          {userId && (
            <AddBonusButton userId={userId} onAdded={load} />
          )}
          <div className="flex gap-2">
            {availableYears.map((y) => (
              <button
                key={y}
                onClick={() => setYear(y)}
                className={`px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${
                  y === year ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
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
      <MonthlyTrendChart snapshots={yearSnapshots} year={year} bonusByMonth={bonusByMonth} />
      <YearlyGrid
        snapshots={yearSnapshots}
        year={year}
        salary={profile?.monthly_salary ?? 0}
        currency={profile?.currency ?? 'INR'}
        bonusByMonth={bonusByMonth}
      />
    </div>
  )
}
