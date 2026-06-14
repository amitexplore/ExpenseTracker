import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export async function POST(request: Request) {
  const { email, password, fullName } = await request.json()

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
  }

  // Basic format checks before hitting the DB
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
  }
  if (typeof password !== 'string' || password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // SECURITY: do NOT look up whether an email already exists and do NOT
  // overwrite passwords for existing accounts (previous code allowed full
  // account takeover — any caller could reset any user's password).
  // Use admin.createUser which fails cleanly when the email is taken.
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,   // bypass email confirmation for local dev UX
    user_metadata: { full_name: typeof fullName === 'string' ? fullName.slice(0, 100) : '' },
  })

  if (error) {
    // Return a generic message regardless of the real cause to prevent
    // user enumeration (attacker cannot tell if email is already registered)
    return NextResponse.json(
      { error: 'Could not create account. If you already have an account, please sign in.' },
      { status: 400 }
    )
  }

  // Never return the user object or internal IDs — caller only needs to know success
  return NextResponse.json({ ok: true })
}
