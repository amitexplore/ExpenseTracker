'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import ProfileForm from '@/components/settings/ProfileForm'
import FixedExpensesManager from '@/components/settings/FixedExpensesManager'
import GmailConnectCard from '@/components/settings/GmailConnectCard'
import SyncIntervalCard from '@/components/settings/SyncIntervalCard'
import type { Profile, FixedExpense, ExpenseCategory } from '@tracker/db'

type FixedExpenseWithCategory = FixedExpense & {
  expense_categories: { name: string; color: string } | null
}

type GmailConn = {
  gmail_address: string
  sync_status: string
  last_synced_at: string | null
  enabled: boolean
} | null

export default function SettingsPage() {
  const [userId, setUserId] = useState('')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpenseWithCategory[]>([])
  const [categories, setCategories] = useState<Pick<ExpenseCategory, 'id' | 'name' | 'color' | 'type'>[]>([])
  const [gmailConnection, setGmailConnection] = useState<GmailConn>(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)

    const [{ data: p }, { data: fe }, { data: cats }, { data: gmail }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('fixed_expenses').select('*, expense_categories(name, color)').eq('user_id', user.id).order('created_at'),
      supabase.from('expense_categories').select('id, name, color, type').eq('user_id', user.id).order('sort_order'),
      supabase.from('gmail_connections').select('gmail_address, sync_status, last_synced_at, enabled').eq('user_id', user.id).single(),
    ])

    setProfile(p)
    setFixedExpenses((fe ?? []) as FixedExpenseWithCategory[])
    setCategories(cats ?? [])
    setGmailConnection(gmail)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your profile, income, and expenses</p>
      </div>
      <ProfileForm profile={profile} userId={userId} />
      <FixedExpensesManager fixedExpenses={fixedExpenses} categories={categories} userId={userId} onChanged={load} />
      <GmailConnectCard connection={gmailConnection} />
      <SyncIntervalCard profile={profile} userId={userId} />
    </div>
  )
}
