'use client'

import React, { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useTheme } from '@/lib/theme'
import AddTransactionButton from '@/components/transactions/AddTransactionButton'
import TransactionList from '@/components/transactions/TransactionList'
import type { Transaction, ExpenseCategory } from '@tracker/db'

type TransactionWithCategory = Transaction & {
  expense_categories: { name: string; color: string; type: string; icon: string | null } | null
}

const PAGE_SIZE = 50

export default function TransactionsPage(): React.JSX.Element {
  const { theme } = useTheme()
  const [transactions, setTransactions]     = useState<TransactionWithCategory[]>([])
  const [categories, setCategories]         = useState<{ id: string; name: string; color: string }[]>([])
  const [currency, setCurrency]             = useState('INR')
  const [userId, setUserId]                 = useState('')
  const [loading, setLoading]               = useState(true)
  const [loadingMore, setLoadingMore]       = useState(false)
  const [hasMore, setHasMore]               = useState(false)
  const [search, setSearch]                 = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')

  // Stable cursor: date of the oldest loaded row (for keyset pagination)
  const cursorRef     = useRef<string | null>(null)
  const userIdRef     = useRef('')
  const staticLoaded  = useRef(false)

  // ── Fetch one page of transactions ────────────────────────────────────────
  const fetchPage = useCallback(async (
    uid: string,
    q: string,
    cat: string,
    afterDate: string | null,
  ): Promise<TransactionWithCategory[]> => {
    const supabase = createClient()
    let query = supabase
      .from('transactions')
      .select('id,amount,date,merchant,description,is_income,category_id,source,expense_categories(name,color,type,icon)')
      .eq('user_id', uid)
      .order('date', { ascending: false })
      .limit(PAGE_SIZE + 1) // fetch one extra to know if there's a next page

    if (afterDate) query = query.lt('date', afterDate)
    if (q) {
      const safe = q.replace(/[,()."'\\]/g, '').slice(0, 100)
      if (safe) query = query.or(`merchant.ilike.%${safe}%,description.ilike.%${safe}%`)
    }
    if (cat) query = query.eq('category_id', cat)

    const { data } = await query
    return (data ?? []) as TransactionWithCategory[]
  }, [])

  // ── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      userIdRef.current = user.id
      setUserId(user.id)

      const [rows, { data: cats }, { data: profile }] = await Promise.all([
        fetchPage(user.id, '', '', null),
        supabase.from('expense_categories').select('id,name,color').eq('user_id', user.id).order('sort_order'),
        supabase.from('profiles').select('currency').eq('id', user.id).single(),
      ])

      const page     = rows.slice(0, PAGE_SIZE)
      const hasNext  = rows.length > PAGE_SIZE
      cursorRef.current = page.at(-1)?.date ?? null

      setTransactions(page)
      setHasMore(hasNext)
      setCategories(cats ?? [])
      setCurrency((profile as { currency?: string } | null)?.currency ?? 'INR')
      staticLoaded.current = true
      setLoading(false)
    }
    init()
  }, [fetchPage])

  // ── Filter / search (resets to page 1) ───────────────────────────────────
  const applyFilter = useCallback(async (q: string, cat: string) => {
    if (!userIdRef.current) return
    setLoading(true)
    cursorRef.current = null
    const rows    = await fetchPage(userIdRef.current, q, cat, null)
    const page    = rows.slice(0, PAGE_SIZE)
    const hasNext = rows.length > PAGE_SIZE
    cursorRef.current = page.at(-1)?.date ?? null
    setTransactions(page)
    setHasMore(hasNext)
    setLoading(false)
  }, [fetchPage])

  // ── Load more (next page) ─────────────────────────────────────────────────
  const loadMore = useCallback(async () => {
    if (!userIdRef.current || !cursorRef.current || loadingMore) return
    setLoadingMore(true)
    const rows    = await fetchPage(userIdRef.current, search, categoryFilter, cursorRef.current)
    const page    = rows.slice(0, PAGE_SIZE)
    const hasNext = rows.length > PAGE_SIZE
    cursorRef.current = page.at(-1)?.date ?? cursorRef.current
    setTransactions((prev) => [...prev, ...page])
    setHasMore(hasNext)
    setLoadingMore(false)
  }, [fetchPage, search, categoryFilter, loadingMore])

  function handleFilter(e: React.FormEvent) {
    e.preventDefault()
    applyFilter(search, categoryFilter)
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div
          className="w-8 h-8 border-2 rounded-full animate-spin"
          style={{ borderColor: theme.accent, borderTopColor: 'transparent' }}
        />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: theme.text.primary }}>Transactions</h1>
          <p className="text-sm mt-1" style={{ color: theme.text.muted }}>
            {transactions.length} records{hasMore ? ' (scroll for more)' : ''}
          </p>
        </div>
        <AddTransactionButton
          categories={categories}
          userId={userId}
          onAdded={() => applyFilter(search, categoryFilter)}
        />
      </div>

      {/* ── Search + filter ───────────────────────────────────────────────── */}
      <form onSubmit={handleFilter} className="flex gap-3 flex-wrap">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search merchant, description…"
          className="flex-1 min-w-48 px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2"
          style={{
            background: theme.input.bg,
            border: `1px solid ${theme.input.border}`,
            color: theme.input.text,
          }}
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2"
          style={{
            background: theme.input.bg,
            border: `1px solid ${theme.input.border}`,
            color: theme.input.text,
          }}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <button
          type="submit"
          className="px-4 py-2.5 text-sm font-medium rounded-xl transition-colors"
          style={{ background: theme.accent, color: theme.btn.primary.text }}
        >
          Filter
        </button>
      </form>

      {/* ── Transaction list ──────────────────────────────────────────────── */}
      <div
        className="rounded-2xl border p-6"
        style={{ background: theme.card.bg, border: `1px solid ${theme.card.border}` }}
      >
        <TransactionList
          transactions={transactions}
          currency={currency}
          onChanged={() => applyFilter(search, categoryFilter)}
        />
      </div>

      {/* ── Load more button ─────────────────────────────────────────────── */}
      {hasMore && (
        <div className="flex justify-center pt-2">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="px-6 py-2.5 rounded-xl text-sm font-medium transition-opacity disabled:opacity-50"
            style={{ background: theme.card.bg, border: `1px solid ${theme.card.border}`, color: theme.text.secondary }}
          >
            {loadingMore ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  )
}
