'use client'

import React from 'react'

import { formatCurrency } from '@tracker/core'
import type { SavingsProgress } from '@tracker/core'
import { format } from 'date-fns'
import { Target, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react'
import { useTheme } from '@/lib/theme'

interface SavingsProgressCardProps {
  progress: SavingsProgress
  currency: string
  currentSavings?: number
  targetDate?: string | null
}

export default function SavingsProgressCard({ progress, currency, currentSavings = 0, targetDate }: SavingsProgressCardProps): React.JSX.Element {
  const { theme } = useTheme()
  const { targetAmount, actualAmount, difference, percentageAchieved, monthsRemaining, projectedDate, onTrack } = progress
  const netGoalRemaining = Math.max(0, difference)
  const clampedPct = Math.min(100, Math.max(0, percentageAchieved))

  const circumference = 2 * Math.PI * 54
  const strokeDashoffset = circumference - (clampedPct / 100) * circumference
  const ringColor = onTrack ? theme.positive : theme.savingsAccent

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Ring + main numbers */}
      <div
        className="md:col-span-2 rounded-2xl p-6"
        style={{ background: theme.card.bg, border: `1px solid ${theme.card.border}` }}
      >
        <div className="flex items-start gap-6">
          {/* SVG ring */}
          <div className="relative flex-shrink-0">
            <svg width="128" height="128" viewBox="0 0 128 128" className="-rotate-90">
              <circle cx="64" cy="64" r="54" fill="none" stroke={theme.ring.track} strokeWidth="12" />
              <circle
                cx="64" cy="64" r="54"
                fill="none"
                stroke={ringColor}
                strokeWidth="12"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 0.6s ease' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-bold" style={{ color: theme.text.primary }}>{clampedPct.toFixed(1)}%</span>
              <span className="text-xs" style={{ color: theme.text.muted }}>achieved</span>
            </div>
          </div>

          <div className="flex-1 space-y-4">
            <div>
              <p className="text-sm flex items-center gap-1.5" style={{ color: theme.text.secondary }}>
                <Target className="w-4 h-4" /> Savings Target
              </p>
              <p className="text-2xl font-bold mt-1" style={{ color: theme.text.primary }}>
                {formatCurrency(targetAmount, currency)}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs" style={{ color: theme.text.muted }}>Total savings</p>
                <p className="text-lg font-semibold" style={{ color: theme.savingsAccent }}>
                  {formatCurrency(actualAmount, currency)}
                </p>
              </div>
              <div>
                <p className="text-xs" style={{ color: theme.text.muted }}>Still needed</p>
                <p className="text-lg font-semibold" style={{ color: theme.text.secondary }}>
                  {formatCurrency(netGoalRemaining, currency)}
                </p>
              </div>
            </div>

            <div
              className="text-xs rounded-lg px-3 py-2"
              style={{ background: theme.accentBg, color: theme.text.muted }}
            >
              Total Savings grow when you transfer from your Account Balance on the dashboard.
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {onTrack ? (
                <CheckCircle className="w-4 h-4" style={{ color: theme.positive }} />
              ) : (
                <AlertTriangle className="w-4 h-4" style={{ color: theme.savingsAccent }} />
              )}
              <span className="text-sm font-medium" style={{ color: onTrack ? theme.positive : theme.savingsAccent }}>
                {onTrack ? 'On track!' : 'Behind target'}
              </span>
              {projectedDate && targetDate && (
                <span className="text-sm" style={{ color: theme.text.muted }}>
                  · Projected: {format(projectedDate, 'MMM yyyy')}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-full h-2" style={{ background: theme.ring.track }}>
          <div
            className="h-2 rounded-full transition-all duration-500"
            style={{ width: `${clampedPct}%`, backgroundColor: ringColor }}
          />
        </div>
      </div>

      {/* Stat cards */}
      <div className="space-y-4">
        <div
          className="rounded-2xl p-5"
          style={{ background: theme.card.bg, border: `1px solid ${theme.card.border}` }}
        >
          <div className="flex items-center gap-2 text-sm mb-1" style={{ color: theme.text.secondary }}>
            <TrendingUp className="w-4 h-4" style={{ color: theme.accent }} />
            Months to goal
          </div>
          <p className="text-3xl font-bold" style={{ color: theme.text.primary }}>
            {monthsRemaining !== null ? monthsRemaining : '—'}
          </p>
          <p className="text-xs mt-1" style={{ color: theme.text.muted }}>at current pace</p>
        </div>

        <div
          className="rounded-2xl p-5"
          style={{ background: theme.card.bg, border: `1px solid ${theme.card.border}` }}
        >
          <div className="flex items-center gap-2 text-sm mb-1" style={{ color: theme.text.secondary }}>
            <Target className="w-4 h-4" style={{ color: theme.savingsAccent }} />
            Target date
          </div>
          <p className="text-lg font-bold" style={{ color: theme.text.primary }}>
            {targetDate ? format(new Date(targetDate), 'MMM d, yyyy') : 'Not set'}
          </p>
          {projectedDate && !targetDate && (
            <p className="text-xs mt-1" style={{ color: theme.text.muted }}>
              Projected: {format(projectedDate, 'MMM yyyy')}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
