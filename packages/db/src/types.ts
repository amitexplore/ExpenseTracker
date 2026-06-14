export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type TransactionSource = 'gmail' | 'manual' | 'bank_sms'
export type CategoryType = 'fixed' | 'variable' | 'income' | 'savings'
export type ExpenseFrequency = 'monthly' | 'yearly' | 'one_time'
export type SubscriptionTier = 'free' | 'pro' | 'team'
export type SyncStatus = 'idle' | 'syncing' | 'error'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          monthly_salary: number
          current_savings: number
          account_balance_start: number
          target_amount: number
          target_date: string | null
          currency: string
          sync_interval_minutes: number
          subscription_tier: SubscriptionTier
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          monthly_salary?: number
          current_savings?: number
          account_balance_start?: number
          target_amount?: number
          target_date?: string | null
          currency?: string
          sync_interval_minutes?: number
          subscription_tier?: SubscriptionTier
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          monthly_salary?: number
          current_savings?: number
          account_balance_start?: number
          target_amount?: number
          target_date?: string | null
          currency?: string
          sync_interval_minutes?: number
          subscription_tier?: SubscriptionTier
        }
      }
      expense_categories: {
        Row: {
          id: string
          user_id: string
          name: string
          type: CategoryType
          color: string
          icon: string | null
          is_system: boolean
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          type: CategoryType
          color: string
          icon?: string | null
          is_system?: boolean
          sort_order?: number
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          type?: CategoryType
          color?: string
          icon?: string | null
          is_system?: boolean
          sort_order?: number
        }
      }
      fixed_expenses: {
        Row: {
          id: string
          user_id: string
          category_id: string
          name: string
          amount: number
          frequency: ExpenseFrequency
          active_from: string
          active_to: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          category_id: string
          name: string
          amount: number
          frequency: ExpenseFrequency
          active_from: string
          active_to?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          category_id?: string
          name?: string
          amount?: number
          frequency?: ExpenseFrequency
          active_from?: string
          active_to?: string | null
        }
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          category_id: string | null
          amount: number
          date: string
          merchant: string | null
          description: string | null
          source: TransactionSource
          raw_email_id: string | null
          is_income: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          category_id?: string | null
          amount: number
          date: string
          merchant?: string | null
          description?: string | null
          source: TransactionSource
          raw_email_id?: string | null
          is_income?: boolean
        }
        Update: {
          id?: string
          user_id?: string
          category_id?: string | null
          amount?: number
          date?: string
          merchant?: string | null
          description?: string | null
          source?: TransactionSource
          raw_email_id?: string | null
          is_income?: boolean
        }
      }
      gmail_connections: {
        Row: {
          id: string
          user_id: string
          gmail_address: string
          access_token: string
          refresh_token: string
          token_expiry: string
          last_synced_at: string | null
          sync_status: SyncStatus
          error_message: string | null
          enabled: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          gmail_address: string
          access_token: string
          refresh_token: string
          token_expiry: string
          last_synced_at?: string | null
          sync_status?: SyncStatus
          error_message?: string | null
          enabled?: boolean
        }
        Update: {
          id?: string
          user_id?: string
          gmail_address?: string
          access_token?: string
          refresh_token?: string
          token_expiry?: string
          last_synced_at?: string | null
          sync_status?: SyncStatus
          error_message?: string | null
          enabled?: boolean
        }
      }
      monthly_snapshots: {
        Row: {
          id: string
          user_id: string
          year: number
          month: number
          starting_balance: number
          salary: number
          total_deposits: number
          total_fixed_expenses: number
          total_variable_expenses: number
          end_balance: number
          computed_at: string
        }
        Insert: {
          id?: string
          user_id: string
          year: number
          month: number
          starting_balance: number
          salary: number
          total_deposits: number
          total_fixed_expenses: number
          total_variable_expenses: number
          end_balance: number
          computed_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          year?: number
          month?: number
          starting_balance?: number
          salary?: number
          total_deposits?: number
          total_fixed_expenses?: number
          total_variable_expenses?: number
          end_balance?: number
          computed_at?: string
        }
      }
    }
    Views: Record<string, never>
    Functions: {
      recompute_monthly_snapshot: {
        Args: { p_user_id: string; p_year: number; p_month: number }
        Returns: void
      }
    }
  }
}

// Convenience row types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type ExpenseCategory = Database['public']['Tables']['expense_categories']['Row']
export type FixedExpense = Database['public']['Tables']['fixed_expenses']['Row']
export type Transaction = Database['public']['Tables']['transactions']['Row']
export type GmailConnection = Database['public']['Tables']['gmail_connections']['Row']
export type MonthlySnapshot = Database['public']['Tables']['monthly_snapshots']['Row']
