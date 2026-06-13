'use client'

import { formatCurrency } from '@tracker/core'
import type { SavingsProgress } from '@tracker/core'
import { format } from 'date-fns'
import { Target, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react'

interface SavingsProgressCardProps {
  progress: SavingsProgress
  currency: string
  currentSavings?: number
  targetDate?: string | null
}

export default function SavingsProgressCard({ progress, currency, currentSavings = 0, targetDate }: SavingsProgressCardProps) {
  const { targetAmount, actualAmount, difference, percentageAchieved, monthsRemaining, projectedDate, onTrack } = progress
  // actualAmount = end_balance, which already starts from currentSavings as base —
  // use it directly as total wealth; never add currentSavings again
  const netGoalRemaining = Math.max(0, difference)   // difference = targetAmount - actualAmount
  const newSavings = Math.max(0, actualAmount - currentSavings)
  const clampedPct = Math.min(100, Math.max(0, percentageAchieved))

  const circumference = 2 * Math.PI * 54
  const strokeDashoffset = circumference - (clampedPct / 100) * circumference

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Ring + main numbers */}
      <div className="md:col-span-2 bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-start gap-6">
          {/* SVG ring */}
          <div className="relative flex-shrink-0">
            <svg width="128" height="128" viewBox="0 0 128 128" className="-rotate-90">
              <circle cx="64" cy="64" r="54" fill="none" stroke="#f1f5f9" strokeWidth="12" />
              <circle
                cx="64" cy="64" r="54"
                fill="none"
                stroke={onTrack ? '#22c55e' : '#f97316'}
                strokeWidth="12"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 0.6s ease' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-bold text-gray-900">{clampedPct.toFixed(1)}%</span>
              <span className="text-xs text-gray-400">achieved</span>
            </div>
          </div>

          <div className="flex-1 space-y-4">
            <div>
              <p className="text-sm text-gray-500 flex items-center gap-1.5">
                <Target className="w-4 h-4" /> Savings Target
              </p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(targetAmount, currency)}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-400">Total savings</p>
                <p className="text-lg font-semibold text-brand-600">
                  {formatCurrency(actualAmount, currency)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Still needed</p>
                <p className="text-lg font-semibold text-gray-700">
                  {formatCurrency(netGoalRemaining, currency)}
                </p>
              </div>
            </div>

            {currentSavings > 0 && (
              <div className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
                <span className="font-medium text-gray-600">{formatCurrency(currentSavings, currency)}</span> existing
                {newSavings > 0 && (
                  <> + <span className="font-medium text-green-600">+{formatCurrency(newSavings, currency)}</span> added via app</>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 flex-wrap">
              {onTrack ? (
                <CheckCircle className="w-4 h-4 text-brand-500" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-orange-500" />
              )}
              <span className={`text-sm font-medium ${onTrack ? 'text-brand-600' : 'text-orange-600'}`}>
                {onTrack ? 'On track!' : 'Behind target'}
              </span>
              {projectedDate && targetDate && (
                <span className="text-sm text-gray-400">
                  · Projected: {format(projectedDate, 'MMM yyyy')}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 bg-gray-100 rounded-full h-2">
          <div
            className="h-2 rounded-full transition-all duration-500"
            style={{
              width: `${clampedPct}%`,
              backgroundColor: onTrack ? '#22c55e' : '#f97316',
            }}
          />
        </div>
      </div>

      {/* Stat cards */}
      <div className="space-y-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <TrendingUp className="w-4 h-4 text-brand-500" />
            Months to goal
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {monthsRemaining !== null ? monthsRemaining : '—'}
          </p>
          <p className="text-xs text-gray-400 mt-1">at current pace</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Target className="w-4 h-4 text-purple-500" />
            Target date
          </div>
          <p className="text-lg font-bold text-gray-900">
            {targetDate ? format(new Date(targetDate), 'MMM d, yyyy') : 'Not set'}
          </p>
          {projectedDate && !targetDate && (
            <p className="text-xs text-gray-400 mt-1">
              Projected: {format(projectedDate, 'MMM yyyy')}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
