import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import AddTransactionButton from '@/components/transactions/AddTransactionButton'
import TransactionList from '@/components/transactions/TransactionList'

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: { q?: string; category?: string }
}) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  let query = supabase
    .from('transactions')
    .select('*, expense_categories(name, color, type, icon)')
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .limit(200)

  if (searchParams.q) {
    query = query.or(`merchant.ilike.%${searchParams.q}%,description.ilike.%${searchParams.q}%`)
  }
  if (searchParams.category) {
    query = query.eq('category_id', searchParams.category)
  }

  const [{ data: transactions }, { data: categories }, { data: profile }] = await Promise.all([
    query,
    supabase.from('expense_categories').select('id, name, color').eq('user_id', user.id).order('sort_order'),
    supabase.from('profiles').select('currency').eq('id', user.id).single(),
  ])

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
          <p className="text-sm text-gray-500 mt-1">{transactions?.length ?? 0} records</p>
        </div>
        <AddTransactionButton categories={categories ?? []} userId={user.id} />
      </div>

      {/* Search & filter */}
      <form className="flex gap-3">
        <input
          name="q"
          defaultValue={searchParams.q}
          placeholder="Search merchant, description..."
          className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
        />
        <select
          name="category"
          defaultValue={searchParams.category}
          className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">All categories</option>
          {(categories ?? []).map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <button
          type="submit"
          className="px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-xl transition-colors"
        >
          Filter
        </button>
      </form>

      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <TransactionList
          transactions={(transactions ?? []) as any}
          currency={profile?.currency ?? 'INR'}
        />
      </div>
    </div>
  )
}
