import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import YearlyGrid from '@/components/dashboard/YearlyGrid'
import SavingsProgressCard from '@/components/dashboard/SavingsProgressCard'
import MonthlyTrendChart from '@/components/dashboard/MonthlyTrendChart'
import { computeSavingsProgress, calcAvgMonthlySavings, getCumulativeSavings } from '@tracker/core'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { year?: string }
}) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const year = parseInt(searchParams.year ?? String(new Date().getFullYear()))

  const [{ data: profile }, { data: snapshots }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase
      .from('monthly_snapshots')
      .select('*')
      .eq('user_id', user.id)
      .order('year', { ascending: false })
      .order('month', { ascending: true }),
  ])

  const yearSnapshots = (snapshots ?? []).filter((s) => s.year === year)
  const allSnapshots = snapshots ?? []

  const currentSavings = getCumulativeSavings(allSnapshots)
  const avgMonthlySavings = calcAvgMonthlySavings(allSnapshots)

  const savingsProgress = computeSavingsProgress(
    profile?.target_amount ?? 0,
    profile?.target_date ?? null,
    currentSavings,
    avgMonthlySavings,
  )

  const availableYears = [...new Set(allSnapshots.map((s) => s.year))].sort((a, b) => b - a)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Your financial overview</p>
        </div>
        <YearSelector year={year} availableYears={availableYears} />
      </div>

      {/* Savings progress */}
      <SavingsProgressCard progress={savingsProgress} currency={profile?.currency ?? 'INR'} />

      {/* Monthly trend chart */}
      <MonthlyTrendChart snapshots={yearSnapshots} year={year} />

      {/* Yearly grid (spreadsheet view) */}
      <YearlyGrid
        snapshots={yearSnapshots}
        year={year}
        salary={profile?.monthly_salary ?? 0}
        currency={profile?.currency ?? 'INR'}
      />
    </div>
  )
}

function YearSelector({ year, availableYears }: { year: number; availableYears: number[] }) {
  const years = availableYears.length > 0 ? availableYears : [new Date().getFullYear()]
  return (
    <form>
      <select
        name="year"
        defaultValue={year}
        onChange={(e) => {
          const url = new URL(window.location.href)
          url.searchParams.set('year', e.target.value)
          window.location.href = url.toString()
        }}
        className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
      >
        {years.map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
    </form>
  )
}
