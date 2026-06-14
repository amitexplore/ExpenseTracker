import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { Database } from '@tracker/db'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

const authConfig = {
  storage: AsyncStorage,
  autoRefreshToken: true,
  persistSession: true,
  detectSessionInUrl: false,
}

// Typed client for reads — gives full autocomplete on select results
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: authConfig,
})

// Untyped client for writes — avoids `never[]` inference issues on insert/update
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabaseWrite = createClient<any>(supabaseUrl, supabaseAnonKey, {
  auth: authConfig,
})
