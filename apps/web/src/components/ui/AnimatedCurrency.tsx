'use client'

import React, { useEffect, useRef } from 'react'
import { animate } from 'framer-motion'
import { formatCurrency } from '@tracker/core'

interface Props {
  amount:    number
  currency:  string
  className?: string
  /** Animation duration in seconds (default 1.1) */
  duration?: number
}

/**
 * Counts up from 0 → `amount` on first mount, then does a brief
 * scale-pulse when it lands — making the number feel "alive".
 */
export default function AnimatedCurrency({
  amount,
  currency,
  className,
  duration = 1.1,
}: Props): React.JSX.Element {
  const ref     = useRef<HTMLSpanElement>(null)
  const started = useRef(false)

  useEffect(() => {
    if (!ref.current || started.current) return
    started.current = true

    const el = ref.current

    const controls = animate(0, amount, {
      duration,
      ease: [0.4, 0, 0.2, 1],
      onUpdate(v) {
        if (el) el.textContent = formatCurrency(Math.round(v), currency)
      },
      onComplete() {
        // Satisfying scale-pulse once the number lands
        if (!el) return
        el.style.transition = 'transform 0.15s cubic-bezier(0.34,1.56,0.64,1)'
        el.style.display     = 'inline-block'
        el.style.transform   = 'scale(1.06)'
        setTimeout(() => {
          if (el) el.style.transform = 'scale(1)'
        }, 150)
      },
    })

    return () => controls.stop()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <span ref={ref} className={className} style={{ display: 'inline-block' }}>
      {formatCurrency(amount, currency)}
    </span>
  )
}
