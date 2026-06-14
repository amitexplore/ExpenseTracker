import { NextResponse, type NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { encrypt } from '@/lib/encryption'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(`${origin}/settings?error=gmail_connect_failed`)
  }

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(`${origin}/login`)
  }

  try {
    // Exchange authorisation code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id:     process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri:  `${origin}/api/gmail/callback`,
        grant_type:    'authorization_code',
      }),
    })

    if (!tokenRes.ok) throw new Error('Token exchange failed')
    const tokens = await tokenRes.json()

    // Get the Gmail address for this OAuth grant
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    if (!profileRes.ok) throw new Error('Failed to fetch Gmail profile')
    const profileData = await profileRes.json()

    // Encrypt tokens before persisting — they are decrypted on demand in the sync route
    const encryptedAccessToken  = encrypt(tokens.access_token)
    const encryptedRefreshToken = tokens.refresh_token ? encrypt(tokens.refresh_token) : undefined

    await (supabase as any).from('gmail_connections').upsert({
      user_id:      user.id,
      gmail_address: profileData.email,
      access_token: encryptedAccessToken,
      // Only update refresh_token when Google provides one (not on every re-auth)
      ...(encryptedRefreshToken ? { refresh_token: encryptedRefreshToken } : {}),
      token_expiry: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      enabled:      true,
      sync_status:  'idle',
    }, { onConflict: 'user_id' })

    return NextResponse.redirect(`${origin}/settings?gmail=connected`)
  } catch {
    // Never expose internal errors to the client
    return NextResponse.redirect(`${origin}/settings?error=gmail_connect_failed`)
  }
}
