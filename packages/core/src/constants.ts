export const DEFAULT_CATEGORIES = [
  { name: 'Salary', type: 'income' as const, color: '#22c55e', icon: 'briefcase' },
  { name: 'Home Loan / EMI', type: 'fixed' as const, color: '#f97316', icon: 'home' },
  { name: 'Credit Card', type: 'fixed' as const, color: '#ef4444', icon: 'credit-card' },
  { name: 'RD / Investment', type: 'savings' as const, color: '#3b82f6', icon: 'piggy-bank' },
  { name: 'School Fees', type: 'fixed' as const, color: '#a855f7', icon: 'graduation-cap' },
  { name: 'Groceries', type: 'variable' as const, color: '#84cc16', icon: 'shopping-cart' },
  { name: 'Amazon', type: 'variable' as const, color: '#f59e0b', icon: 'package' },
  { name: 'Blinkit', type: 'variable' as const, color: '#fde047', icon: 'zap' },
  { name: 'Zepto', type: 'variable' as const, color: '#818cf8', icon: 'shopping-bag' },
  { name: 'Misc', type: 'variable' as const, color: '#94a3b8', icon: 'more-horizontal' },
] as const

export const SYNC_INTERVAL_OPTIONS = [
  { label: 'Every 15 minutes', value: 15 },
  { label: 'Every 30 minutes', value: 30 },
  { label: 'Every hour', value: 60 },
  { label: 'Every 4 hours', value: 240 },
  { label: 'Once a day', value: 1440 },
] as const

export const CURRENCY_OPTIONS = [
  { label: 'Indian Rupee (₹)', value: 'INR' },
  { label: 'US Dollar ($)', value: 'USD' },
  { label: 'Euro (€)', value: 'EUR' },
] as const
