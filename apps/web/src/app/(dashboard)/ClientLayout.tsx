'use client'

import React from 'react'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import { ThemeProvider, useTheme } from '@/lib/theme'
import Sidebar from '@/components/dashboard/Sidebar'
import PageTransition from '@/components/ui/PageTransition'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '@tracker/db'

function InnerLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
  const router = useRouter()
  const { theme, switching } = useTheme()

  // Respect OS accessibility preference — skip GPU-heavy orb animations
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    async function init() {
      try {
        const { data: { user }, error: authErr } = await supabase.auth.getUser()
        if (authErr || !user) {
          router.replace('/login')
          return
        }
        setUser(user)
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        setProfile(data)
      } catch {
        // Auth or profile fetch failed — send to login so user can retry
        router.replace('/login')
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [router])

  if (loading) {
    return (
      <div
        className="flex h-screen items-center justify-center"
        style={{ background: theme.loadingBg }}
      >
        <div
          className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: theme.accent, borderTopColor: 'transparent' }}
        />
      </div>
    )
  }

  /* Ambient orb config per theme */
  const orbs = theme.id === 'violet'
    ? [
        { color: '#7c3aed', size: 480, top: '5%',  left: '35%', dx: [0, 50, -25, 0], dy: [0, -40, 30, 0], dur: 9  },
        { color: '#6ee7b7', size: 320, top: '55%', left: '65%', dx: [0, -35, 20, 0], dy: [0, 30, -20, 0], dur: 11 },
        { color: '#a78bfa', size: 260, top: '70%', left: '10%', dx: [0, 25, -10, 0], dy: [0, -25, 15, 0], dur: 13 },
      ]
    : [
        { color: '#b45309', size: 420, top: '0%',  left: '40%', dx: [0, 40, -20, 0], dy: [0, -35, 25, 0], dur: 10 },
        { color: '#15803d', size: 280, top: '60%', left: '60%', dx: [0, -30, 15, 0], dy: [0, 30, -15, 0], dur: 12 },
        { color: '#d97706', size: 220, top: '75%', left: '5%',  dx: [0, 20, -10, 0], dy: [0, -20, 12, 0], dur: 14 },
      ]

  return (
    <div
      className="flex h-screen overflow-hidden relative"
      style={{ background: theme.pageBg }}
    >
      {/* ── Floating ambient orbs (skip if reduced-motion preference set) ── */}
      {!prefersReducedMotion && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
          {orbs.map((orb, i) => (
            <motion.div
              key={i}
              aria-hidden
              style={{
                position: 'absolute',
                width:    orb.size,
                height:   orb.size,
                top:      orb.top,
                left:     orb.left,
                borderRadius: '50%',
                background: `radial-gradient(circle, ${orb.color}18 0%, transparent 70%)`,
                filter:   'blur(40px)',
              }}
              animate={{ x: orb.dx, y: orb.dy }}
              transition={{
                duration: orb.dur,
                ease:     'easeInOut',
                repeat:   Infinity,
                delay:    i * 1.5,
              }}
            />
          ))}
        </div>
      )}

      {/* ── Theme-switch wash overlay ─────────────────────────────────────── */}
      <AnimatePresence>
        {switching && (
          <motion.div
            key="theme-wash"
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{
              position:   'fixed',
              inset:      0,
              zIndex:     9998,
              background: theme.pageBg,
              pointerEvents: 'none',
            }}
          />
        )}
      </AnimatePresence>

      <Sidebar user={user!} profile={profile} />

      <main className="flex-1 overflow-y-auto relative" style={{ zIndex: 1 }}>
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  )
}

export default function ClientLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <ThemeProvider>
      <InnerLayout>{children}</InnerLayout>
    </ThemeProvider>
  )
}
