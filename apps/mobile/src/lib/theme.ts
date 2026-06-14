export type ThemeId = 'forest' | 'violet'

export interface MobileTheme {
  id: ThemeId
  name: string
  pageBg: string
  headerBg: string
  cardBg: string
  cardBorder: string
  cardShadow: string
  accent: string
  accentBg: string
  accentText: string
  positive: string
  negative: string
  text: {
    primary: string
    secondary: string
    muted: string
    inverse: string
  }
  tabBar: {
    bg: string
    borderTop: string
    active: string
    inactive: string
  }
  input: {
    bg: string
    border: string
    text: string
    placeholder: string
  }
  btn: {
    primary: { bg: string; text: string }
    ghost: { border: string; text: string }
    danger: { bg: string; text: string }
  }
  badge: {
    successBg: string
    successText: string
    warningBg: string
    warningText: string
  }
  progressBar: {
    track: string
    fill: string
    fillAlt: string
  }
  chip: {
    bg: string
    activeBg: string
    text: string
    activeText: string
  }
  separator: string
}

export const THEMES: Record<ThemeId, MobileTheme> = {
  forest: {
    id: 'forest',
    name: 'Forest & Gold',
    pageBg: '#f6f3ee',
    headerBg: '#1a3a2a',
    cardBg: '#ffffff',
    cardBorder: '#e2ddd5',
    cardShadow: '#00000010',
    accent: '#b45309',
    accentBg: '#fef3c7',
    accentText: '#92400e',
    positive: '#15803d',
    negative: '#dc2626',
    text: {
      primary: '#1c1917',
      secondary: '#57534e',
      muted: '#a8a29e',
      inverse: '#f5f5f4',
    },
    tabBar: {
      bg: '#1a3a2a',
      borderTop: '#14532d',
      active: '#fbbf24',
      inactive: '#86a99a',
    },
    input: {
      bg: '#fafaf9',
      border: '#d6d0c8',
      text: '#1c1917',
      placeholder: '#a8a29e',
    },
    btn: {
      primary: { bg: '#b45309', text: '#ffffff' },
      ghost: { border: '#d6d0c8', text: '#57534e' },
      danger: { bg: '#fee2e2', text: '#dc2626' },
    },
    badge: {
      successBg: '#dcfce7',
      successText: '#15803d',
      warningBg: '#fef3c7',
      warningText: '#92400e',
    },
    progressBar: {
      track: '#e7e5e4',
      fill: '#15803d',
      fillAlt: '#f97316',
    },
    chip: {
      bg: '#ffffff',
      activeBg: '#1a3a2a',
      text: '#57534e',
      activeText: '#fbbf24',
    },
    separator: '#e7e5e4',
  },
  violet: {
    id: 'violet',
    name: 'Violet Dusk',
    pageBg: '#0c0a14',
    headerBg: '#110d1f',
    cardBg: '#13101f',
    cardBorder: '#2e2850',
    cardShadow: '#00000040',
    accent: '#a78bfa',
    accentBg: 'rgba(167,139,250,0.12)',
    accentText: '#a78bfa',
    positive: '#34d399',
    negative: '#fb7185',
    text: {
      primary: '#ede9fe',
      secondary: '#9d8fcc',
      muted: '#4c4580',
      inverse: '#13101f',
    },
    tabBar: {
      bg: '#110d1f',
      borderTop: '#2e2850',
      active: '#a78bfa',
      inactive: '#4c4580',
    },
    input: {
      bg: '#1e1a30',
      border: '#2e2850',
      text: '#ede9fe',
      placeholder: '#4c4580',
    },
    btn: {
      primary: { bg: '#a78bfa', text: '#13101f' },
      ghost: { border: '#2e2850', text: '#9d8fcc' },
      danger: { bg: 'rgba(251,113,133,0.15)', text: '#fb7185' },
    },
    badge: {
      successBg: 'rgba(52,211,153,0.15)',
      successText: '#34d399',
      warningBg: 'rgba(251,191,36,0.15)',
      warningText: '#fbbf24',
    },
    progressBar: {
      track: '#2e2850',
      fill: '#a78bfa',
      fillAlt: '#fb7185',
    },
    chip: {
      bg: '#1e1a30',
      activeBg: '#a78bfa',
      text: '#9d8fcc',
      activeText: '#13101f',
    },
    separator: '#2e2850',
  },
}

export const DEFAULT_THEME: ThemeId = 'forest'
