import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export async function POST(request: Request) {
  const { email, password, fullName } = await request.json()

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Check if user already exists
  const { data: listData } = await supabase.auth.admin.listUsers()
  const existing = listData?.users?.find((u) => u.email === email)

  if (existing) {
    // Confirm email and update password if user already exists
    const { data, error } = await supabase.auth.admin.updateUserById(existing.id, {
      email_confirm: true,
      password,
      user_metadata: { full_name: fullName ?? existing.user_metadata?.full_name ?? '' },
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ userId: data.user.id })
  }

  // Create new user via admin API — skips email confirmation entirely
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName ?? '' },
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ userId: data.user.id })
}
