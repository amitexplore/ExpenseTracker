'use client'

import React, { createContext, useContext, useEffect, useRef, useState } from 'react'

export type ThemeId = 'forest' | 'violet'

export interface AppTheme {
  id: ThemeId
  name: string
  pageBg: string
  sidebar: {
    bg: string
    border: string
    text: string
    textMuted: string
    textDim: string
    activeItemBg: string
    hoverBg: string
  }
  card: { bg: string; border: string }
  text: { primary: string; secondary: string; muted: string }
  accent: string
  accentBg: string
  positive: string
  positiveBg: string
  negative: string
  projected: string
  accountAccent: string
  savingsAccent: string
  table: {
    border: string
    headerText: string
    rowBonus: string
    confirmedText: string
    confirmedBg: string
    projectedText: string
    projectedBg: string
  }
  btn: {
    primary: { bg: string; text: string }
    secondary: { bg: string; text: string; border: string }
  }
  chart: {
    grid: string
    salary: string
    bonus: string
    fixed: string
    variable: string
    balance: string
    projected: string
    tooltipBg: string
    tooltipBorder: string
    tooltipText: string
  }
  ring: { track: string }
  input: { bg: string; border: string; text: string; placeholder: string }
  loadingBg: string
}

export const THEMES: Record<ThemeId, AppTheme> = {
  forest: {
    id: 'forest',
    name: 'Forest & Gold',
    pageBg: '#f6f3ee',
    sidebar: {
      bg: '#14532d',
      border: '#166534',
      text: '#f0fdf4',
      textMuted: '#86efac',
      textDim: '#bbf7d0',
      activeItemBg: 'rgba(255,255,255,0.13)',
      hoverBg: 'rgba(255,255,255,0.07)',
    },
    card: { bg: '#ffffff', border: '#e2ddd5' },
    text: { primary: '#1c1917', secondary: '#78716c', muted: '#a8a29e' },
    accent: '#b45309',
    accentBg: '#fffbeb',
    positive: '#15803d',
    positiveBg: '#f0fdf4',
    negative: '#dc2626',
    projected: '#0891b2',
    accountAccent: '#14532d',
    savingsAccent: '#d97706',
    table: {
      border: '#ede8e1',
      headerText: '#a8a29e',
      rowBonus: '#fffbeb',
      confirmedText: '#14532d',
      confirmedBg: '#f0fdf4',
      projectedText: '#0891b2',
      projectedBg: '#f0f9ff',
    },
    btn: {
      primary: { bg: '#d97706', text: '#1c1917' },
      secondary: { bg: 'transparent', text: '#bbf7d0', border: '#166534' },
    },
    chart: {
      grid: '#e2ddd5',
      salary: '#6ee7b7',
      bonus: '#fde68a',
      fixed: '#fca5a5',
      variable: '#fdba74',
      balance: '#15803d',
      projected: '#0891b2',
      tooltipBg: '#ffffff',
      tooltipBorder: '#e2ddd5',
      tooltipText: '#1c1917',
    },
    ring: { track: '#fef3c7' },
    input: { bg: '#ffffff', border: '#d6d0c8', text: '#1c1917', placeholder: '#a8a29e' },
    loadingBg: '#f6f3ee',
  },
  violet: {
    id: 'violet',
    name: 'Violet Dusk',
    pageBg: '#0c0a14',
    sidebar: {
      bg: '#13101f',
      border: '#2e2850',
      text: '#ede9fe',
      textMuted: '#8b7fc2',
      textDim: '#4c4580',
      activeItemBg: 'rgba(167,139,250,0.15)',
      hoverBg: 'rgba(167,139,250,0.08)',
    },
    card: { bg: '#13101f', border: '#2e2850' },
    text: { primary: '#ede9fe', secondary: '#8b7fc2', muted: '#4c4580' },
    accent: '#a78bfa',
    accentBg: 'rgba(167,139,250,0.1)',
    positive: '#6ee7b7',
    positiveBg: 'rgba(110,231,183,0.1)',
    negative: '#fb7185',
    projected: '#67e8f9',
    accountAccent: '#a78bfa',
    savingsAccent: '#6ee7b7',
    table: {
      border: '#2e2850',
      headerText: '#4c4580',
      rowBonus: 'rgba(251,191,36,0.07)',
      confirmedText: '#a78bfa',
      confirmedBg: 'rgba(167,139,250,0.08)',
      projectedText: '#67e8f9',
      projectedBg: 'rgba(103,232,249,0.08)',
    },
    btn: {
      primary: { bg: '#a78bfa', text: '#13101f' },
      secondary: { bg: 'transparent', text: '#8b7fc2', border: '#2e2850' },
    },
    chart: {
      grid: '#2e2850',
      salary: '#8b5cf6',
      bonus: '#fbbf24',
      fixed: '#fb7185',
      variable: '#f97316',
      balance: '#6ee7b7',
      projected: '#67e8f9',
      tooltipBg: '#1e1a30',
      tooltipBorder: '#2e2850',
      tooltipText: '#ede9fe',
    },
    ring: { track: 'rgba(167,139,250,0.15)' },
    input: { bg: '#1e1a30', border: '#2e2850', text: '#ede9fe', placeholder: '#4c4580' },
    loadingBg: '#0c0a14',
  },
}

interface ThemeContextValue {
  theme: AppTheme
  themeId: ThemeId
  setTheme: (id: ThemeId) => void
  switching: boolean
}

const ThemeContext = createContext<ThemeContextValue>({
  theme:     THEMES.forest,
  themeId:   'forest',
  setTheme:  () => {},
  switching: false,
})

export function ThemeProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [themeId,   setThemeId]   = useState<ThemeId>('forest')
  const [switching, setSwitching] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('app-theme') as ThemeId | null
      if (saved && THEMES[saved]) setThemeId(saved)
    } catch {}
  }, [])

  function handleSetTheme(id: ThemeId) {
    if (id === themeId) return
    setSwitching(true)
    // Short delay so the overlay fades in before the colour swap happens
    timerRef.current = setTimeout(() => {
      setThemeId(id)
      try { localStorage.setItem('app-theme', id) } catch {}
      // Keep overlay a touch longer so it covers the repaint
      timerRef.current = setTimeout(() => setSwitching(false), 120)
    }, 100)
  }

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  return (
    <ThemeContext.Provider value={{ theme: THEMES[themeId], themeId, setTheme: handleSetTheme, switching }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext)
}
