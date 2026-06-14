'use client'

import React from 'react'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, List, Settings, LogOut, TrendingUp } from 'lucide-react'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import { useTheme, THEMES, type ThemeId } from '@/lib/theme'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '@tracker/db'

// Module-level singleton — createClient() is cheap but stable reference avoids
// re-creating the client on every render of Sidebar
const supabaseClient = createClient()

interface SidebarProps {
  user: User
  profile: Profile | null
}

const NAV_ITEMS = [
  { label: 'Dashboard',    href: '/dashboard',     icon: LayoutDashboard },
  { label: 'Transactions', href: '/transactions',   icon: List },
  { label: 'Settings',     href: '/settings',       icon: Settings },
]

const THEME_OPTIONS: { id: ThemeId; label: string; dot: string }[] = [
  { id: 'forest', label: 'Forest', dot: '#d97706' },
  { id: 'violet', label: 'Violet', dot: '#a78bfa' },
]

export default function Sidebar({ user, profile }: SidebarProps): React.JSX.Element {
  const pathname = usePathname()
  const router   = useRouter()
  const { theme, themeId, setTheme } = useTheme()
  const s = theme.sidebar

  async function handleSignOut() {
    await supabaseClient.auth.signOut()
    router.push('/login')
  }

  const initials = (profile?.full_name ?? user.email ?? 'U')
    .split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()

  return (
    <motion.aside
      className="w-60 flex flex-col h-full flex-shrink-0"
      style={{ background: s.bg, borderRight: `1px solid ${s.border}` }}
      initial={{ x: -60, opacity: 0 }}
      animate={{ x: 0,   opacity: 1 }}
      transition={{ type: 'spring', stiffness: 280, damping: 26, delay: 0.05 }}
    >
      {/* Logo */}
      <div className="p-6" style={{ borderBottom: `1px solid ${s.border}` }}>
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.15)' }}
          >
            <TrendingUp className="w-5 h-5" style={{ color: s.textMuted }} />
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: s.text }}>ExpenseTracker</p>
            <p className="text-xs" style={{ color: s.textDim }}>Personal Finance</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
              style={{
                background: active ? s.activeItemBg : 'transparent',
                color: active ? s.text : s.textMuted,
              }}
              onMouseEnter={(e) => {
                if (!active) (e.currentTarget as HTMLElement).style.background = s.hoverBg
              }}
              onMouseLeave={(e) => {
                if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'
              }}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Theme switcher */}
      <div className="px-4 pb-3" style={{ borderTop: `1px solid ${s.border}`, paddingTop: 16 }}>
        <p className="text-xs font-semibold mb-2" style={{ color: s.textDim, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Theme
        </p>
        <div className="flex gap-2">
          {THEME_OPTIONS.map((opt) => {
            const active = themeId === opt.id
            return (
              <button
                key={opt.id}
                onClick={() => setTheme(opt.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex-1 justify-center"
                style={{
                  background: active ? 'rgba(255,255,255,0.15)' : 'transparent',
                  color: active ? s.text : s.textDim,
                  border: `1px solid ${active ? 'rgba(255,255,255,0.25)' : 'transparent'}`,
                }}
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: opt.dot }}
                />
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* User */}
      <div className="p-4" style={{ borderTop: `1px solid ${s.border}` }}>
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.12)' }}
          >
            <span className="text-xs font-semibold" style={{ color: s.textMuted }}>{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: s.text }}>
              {profile?.full_name ?? 'My Account'}
            </p>
            <p className="text-xs truncate" style={{ color: s.textDim }}>{user.email}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg transition-colors"
          style={{ color: s.textDim }}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.12)'
            ;(e.currentTarget as HTMLElement).style.color = '#f87171'
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLElement).style.background = 'transparent'
            ;(e.currentTarget as HTMLElement).style.color = s.textDim
          }}
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </motion.aside>
  )
}
