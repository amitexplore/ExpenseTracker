import { z } from 'zod'

export const ProfileSchema = z.object({
  monthly_salary: z.number().min(0, 'Salary must be positive'),
  target_amount: z.number().min(0, 'Target amount must be positive'),
  target_date: z.string().nullable(),
  currency: z.string().default('INR'),
  sync_interval_minutes: z.number().min(15).max(1440).default(60),
})

export const TransactionSchema = z.object({
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  date: z.string().min(1, 'Date is required'),
  merchant: z.string().max(100).nullable(),
  description: z.string().max(500).nullable(),
  category_id: z.string().uuid().nullable(),
  is_income: z.boolean().default(false),
  source: z.enum(['gmail', 'manual', 'bank_sms']).default('manual'),
})

export const FixedExpenseSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  amount: z.number().min(0.01, 'Amount must be positive'),
  frequency: z.enum(['monthly', 'yearly', 'one_time']),
  category_id: z.string().uuid(),
  active_from: z.string().min(1),
  active_to: z.string().nullable(),
})

export const CategorySchema = z.object({
  name: z.string().min(1).max(50),
  type: z.enum(['fixed', 'variable', 'income', 'savings']),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color'),
  icon: z.string().nullable(),
})

export type ProfileInput = z.infer<typeof ProfileSchema>
export type TransactionInput = z.infer<typeof TransactionSchema>
export type FixedExpenseInput = z.infer<typeof FixedExpenseSchema>
export type CategoryInput = z.infer<typeof CategorySchema>
