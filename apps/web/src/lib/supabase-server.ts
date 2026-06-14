import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { Database } from '@tracker/db'

/**
 * Server-side Supabase client for Route Handlers and Server Components.
 * Async because Next.js 15+ requires `await cookies()`.
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options = {} }) => {
              // Strip maxAge/expires to keep server-refreshed tokens as session cookies
              const { maxAge, expires, ...rest } = options
              const isDelete = typeof maxAge === 'number' && maxAge <= 0
              cookieStore.set(
                name,
                value,
                { ...rest, ...(isDelete ? { maxAge: 0 } : {}) } as Parameters<typeof cookieStore.set>[2]
              )
            })
          } catch {
            // Called from a Server Component; cookie writes are not possible there
          }
        },
      },
    },
  )
}

/** Service-role client — for admin operations in server-only contexts. Never expose to the client. */
export function createServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}
