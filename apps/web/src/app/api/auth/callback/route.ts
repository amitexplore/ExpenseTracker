import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/** Validate that `next` is a safe internal path, not an open redirect target. */
function sanitizeNext(raw: string | null): string {
  if (!raw) return '/dashboard'
  // Only allow paths starting with a single "/" — prevents protocol-relative redirects
  if (/^\/(?!\/)/.test(raw)) return raw
  return '/dashboard'
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = sanitizeNext(searchParams.get('next'))

  if (code) {
    const cookieStore = await cookies()   // Next.js 15+: cookies() is async
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
            try {
              cookiesToSet.forEach(({ name, value, options = {} }) => {
                // Strip maxAge/expires so OAuth tokens are also session cookies
                const { maxAge, expires, ...rest } = options
                const isDelete = typeof maxAge === 'number' && maxAge <= 0
                cookieStore.set(
                  name,
                  value,
                  { ...rest, ...(isDelete ? { maxAge: 0 } : {}) } as Parameters<typeof cookieStore.set>[2]
                )
              })
            } catch {}
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
