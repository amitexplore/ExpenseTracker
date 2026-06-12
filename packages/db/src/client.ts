import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

export function createSupabaseClient(supabaseUrl: string, supabaseAnonKey: string) {
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  })
}

export function createSupabaseServiceClient(supabaseUrl: string, supabaseServiceKey: string) {
  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

export type SupabaseClient = ReturnType<typeof createSupabaseClient>
