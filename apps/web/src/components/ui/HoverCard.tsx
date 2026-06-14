'use client'

import React from 'react'
import { motion } from 'framer-motion'

interface HoverCardProps {
  children:    React.ReactNode
  className?:  string
  style?:      React.CSSProperties
  /** Accent colour used for the hover glow — pass theme.accent or a specific colour */
  glowColor?:  string
}

/**
 * Drop-in wrapper around any card that adds a subtle lift + glow on hover.
 * Use in place of a plain <div> for dashboard cards.
 */
export default function HoverCard({
  children,
  className,
  style,
  glowColor = '#6366f1',
}: HoverCardProps): React.JSX.Element {
  return (
    <motion.div
      className={className}
      style={style}
      whileHover={{
        y:         -4,
        boxShadow: `0 12px 32px ${glowColor}28, 0 2px 8px ${glowColor}14`,
        transition: { duration: 0.2, ease: 'easeOut' },
      }}
      whileTap={{ scale: 0.99 }}
    >
      <>{children}</>
    </motion.div>
  )
}
