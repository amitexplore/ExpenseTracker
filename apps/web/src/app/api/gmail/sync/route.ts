import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { parseMultipleEmails, deduplicateTransactions } from '@tracker/core'
import type { RawEmail } from '@tracker/core'

export async function POST() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: gmailConn } = await supabase
    .from('gmail_connections')
    .select('*')
    .eq('user_id', user.id)
    .eq('enabled', true)
    .single()

  if (!gmailConn) {
    return NextResponse.json({ error: 'No Gmail connection found' }, { status: 400 })
  }

  // Mark syncing
  await supabase
    .from('gmail_connections')
    .update({ sync_status: 'syncing' })
    .eq('id', gmailConn.id)

  try {
    // Refresh the access token if expired
    let accessToken = gmailConn.access_token
    if (new Date(gmailConn.token_expiry) <= new Date()) {
      const refreshed = await refreshGmailToken(gmailConn.refresh_token)
      if (!refreshed) throw new Error('Failed to refresh Gmail token')
      accessToken = refreshed.access_token
      await supabase
        .from('gmail_connections')
        .update({
          access_token: refreshed.access_token,
          token_expiry: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
        })
        .eq('id', gmailConn.id)
    }

    // Fetch emails from Gmail API
    const emails = await fetchOrderEmails(accessToken, gmailConn.last_synced_at)

    // Get existing email IDs to avoid duplicates
    const { data: existingTxs } = await supabase
      .from('transactions')
      .select('raw_email_id')
      .eq('user_id', user.id)
      .not('raw_email_id', 'is', null)

    const existingIds = new Set((existingTxs ?? []).map((t) => t.raw_email_id!))

    // Parse and deduplicate
    const parsed = parseMultipleEmails(emails)
    const newTxs = deduplicateTransactions(parsed, existingIds)

    if (newTxs.length > 0) {
      // Get category IDs for merchants
      const { data: categories } = await supabase
        .from('expense_categories')
        .select('id, name')
        .eq('user_id', user.id)

      const categoryMap = new Map((categories ?? []).map((c) => [c.name.toLowerCase(), c.id]))

      const inserts = newTxs.map((tx) => ({
        user_id: user.id,
        amount: tx.amount,
        date: tx.date.toISOString().split('T')[0],
        merchant: tx.merchant,
        description: tx.description,
        source: 'gmail' as const,
        raw_email_id: tx.rawEmailId,
        is_income: false,
        category_id: categoryMap.get(tx.merchant.toLowerCase()) ?? null,
      }))

      await supabase.from('transactions').insert(inserts)
    }

    // Update sync status
    await supabase
      .from('gmail_connections')
      .update({ sync_status: 'idle', last_synced_at: new Date().toISOString(), error_message: null })
      .eq('id', gmailConn.id)

    // Trigger snapshot recomputation for affected months
    const affectedMonths = new Set(
      newTxs.map((tx) => `${tx.date.getFullYear()}-${tx.date.getMonth() + 1}`)
    )
    for (const ym of affectedMonths) {
      const [y, m] = ym.split('-').map(Number)
      await supabase.rpc('recompute_monthly_snapshot', {
        p_user_id: user.id,
        p_year: y,
        p_month: m,
      })
    }

    return NextResponse.json({ imported: newTxs.length })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    await supabase
      .from('gmail_connections')
      .update({ sync_status: 'error', error_message: message })
      .eq('id', gmailConn.id)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

async function refreshGmailToken(refreshToken: string) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  if (!res.ok) return null
  return res.json() as Promise<{ access_token: string; expires_in: number }>
}

async function fetchOrderEmails(accessToken: string, since: string | null): Promise<RawEmail[]> {
  const senders = [
    'from:auto-confirm@amazon.in',
    'from:noreply@blinkit.com',
    'from:orders@zeptonow.com',
    'from:noreply@swiggy.in',
    'from:noreply@zomato.com',
    'from:noreply@flipkart.com',
  ].join(' OR ')

  const afterFilter = since ? ` after:${Math.floor(new Date(since).getTime() / 1000)}` : ''
  const query = encodeURIComponent(`(${senders})${afterFilter}`)

  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${query}&maxResults=50`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )

  if (!listRes.ok) throw new Error('Failed to list Gmail messages')
  const listData = await listRes.json()
  const messages: { id: string }[] = listData.messages ?? []

  const emails: RawEmail[] = []
  for (const msg of messages) {
    try {
      const msgRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )
      if (!msgRes.ok) continue
      const msgData = await msgRes.json()

      const headers: { name: string; value: string }[] = msgData.payload?.headers ?? []
      const from = headers.find((h) => h.name === 'From')?.value ?? ''
      const subject = headers.find((h) => h.name === 'Subject')?.value ?? ''
      const date = headers.find((h) => h.name === 'Date')?.value ?? new Date().toISOString()

      // Extract body text
      let body = ''
      const parts = msgData.payload?.parts ?? [msgData.payload]
      for (const part of parts) {
        if (part?.mimeType === 'text/plain' && part.body?.data) {
          body = Buffer.from(part.body.data, 'base64').toString('utf-8')
          break
        }
        if (part?.mimeType === 'text/html' && part.body?.data) {
          const html = Buffer.from(part.body.data, 'base64').toString('utf-8')
          body = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
          break
        }
      }

      emails.push({ id: msg.id, from, subject, body, date })
    } catch {
      // Skip malformed messages
    }
  }

  return emails
}
