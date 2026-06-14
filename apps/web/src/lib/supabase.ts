import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@tracker/db'

// ── Cookie helpers ────────────────────────────────────────────────────────────
// We override cookie writing so that auth tokens are stored as SESSION cookies
// (no Max-Age / Expires). Browsers clear session cookies when the window is
// closed, which means users are automatically logged out on browser close.

function readAllCookies(): { name: string; value: string }[] {
  if (typeof document === 'undefined') return []
  return document.cookie
    .split(';')
    .filter(Boolean)
    .map((c) => {
      const eq = c.indexOf('=')
      return {
        name:  c.slice(0, eq).trim(),
        value: c.slice(eq + 1).trim(),
      }
    })
}

type CookieOptions = { maxAge?: number; path?: string; sameSite?: string; secure?: boolean }

function writeCookie(name: string, value: string, options: CookieOptions) {
  if (typeof document === 'undefined') return
  const path     = options.path ?? '/'
  const sameSite = options.sameSite ?? 'Lax'
  const secure   = options.secure ? '; Secure' : ''

  if (options.maxAge !== undefined && options.maxAge <= 0) {
    // Deletion: expire immediately
    document.cookie = `${name}=; Path=${path}; Max-Age=0; SameSite=${sameSite}${secure}`
  } else {
    // Session cookie: omit Max-Age and Expires so the browser clears it on close
    document.cookie = `${name}=${value}; Path=${path}; SameSite=${sameSite}${secure}`
  }
}

function makeClient<DB = Database>() {
  return createBrowserClient<DB>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: readAllCookies,
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            writeCookie(name, value, options as CookieOptions)
          )
        },
      },
    }
  )
}

/** Typed client — use for reads and RPC calls */
export function createClient() {
  return makeClient<Database>()
}

/** Untyped client for writes that hit TypeScript's Supabase generic limits */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createWriteClient(): any {
  return makeClient()
}
