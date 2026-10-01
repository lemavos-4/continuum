'use client'

import { ReactNode, useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'

interface TimelineContentProps {
  children: ReactNode
  as?: keyof JSX.IntrinsicElements
  animationNum?: number
  timelineRef?: React.RefObject<HTMLDivElement>
  customVariants?: Record<string, any>
  className?: string
  [key: string]: any
}

export function TimelineContent({
  children,
  as: Component = 'div',
  animationNum = 0,
  timelineRef,
  customVariants,
  className = '',
  ...props
}: TimelineContentProps) {
  const ref = useRef<HTMLDivElement | null>(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  const defaultVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.5,
      },
    }),
  }

  const variants = customVariants || defaultVariants

  return (
    <motion.div
      ref={ref}
      
      custom={animationNum}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={variants}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
}
