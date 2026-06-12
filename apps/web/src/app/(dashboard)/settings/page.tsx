import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import ProfileForm from '@/components/settings/ProfileForm'
import FixedExpensesManager from '@/components/settings/FixedExpensesManager'
import GmailConnectCard from '@/components/settings/GmailConnectCard'
import SyncIntervalCard from '@/components/settings/SyncIntervalCard'

export default async function SettingsPage() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: fixedExpenses }, { data: categories }, { data: gmailConnection }] =
    await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase
        .from('fixed_expenses')
        .select('*, expense_categories(name, color)')
        .eq('user_id', user.id)
        .order('created_at'),
      supabase
        .from('expense_categories')
        .select('id, name, color, type')
        .eq('user_id', user.id)
        .order('sort_order'),
      supabase
        .from('gmail_connections')
        .select('gmail_address, sync_status, last_synced_at, enabled')
        .eq('user_id', user.id)
        .single(),
    ])

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your profile, income, and expenses</p>
      </div>

      <ProfileForm profile={profile} userId={user.id} />
      <FixedExpensesManager fixedExpenses={fixedExpenses ?? []} categories={categories ?? []} userId={user.id} />
      <GmailConnectCard connection={gmailConnection} />
      <SyncIntervalCard profile={profile} userId={user.id} />
    </div>
  )
}
