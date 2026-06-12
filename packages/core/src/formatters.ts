/**
 * Format a number as Indian Rupees (INR)
 */
export function formatINR(amount: number, compact = false): string {
  if (compact && Math.abs(amount) >= 100000) {
    const lakhs = amount / 100000
    return `₹${lakhs.toFixed(2)}L`
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Format a number as currency for any currency code
 */
export function formatCurrency(amount: number, currency = 'INR', compact = false): string {
  if (currency === 'INR') return formatINR(amount, compact)
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const

export const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const
