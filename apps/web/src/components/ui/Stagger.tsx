'use client'

import React from 'react'
import { motion, type Variants } from 'framer-motion'

const containerVariants: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.07,
      delayChildren:   0.04,
    },
  },
}

// Snappy: tiny translate-up + fade. No blur. Feels instant, not broken.
const itemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.22, ease: 'easeOut' } },
}

/** Wraps children so they animate in one-by-one with a stagger */
export function Stagger({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}): React.JSX.Element {
  return (
    <motion.div
      className={className}
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <>{children}</>
    </motion.div>
  )
}

/** Each direct child of <Stagger> should be wrapped in <StaggerItem> */
export function StaggerItem({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}): React.JSX.Element {
  return (
    <motion.div variants={itemVariants} className={className}>
      <>{children}</>
    </motion.div>
  )
}

/** Single element that fades + lifts in independently */
export function AnimateIn({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode
  delay?:   number
  className?: string
}): React.JSX.Element {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut', delay }}
    >
      <>{children}</>
    </motion.div>
  )
}
