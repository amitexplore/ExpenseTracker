import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@tracker/db'

// Typed client — use this for reads and RPC calls
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

// Untyped client for writes that hit TypeScript's Supabase generic limits
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createWriteClient(): any {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
