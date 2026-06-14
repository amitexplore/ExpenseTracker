'use client'

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase'
import { useTheme } from '@/lib/theme'
import SavingsProgressCard from '@/components/dashboard/SavingsProgressCard'
import MonthComparison from '@/components/dashboard/MonthComparison'
import AddBonusButton from '@/components/dashboard/AddBonusButton'
import TransferFundsButton from '@/components/dashboard/TransferFundsButton'
import ExportButton from '@/components/dashboard/ExportButton'
import { computeSavingsProgress, calcAvgMonthlySavings, MONTH_SHORT, formatCurrency } from '@tracker/core'
import type { MonthlySnapshot, Profile, FixedExpense, Transaction, ExpenseCategory } from '@tracker/db'
import { Wallet, PiggyBank } from 'lucide-react'
import DashboardSkeleton from '@/components/ui/DashboardSkeleton'
import { Stagger, StaggerItem, AnimateIn } from '@/components/ui/Stagger'
import AnimatedCurrency from '@/components/ui/AnimatedCurrency'
import HoverCard from '@/components/ui/HoverCard'

// Lazy-load heavy Recharts-based components — they don't need to block first paint
const YearlyGrid       = dynamic(() => import('@/components/dashboard/YearlyGrid'),       { ssr: false })
const MonthlyTrendChart = dynamic(() => import('@/components/dashboard/MonthlyTrendChart'), { ssr: false })
const SpendingBreakdown = dynamic(() => import('@/components/dashboard/SpendingBreakdown'), { ssr: false })
const SavingsGoalsList  = dynamic(() => import('@/components/dashboard/SavingsGoalsList'),  { ssr: false })

/** Per-month computed data used by YearlyGrid and MonthlyTrendChart */
export interface MonthData {
  month: number
  label: string
  starting: number | null
  salary: number
  deposits: number
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
  const currentYear  = now.getFullYear()
  const currentMonth = now.getMonth() + 1
  let runningBalance: number | null = null

  return Array.from({ length: 12 }, (_, i) => {
    const month     = i + 1
    const snap      = snapshots.find((s) => s.month === month)
    const monthDate = new Date(year, i, 1)

    const fixed = fixedExpenses
      .filter((fe) => {
        const fromMonth = new Date(fe.active_from)
        fromMonth.setDate(1)
        const toMonth = fe.active_to ? new Date(fe.active_to) : null
        if (toMonth) toMonth.setDate(1)
        return monthDate >= fromMonth && (toMonth === null || monthDate <= toMonth)
      })
      .reduce((s, fe) => {
        if (fe.frequency === 'monthly')  return s + fe.amount
        if (fe.frequency === 'yearly')   return s + fe.amount / 12
        if (fe.frequency === 'one_time') {
          const from = new Date(fe.active_from)
          if (from.getFullYear() === year && from.getMonth() + 1 === month) return s + fe.amount
          return s
        }
        return s
      }, 0)

    const isFuture = year > currentYear || (year === currentYear && month > currentMonth)
    if (isFuture && !snap) {
      const starting = runningBalance ?? accountBalanceStart
      const end = starting + salary - fixed
      runningBalance = end
      return { month, label: MONTH_SHORT[i], starting, salary, deposits: 0, fixed, variable: 0, end, hasSnapshot: false }
    }

    if (snap) {
      runningBalance = snap.end_balance
      return { month, label: MONTH_SHORT[i], starting: snap.starting_balance, salary: snap.salary, deposits: snap.total_deposits, fixed: snap.total_fixed_expenses, variable: snap.total_variable_expenses, end: snap.end_balance, hasSnapshot: true }
    }

    const monthTx  = allTransactions.filter((t) => { const d = new Date(t.date); return d.getFullYear() === year && d.getMonth() + 1 === month })
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
  const { theme } = useTheme()
  const [year, setYear]                   = useState(new Date().getFullYear())
  const [userId, setUserId]               = useState<string | null>(null)
  const [profile, setProfile]             = useState<Profile | null>(null)
  const [snapshots, setSnapshots]         = useState<MonthlySnapshot[]>([])
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([])
  const [transactions, setTransactions]   = useState<Transaction[]>([])
  const [categories, setCategories]       = useState<ExpenseCategory[]>([])
  const [loading, setLoading]             = useState(true)
  const [loadError, setLoadError]         = useState<string | null>(null)

  // Refs so year-change effect knows whether static data was already loaded
  const userIdRef         = useRef<string | null>(null)
  const staticLoadedRef   = useRef(false)
  const currentYearOnInit = useRef(year)

  // ── Initial mount: fetch auth + static tables + first-year data in parallel ──
  useEffect(() => {
    async function init() {
      setLoadError(null)
      try {
        const supabase = createClient()
        const { data: { user }, error: authErr } = await supabase.auth.getUser()
        if (authErr || !user) { setLoading(false); return }

        userIdRef.current = user.id
        setUserId(user.id)
        const uid = user.id
        const yr  = currentYearOnInit.current

        // Fire static tables AND year-specific tables simultaneously
        const [
          [{ data: p, error: pErr }, { data: fe }, { data: cats }],
          [{ data: s }, { data: tx }],
        ] = await Promise.all([
          Promise.all([
            supabase.from('profiles')
              .select('id,currency,monthly_salary,current_savings,account_balance_start,target_amount,target_date')
              .eq('id', uid).single(),
            supabase.from('fixed_expenses')
              .select('id,name,amount,frequency,active_from,active_to,category_id')
              .eq('user_id', uid),
            supabase.from('expense_categories')
              .select('id,name,color,type,icon,monthly_budget,sort_order')
              .eq('user_id', uid).order('sort_order'),
          ]),
          Promise.all([
            supabase.from('monthly_snapshots')
              .select('user_id,year,month,starting_balance,salary,total_deposits,total_fixed_expenses,total_variable_expenses,end_balance')
              .eq('user_id', uid).order('year').order('month'),
            supabase.from('transactions')
              .select('id,amount,date,merchant,description,is_income,category_id')
              .eq('user_id', uid)
              .gte('date', `${yr}-01-01`).lte('date', `${yr}-12-31`),
          ]),
        ])

        if (pErr) throw new Error(pErr.message)

        setProfile(p)
        setFixedExpenses(fe ?? [])
        setCategories((cats ?? []) as ExpenseCategory[])
        setSnapshots(s ?? [])
        setTransactions((tx ?? []) as Transaction[])
        staticLoadedRef.current = true
      } catch (err) {
        console.error('[Dashboard] init error', err)
        setLoadError('Could not load your dashboard. Please refresh the page.')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Year change: reload ONLY transactions + snapshots ─────────────────────
  const loadYearData = useCallback(async (yr: number) => {
    if (!staticLoadedRef.current || !userIdRef.current) return
    setLoadError(null)
    try {
      const supabase = createClient()
      const uid = userIdRef.current
      const [{ data: s }, { data: tx }] = await Promise.all([
        supabase.from('monthly_snapshots')
          .select('user_id,year,month,starting_balance,salary,total_deposits,total_fixed_expenses,total_variable_expenses,end_balance')
          .eq('user_id', uid).order('year').order('month'),
        supabase.from('transactions')
          .select('id,amount,date,merchant,description,is_income,category_id')
          .eq('user_id', uid)
          .gte('date', `${yr}-01-01`).lte('date', `${yr}-12-31`),
      ])
      setSnapshots(s ?? [])
      setTransactions((tx ?? []) as Transaction[])
    } catch (err) {
      console.error('[Dashboard] year reload error', err)
    }
  }, [])

  useEffect(() => {
    // Skip the year that was already loaded during init
    if (year === currentYearOnInit.current && !staticLoadedRef.current) return
    loadYearData(year)
  }, [year, loadYearData])

  // Reload everything (used by action buttons like AddBonus, Transfer)
  const load = useCallback(async () => {
    if (!userIdRef.current) return
    await loadYearData(year)
  }, [year, loadYearData])

  // ── Memoised derived values ────────────────────────────────────────────────
  const currency            = profile?.currency             ?? 'INR'
  const totalSavings        = profile?.current_savings      ?? 0
  const accountBalanceStart = profile?.account_balance_start ?? 0
  const salary              = profile?.monthly_salary       ?? 0

  const yearSnapshots = useMemo(
    () => snapshots.filter((s) => s.year === year),
    [snapshots, year],
  )

  const monthData = useMemo(
    () => buildMonthData(year, yearSnapshots, transactions, fixedExpenses, salary, accountBalanceStart),
    [year, yearSnapshots, transactions, fixedExpenses, salary, accountBalanceStart],
  )

  const { confirmedSnaps, latestSnap, accountBalance, avgMonthlySavings, totalMonthlyFixed } = useMemo(() => {
    const now = new Date()
    const confirmed = snapshots.filter((s) =>
      s.year < now.getFullYear() || (s.year === now.getFullYear() && s.month <= now.getMonth() + 1),
    )
    const latest = [...confirmed].sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month).at(-1)
    const balance = latest ? latest.end_balance : accountBalanceStart
    const avg     = calcAvgMonthlySavings(confirmed)
    const nowDate = new Date(now.getFullYear(), now.getMonth(), 1)
    const fixed   = fixedExpenses
      .filter((fe) => {
        const from = new Date(fe.active_from); from.setDate(1)
        const to   = fe.active_to ? new Date(fe.active_to) : null; if (to) to.setDate(1)
        return nowDate >= from && (to === null || nowDate <= to)
      })
      .reduce((sum, fe) => sum + (fe.frequency === 'monthly' ? fe.amount : fe.frequency === 'yearly' ? fe.amount / 12 : 0), 0)
    return { confirmedSnaps: confirmed, latestSnap: latest, accountBalance: balance, avgMonthlySavings: avg, totalMonthlyFixed: fixed }
  }, [snapshots, accountBalanceStart, fixedExpenses])

  const effectiveMonthlySavings = avgMonthlySavings > 0 ? avgMonthlySavings : Math.max(0, salary - totalMonthlyFixed)

  const savingsProgress = useMemo(
    () => computeSavingsProgress(profile?.target_amount ?? 0, profile?.target_date ?? null, totalSavings, effectiveMonthlySavings),
    [profile?.target_amount, profile?.target_date, totalSavings, effectiveMonthlySavings],
  )

  const availableYears = useMemo(() => {
    const yrs = [...new Set(snapshots.map((s) => s.year))].sort((a, b) => b - a)
    if (yrs.length === 0 || !yrs.includes(year)) yrs.unshift(new Date().getFullYear())
    return yrs
  }, [snapshots, year])

  // satisfy linter — confirmedSnaps and latestSnap used indirectly via accountBalance
  void confirmedSnaps; void latestSnap

  if (loading) {
    return <DashboardSkeleton />
  }

  if (loadError) {
    return (
      <div className="flex h-full items-center justify-center p-8" style={{ background: theme.pageBg }}>
        <div className="text-center max-w-sm">
          <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-500 text-xl">!</span>
          </div>
          <p className="text-base font-semibold mb-2" style={{ color: theme.text.primary }}>Unable to load dashboard</p>
          <p className="text-sm mb-5" style={{ color: theme.text.muted }}>{loadError}</p>
          <button
            onClick={() => { setLoading(true); load() }}
            className="px-5 py-2 text-sm font-medium rounded-xl transition-colors"
            style={{ background: theme.accent, color: theme.btn.primary.text }}
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <AnimateIn delay={0}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: theme.text.primary }}>Dashboard</h1>
            <p className="text-sm mt-1" style={{ color: theme.text.muted }}>Your financial overview</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {userId && <AddBonusButton userId={userId} onAdded={load} />}
            {userId && (
              <TransferFundsButton userId={userId} accountBalance={accountBalance} currency={currency} onTransferred={load} />
            )}
            <ExportButton monthData={monthData} year={year} currency={currency} />
            <div className="flex gap-2">
              {availableYears.map((y) => (
                <button
                  key={y}
                  onClick={() => setYear(y)}
                  className="px-3 py-2 rounded-xl text-sm font-medium transition-colors"
                  style={
                    y === year
                      ? { background: theme.accent, color: theme.btn.primary.text, border: `1px solid ${theme.accent}` }
                      : { background: theme.card.bg, color: theme.text.secondary, border: `1px solid ${theme.card.border}` }
                  }
                >
                  {y}
                </button>
              ))}
            </div>
          </div>
        </div>
      </AnimateIn>

      {/* ── Month-over-month comparison ─────────────────────────────────────── */}
      <AnimateIn delay={0.08}>
        <MonthComparison monthData={monthData} currency={currency} />
      </AnimateIn>

      {/* ── Account Balance + Total Savings (staggered cards) ──────────────── */}
      <Stagger className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StaggerItem>
          <HoverCard
            className="rounded-2xl p-5 flex items-start gap-4 h-full"
            style={{ background: theme.card.bg, border: `1px solid ${theme.card.border}`, borderLeft: `4px solid ${theme.accountAccent}` }}
            glowColor={theme.accountAccent}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: theme.accentBg }}>
              <Wallet className="w-5 h-5" style={{ color: theme.accountAccent }} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium" style={{ color: theme.text.secondary }}>Account Balance</p>
              <AnimatedCurrency amount={accountBalance} currency={currency} className="text-2xl font-bold mt-0.5 block" />
              <p className="text-xs mt-1" style={{ color: theme.text.muted }}>Monthly cash flow — salary in, expenses out</p>
            </div>
          </HoverCard>
        </StaggerItem>

        <StaggerItem>
          <HoverCard
            className="rounded-2xl p-5 flex items-start gap-4 h-full"
            style={{ background: theme.card.bg, border: `1px solid ${theme.card.border}`, borderLeft: `4px solid ${theme.savingsAccent}` }}
            glowColor={theme.savingsAccent}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: theme.positiveBg }}>
              <PiggyBank className="w-5 h-5" style={{ color: theme.savingsAccent }} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium" style={{ color: theme.text.secondary }}>Total Savings</p>
              <AnimatedCurrency amount={totalSavings} currency={currency} className="text-2xl font-bold mt-0.5 block" />
              <p className="text-xs mt-1" style={{ color: theme.text.muted }}>Your savings pot — grows via transfers</p>
            </div>
          </HoverCard>
        </StaggerItem>
      </Stagger>

      {/* ── Savings goal progress ───────────────────────────────────────────── */}
      <AnimateIn delay={0.15}>
        <SavingsProgressCard
          progress={savingsProgress}
          currency={currency}
          currentSavings={totalSavings}
          targetDate={profile?.target_date}
        />
      </AnimateIn>

      {/* ── Additional savings goals ────────────────────────────────────────── */}
      {userId && (
        <AnimateIn delay={0.2}>
          <SavingsGoalsList userId={userId} currency={currency} />
        </AnimateIn>
      )}

      {/* ── Spending breakdown ──────────────────────────────────────────────── */}
      <AnimateIn delay={0.25}>
        <SpendingBreakdown
          transactions={transactions}
          categories={categories}
          currency={currency}
          year={year}
        />
      </AnimateIn>

      {/* ── Monthly trend chart ─────────────────────────────────────────────── */}
      <AnimateIn delay={0.3}>
        <MonthlyTrendChart monthData={monthData} year={year} currency={currency} />
      </AnimateIn>

      {/* ── Yearly breakdown grid ───────────────────────────────────────────── */}
      <AnimateIn delay={0.35}>
        <YearlyGrid monthData={monthData} year={year} currency={currency} />
      </AnimateIn>
    </div>
  )
}
