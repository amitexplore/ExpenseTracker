'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import AddTransactionButton from '@/components/transactions/AddTransactionButton'
import TransactionList from '@/components/transactions/TransactionList'
import type { Transaction, ExpenseCategory } from '@tracker/db'

type TransactionWithCategory = Transaction & {
  expense_categories: { name: string; color: string; type: string; icon: string | null } | null
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<TransactionWithCategory[]>([])
  const [categories, setCategories] = useState<{ id: string; name: string; color: string }[]>([])
  const [currency, setCurrency] = useState('INR')
  const [userId, setUserId] = useState('')
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')

  async function load(q = '', cat = '') {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setUserId(user.id)

    let query = supabase
      .from('transactions')
      .select('*, expense_categories(name, color, type, icon)')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(200)

    if (q) query = query.or(`merchant.ilike.%${q}%,description.ilike.%${q}%`)
    if (cat) query = query.eq('category_id', cat)

    const [{ data: txs }, { data: cats }, { data: profile }] = await Promise.all([
      query,
      supabase.from('expense_categories').select('id, name, color').eq('user_id', user.id).order('sort_order'),
      supabase.from('profiles').select('currency').eq('id', user.id).single(),
    ])

    setTransactions((txs ?? []) as TransactionWithCategory[])
    setCategories(cats ?? [])
    setCurrency(profile?.currency ?? 'INR')
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function handleFilter(e: React.FormEvent) {
    e.preventDefault()
    load(search, categoryFilter)
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
          <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
          <p className="text-sm text-gray-500 mt-1">{transactions.length} records</p>
        </div>
        <AddTransactionButton categories={categories} userId={userId} onAdded={() => load(search, categoryFilter)} />
      </div>

      <form onSubmit={handleFilter} className="flex gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search merchant, description..."
          className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <button type="submit" className="px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-xl transition-colors">
          Filter
        </button>
      </form>

      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <TransactionList transactions={transactions} currency={currency} />
      </div>
    </div>
  )
}
