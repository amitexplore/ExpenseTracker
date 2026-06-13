'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import YearlyGrid from '@/components/dashboard/YearlyGrid'
import SavingsProgressCard from '@/components/dashboard/SavingsProgressCard'
import MonthlyTrendChart from '@/components/dashboard/MonthlyTrendChart'
import AddBonusButton from '@/components/dashboard/AddBonusButton'
import { computeSavingsProgress, calcAvgMonthlySavings, getCumulativeSavings } from '@tracker/core'
import type { MonthlySnapshot, Profile } from '@tracker/db'

export default function DashboardPage() {
  const [year, setYear] = useState(new Date().getFullYear())
  const [userId, setUserId] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [allSnapshots, setAllSnapshots] = useState<MonthlySnapshot[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setUserId(user.id)
    const [{ data: p }, { data: s }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('monthly_snapshots').select('*').eq('user_id', user.id)
        .order('year', { ascending: false }).order('month', { ascending: true }),
    ])
    setProfile(p)
    setAllSnapshots(s ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const existingSavings = profile?.current_savings ?? 0
  const yearSnapshots = allSnapshots.filter((s) => s.year === year)
  const trackedSavings = getCumulativeSavings(allSnapshots, existingSavings)
  const avgMonthlySavings = calcAvgMonthlySavings(allSnapshots)
  const savingsProgress = computeSavingsProgress(
    profile?.target_amount ?? 0,
    profile?.target_date ?? null,
    trackedSavings,
    avgMonthlySavings,
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
      />
      <MonthlyTrendChart snapshots={yearSnapshots} year={year} />
      <YearlyGrid snapshots={yearSnapshots} year={year} salary={profile?.monthly_salary ?? 0} currency={profile?.currency ?? 'INR'} />
    </div>
  )
}
