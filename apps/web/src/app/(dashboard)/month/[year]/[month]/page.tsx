import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect, notFound } from 'next/navigation'
import { formatCurrency, MONTH_NAMES } from '@tracker/core'
import Link from 'next/link'
import { ArrowLeft, TrendingUp, TrendingDown, Wallet } from 'lucide-react'
import TransactionList from '@/components/transactions/TransactionList'

interface Params { year: string; month: string }

export default async function MonthPage({ params }: { params: Params }) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const year = parseInt(params.year)
  const month = parseInt(params.month)

  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) notFound()

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = new Date(year, month, 0)
  const endDateStr = `${year}-${String(month).padStart(2, '0')}-${endDate.getDate()}`

  const [{ data: snapshot }, { data: transactions }, { data: profile }] = await Promise.all([
    supabase
      .from('monthly_snapshots')
      .select('*')
      .eq('user_id', user.id)
      .eq('year', year)
      .eq('month', month)
      .single(),
    supabase
      .from('transactions')
      .select('*, expense_categories(name, color, type, icon)')
      .eq('user_id', user.id)
      .gte('date', startDate)
      .lte('date', endDateStr)
      .order('date', { ascending: false }),
    supabase.from('profiles').select('currency').eq('id', user.id).single(),
  ])

  const currency = profile?.currency ?? 'INR'
  const fmt = (v: number) => formatCurrency(v, currency)

  const STAT_CARDS = [
    {
      label: 'Starting Balance', value: snapshot?.starting_balance ?? 0,
      icon: Wallet, color: 'text-gray-600', bg: 'bg-gray-50',
    },
    {
      label: 'Salary', value: snapshot?.salary ?? 0,
      icon: TrendingUp, color: 'text-brand-600', bg: 'bg-brand-50',
    },
    {
      label: 'Total Expenses', value: (snapshot?.total_fixed_expenses ?? 0) + (snapshot?.total_variable_expenses ?? 0),
      icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-50',
    },
    {
      label: 'End Balance', value: snapshot?.end_balance ?? 0,
      icon: Wallet, color: 'text-purple-600', bg: 'bg-purple-50',
    },
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard" className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {MONTH_NAMES[month - 1]} {year}
          </h1>
          <p className="text-sm text-gray-500">Monthly breakdown</p>
        </div>
      </div>

      {/* Stat cards */}
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

      {/* Expense breakdown */}
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

      {/* Transactions */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Transactions</h2>
        <TransactionList transactions={transactions ?? []} currency={currency} />
      </div>
    </div>
  )
}
