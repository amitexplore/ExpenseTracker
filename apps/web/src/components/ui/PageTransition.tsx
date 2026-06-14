'use client'

import React, { useEffect } from 'react'
import { AnimatePresence, motion, useAnimate } from 'framer-motion'
import { usePathname } from 'next/navigation'
import { useTheme } from '@/lib/theme'

/** Glowing progress bar that sweeps across the top then fades out */
function ProgressBar({ accent }: { accent: string }): React.JSX.Element {
  const [scope, animate] = useAnimate()

  useEffect(() => {
    async function run() {
      await animate(scope.current, { width: '88%' }, { duration: 0.45, ease: [0.4, 0, 0.2, 1] })
      await animate(scope.current, { width: '100%' }, { duration: 0.1,  ease: 'easeIn' })
      await animate(scope.current, { opacity: 0 },    { duration: 0.18 })
    }
    run()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <motion.div
      ref={scope}
      aria-hidden
      initial={{ width: '0%', opacity: 1 }}
      style={{
        position:   'fixed',
        top:        0,
        left:       0,
        height:     '3px',
        zIndex:     9999,
        background: `linear-gradient(90deg, ${accent}66, ${accent})`,
        boxShadow:  `0 0 12px 3px ${accent}88`,
      }}
    />
  )
}

/**
 * Clean page crossfade — no blur, no scale, no jarring translate.
 * Feels like a polished SaaS app, not a loading spinner.
 */
export default function PageTransition({ children }: { children: React.ReactNode }): React.JSX.Element {
  const pathname = usePathname()
  const { theme } = useTheme()

  return (
    <>
      <ProgressBar key={`bar-${pathname}`} accent={theme.accent} />

      <AnimatePresence mode="wait">
        <motion.div
          key={pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        >
          <>{children}</>
        </motion.div>
      </AnimatePresence>
    </>
  )
}
