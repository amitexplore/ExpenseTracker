import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')!
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!

const MERCHANT_PATTERNS = [
  { merchant: 'Amazon',  senderPattern: /auto-confirm@amazon\.in/i,    amountPattern: /(?:order total|grand total)[^\d]*₹?\s*([\d,]+\.?\d*)/i },
  { merchant: 'Blinkit', senderPattern: /noreply@blinkit\.com/i,        amountPattern: /(?:total|amount paid|bill amount)[^\d]*₹?\s*([\d,]+\.?\d*)/i },
  { merchant: 'Zepto',   senderPattern: /orders@zeptonow\.com/i,        amountPattern: /(?:total|amount paid|order total)[^\d]*₹?\s*([\d,]+\.?\d*)/i },
  { merchant: 'Swiggy',  senderPattern: /noreply@swiggy\.in/i,          amountPattern: /(?:total|amount paid|bill total)[^\d]*₹?\s*([\d,]+\.?\d*)/i },
  { merchant: 'Zomato',  senderPattern: /noreply@zomato\.com/i,         amountPattern: /(?:total|bill amount|amount paid)[^\d]*₹?\s*([\d,]+\.?\d*)/i },
  { merchant: 'Flipkart',senderPattern: /noreply@flipkart\.com/i,       amountPattern: /(?:order total|total amount)[^\d]*₹?\s*([\d,]+\.?\d*)/i },
]

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  // Find all users whose sync is due
  const { data: connections } = await supabase
    .from('gmail_connections')
    .select('*, profiles!inner(sync_interval_minutes)')
    .eq('enabled', true)
    .neq('sync_status', 'syncing')

  if (!connections || connections.length === 0) {
    return new Response(JSON.stringify({ processed: 0 }), { status: 200 })
  }

  const now = new Date()
  let processed = 0

  for (const conn of connections) {
    const intervalMinutes = (conn.profiles as any).sync_interval_minutes ?? 60
    const lastSync = conn.last_synced_at ? new Date(conn.last_synced_at) : new Date(0)
    const minutesSince = (now.getTime() - lastSync.getTime()) / 60000

    if (minutesSince < intervalMinutes) continue

    try {
      await syncUser(supabase, conn)
      processed++
    } catch (err) {
      console.error(`Sync failed for ${conn.user_id}:`, err)
    }
  }

  return new Response(JSON.stringify({ processed }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})

async function syncUser(supabase: ReturnType<typeof createClient>, conn: Record<string, unknown>) {
  const userId = conn.user_id as string
  const connId = conn.id as string

  await supabase
    .from('gmail_connections')
    .update({ sync_status: 'syncing' })
    .eq('id', connId)

  let accessToken = conn.access_token as string

  // Refresh token if expired
  if (new Date(conn.token_expiry as string) <= new Date()) {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: conn.refresh_token as string,
        grant_type: 'refresh_token',
      }),
    })
    if (!res.ok) throw new Error('Token refresh failed')
    const data = await res.json()
    accessToken = data.access_token
    await supabase
      .from('gmail_connections')
      .update({
        access_token: data.access_token,
        token_expiry: new Date(Date.now() + data.expires_in * 1000).toISOString(),
      })
      .eq('id', connId)
  }

  const since = conn.last_synced_at as string | null
  const emails = await fetchOrderEmails(accessToken, since)

  const { data: existingTxs } = await supabase
    .from('transactions')
    .select('raw_email_id')
    .eq('user_id', userId)
    .not('raw_email_id', 'is', null)

  const existingIds = new Set((existingTxs ?? []).map((t: Record<string, string>) => t.raw_email_id))

  const newTxs = emails
    .map(parseEmail)
    .filter((t): t is NonNullable<typeof t> => t !== null)
    .filter((t) => !existingIds.has(t.rawEmailId))

  if (newTxs.length > 0) {
    const { data: categories } = await supabase
      .from('expense_categories')
      .select('id, name')
      .eq('user_id', userId)

    const categoryMap = new Map(
      (categories ?? []).map((c: Record<string, string>) => [c.name.toLowerCase(), c.id])
    )

    await supabase.from('transactions').insert(
      newTxs.map((tx) => ({
        user_id: userId,
        amount: tx.amount,
        date: tx.date.toISOString().split('T')[0],
        merchant: tx.merchant,
        description: tx.description,
        source: 'gmail',
        raw_email_id: tx.rawEmailId,
        is_income: false,
        category_id: categoryMap.get(tx.merchant.toLowerCase()) ?? null,
      }))
    )

    // Recompute monthly snapshots
    const months = new Set(newTxs.map((tx) => `${tx.date.getFullYear()}-${tx.date.getMonth() + 1}`))
    for (const ym of months) {
      const [y, m] = ym.split('-').map(Number)
      await supabase.rpc('recompute_monthly_snapshot', { p_user_id: userId, p_year: y, p_month: m })
    }
  }

  await supabase
    .from('gmail_connections')
    .update({ sync_status: 'idle', last_synced_at: new Date().toISOString(), error_message: null })
    .eq('id', connId)
}

function parseEmail(email: { id: string; from: string; subject: string; body: string; date: string }) {
  for (const p of MERCHANT_PATTERNS) {
    if (!p.senderPattern.test(email.from)) continue
    const match = email.body.match(p.amountPattern) ?? email.subject.match(p.amountPattern)
    if (!match) continue
    const amount = parseFloat(match[1].replace(/,/g, ''))
    if (!amount || amount <= 0) continue
    return {
      merchant: p.merchant,
      amount,
      date: new Date(email.date),
      description: email.subject,
      rawEmailId: email.id,
    }
  }
  return null
}

async function fetchOrderEmails(
  accessToken: string,
  since: string | null,
): Promise<{ id: string; from: string; subject: string; body: string; date: string }[]> {
  const senders = [
    'from:auto-confirm@amazon.in',
    'from:noreply@blinkit.com',
    'from:orders@zeptonow.com',
    'from:noreply@swiggy.in',
    'from:noreply@zomato.com',
    'from:noreply@flipkart.com',
  ].join(' OR ')

  const afterFilter = since ? ` after:${Math.floor(new Date(since).getTime() / 1000)}` : ''
  const q = encodeURIComponent(`(${senders})${afterFilter}`)

  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${q}&maxResults=50`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  if (!listRes.ok) throw new Error('Gmail list failed')
  const listData = await listRes.json()
  const messages: { id: string }[] = listData.messages ?? []

  const emails = []
  for (const msg of messages) {
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
    let body = ''
    for (const part of (msgData.payload?.parts ?? [msgData.payload])) {
      if (part?.mimeType === 'text/plain' && part.body?.data) {
        const bytes = Uint8Array.from(atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))
        body = new TextDecoder().decode(bytes)
        break
      }
    }
    emails.push({ id: msg.id, from, subject, body, date })
  }
  return emails
}
