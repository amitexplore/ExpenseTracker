import type { MonthlySnapshot, FixedExpense } from '@tracker/db'

export interface MonthlySummary {
  year: number
  month: number
  startingBalance: number
  salary: number
  totalDeposits: number
  totalFixedExpenses: number
  totalVariableExpenses: number
  totalExpenses: number
  endBalance: number
  savingsRate: number
}

export function computeMonthlySummary(snapshot: MonthlySnapshot): MonthlySummary {
  const totalExpenses = snapshot.total_fixed_expenses + snapshot.total_variable_expenses
  const totalIncome = snapshot.salary + snapshot.total_deposits
  const savingsRate = totalIncome > 0
    ? ((snapshot.end_balance - snapshot.starting_balance) / totalIncome) * 100
    : 0

  return {
    year: snapshot.year,
    month: snapshot.month,
    startingBalance: snapshot.starting_balance,
    salary: snapshot.salary,
    totalDeposits: snapshot.total_deposits,
    totalFixedExpenses: snapshot.total_fixed_expenses,
    totalVariableExpenses: snapshot.total_variable_expenses,
    totalExpenses,
    endBalance: snapshot.end_balance,
    savingsRate,
  }
}

export interface SavingsProgress {
  targetAmount: number
  actualAmount: number
  difference: number
  percentageAchieved: number
  monthsRemaining: number | null
  projectedDate: Date | null
  onTrack: boolean
}

export function computeSavingsProgress(
  targetAmount: number,
  targetDate: string | null,
  currentSavings: number,
  monthlySavingsAvg: number,
): SavingsProgress {
  const difference = targetAmount - currentSavings
  const percentageAchieved = targetAmount > 0 ? (currentSavings / targetAmount) * 100 : 0

  let monthsRemaining: number | null = null
  let projectedDate: Date | null = null
  let onTrack = false

  if (monthlySavingsAvg > 0 && difference > 0) {
    monthsRemaining = Math.ceil(difference / monthlySavingsAvg)
    projectedDate = new Date()
    projectedDate.setMonth(projectedDate.getMonth() + monthsRemaining)
  } else if (difference <= 0) {
    monthsRemaining = 0
    onTrack = true
  }

  if (targetDate && projectedDate) {
    onTrack = projectedDate <= new Date(targetDate)
  }

  return {
    targetAmount,
    actualAmount: currentSavings,
    difference,
    percentageAchieved,
    monthsRemaining,
    projectedDate,
    onTrack,
  }
}

/**
 * Compute which fixed expenses apply in a given month/year
 */
export function getActiveFixedExpenses(
  fixedExpenses: FixedExpense[],
  year: number,
  month: number,
): FixedExpense[] {
  const date = new Date(year, month - 1, 1)
  return fixedExpenses.filter((fe) => {
    const activeFrom = new Date(fe.active_from)
    const activeTo = fe.active_to ? new Date(fe.active_to) : null
    return date >= activeFrom && (activeTo === null || date <= activeTo)
  })
}

/**
 * Calculate average monthly savings from a list of snapshots
 */
export function calcAvgMonthlySavings(snapshots: MonthlySnapshot[]): number {
  if (snapshots.length === 0) return 0
  const totalSavings = snapshots.reduce((sum, s) => {
    return sum + (s.end_balance - s.starting_balance)
  }, 0)
  return totalSavings / snapshots.length
}

/**
 * Get cumulative savings across all snapshots (end balance of last month)
 */
export function getCumulativeSavings(snapshots: MonthlySnapshot[]): number {
  if (snapshots.length === 0) return 0
  const sorted = [...snapshots].sort((a, b) =>
    a.year !== b.year ? a.year - b.year : a.month - b.month
  )
  return sorted[sorted.length - 1].end_balance
}
