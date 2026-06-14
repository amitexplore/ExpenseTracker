'use client'

import React from 'react'
import { useTheme } from '@/lib/theme'

/** A single shimmer block – size controlled via style prop */
function SkeletonBlock({
  className = '',
  style,
}: {
  className?: string
  style?: React.CSSProperties
}): React.JSX.Element {
  const { themeId } = useTheme()
  return (
    <div
      className={`${themeId === 'violet' ? 'skeleton-dark' : 'skeleton-light'} ${className}`}
      style={style}
    />
  )
}

/**
 * Full-page skeleton that mirrors the dashboard layout.
 * Shown while the initial data fetch is in progress so the
 * screen never flashes a blank spinner.
 */
export default function DashboardSkeleton(): React.JSX.Element {
  const { theme } = useTheme()

  return (
    <div className="p-6 space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="space-y-2">
          <SkeletonBlock style={{ width: 220, height: 28 }} />
          <SkeletonBlock style={{ width: 140, height: 16 }} />
        </div>
        <div className="flex gap-2">
          <SkeletonBlock style={{ width: 110, height: 38, borderRadius: 12 }} />
          <SkeletonBlock style={{ width: 110, height: 38, borderRadius: 12 }} />
          <SkeletonBlock style={{ width: 90,  height: 38, borderRadius: 12 }} />
        </div>
      </div>

      {/* ── Summary cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="rounded-2xl p-5 space-y-3"
            style={{ background: theme.card.bg, border: `1px solid ${theme.card.border}` }}
          >
            <SkeletonBlock style={{ width: 32, height: 32, borderRadius: 10 }} />
            <SkeletonBlock style={{ width: '60%', height: 13 }} />
            <SkeletonBlock style={{ width: '80%', height: 24 }} />
          </div>
        ))}
      </div>

      {/* ── Month comparison row ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="rounded-2xl p-4 space-y-2"
            style={{ background: theme.card.bg, border: `1px solid ${theme.card.border}` }}
          >
            <SkeletonBlock style={{ width: '50%', height: 12 }} />
            <SkeletonBlock style={{ width: '70%', height: 20 }} />
            <SkeletonBlock style={{ width: '40%', height: 12 }} />
          </div>
        ))}
      </div>

      {/* ── Chart + Savings side-by-side ────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Chart */}
        <div
          className="lg:col-span-2 rounded-2xl p-6 space-y-4"
          style={{ background: theme.card.bg, border: `1px solid ${theme.card.border}` }}
        >
          <SkeletonBlock style={{ width: 180, height: 20 }} />
          <SkeletonBlock style={{ width: '100%', height: 180, borderRadius: 12 }} />
        </div>
        {/* Savings card */}
        <div
          className="rounded-2xl p-6 space-y-4"
          style={{ background: theme.card.bg, border: `1px solid ${theme.card.border}` }}
        >
          <SkeletonBlock style={{ width: 140, height: 20 }} />
          <div className="flex justify-center py-2">
            <SkeletonBlock style={{ width: 140, height: 140, borderRadius: '50%' }} />
          </div>
          <SkeletonBlock style={{ width: '80%', height: 14, margin: '0 auto' }} />
          <SkeletonBlock style={{ width: '60%', height: 14, margin: '0 auto' }} />
        </div>
      </div>

      {/* ── Spending breakdown + yearly grid ────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div
          className="rounded-2xl p-6 space-y-3"
          style={{ background: theme.card.bg, border: `1px solid ${theme.card.border}` }}
        >
          <SkeletonBlock style={{ width: 180, height: 20 }} />
          <SkeletonBlock style={{ width: '100%', height: 140, borderRadius: 12 }} />
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <SkeletonBlock style={{ width: 12, height: 12, borderRadius: '50%' }} />
              <SkeletonBlock style={{ flex: 1, height: 12 }} />
              <SkeletonBlock style={{ width: 48, height: 12 }} />
            </div>
          ))}
        </div>
        <div
          className="rounded-2xl p-6 space-y-3"
          style={{ background: theme.card.bg, border: `1px solid ${theme.card.border}` }}
        >
          <SkeletonBlock style={{ width: 160, height: 20 }} />
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex gap-2">
              <SkeletonBlock style={{ width: 36, height: 32, borderRadius: 8 }} />
              <SkeletonBlock style={{ flex: 1, height: 32, borderRadius: 8 }} />
              <SkeletonBlock style={{ width: 60, height: 32, borderRadius: 8 }} />
              <SkeletonBlock style={{ width: 60, height: 32, borderRadius: 8 }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
