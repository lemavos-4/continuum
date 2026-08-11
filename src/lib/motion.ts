/*
 * Motion system — single source of truth for durations, easings and variants.
 * Principles: motion is fast, purposeful and interruptible; it explains change,
 * never decorates. Entrances are slightly slower than exits. Distance scales
 * with element size. Everything degrades to opacity-only when the user asks
 * for reduced motion.
 */
import type { Transition, Variants } from "framer-motion";

export const DURATION = {
  instant: 0.09,
  fast: 0.16,
  base: 0.24,
  slow: 0.36,
  slower: 0.56,
} as const;

export const EASE = {
  /** default entrance — decelerate */
  out: [0.16, 1, 0.3, 1],
  /** exits — accelerate away */
  in: [0.4, 0, 1, 1],
  /** movement inside the viewport */
  inOut: [0.45, 0, 0.25, 1],
} as const;

export const SPRING: Transition = { type: "spring", stiffness: 320, damping: 30, mass: 0.8 };

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const reduce = () => prefersReducedMotion();

/** Fade + rise. Distance defaults to 8px (small elements) — keep it subtle. */
export const fadeUp = (distance = 8, delay = 0): Variants => ({
  hidden: { opacity: 0, y: reduce() ? 0 : distance },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.base, ease: EASE.out, delay },
  },
  exit: {
    opacity: 0,
    y: reduce() ? 0 : -distance / 2,
    transition: { duration: DURATION.fast, ease: EASE.in },
  },
});

export const fade: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: DURATION.base, ease: EASE.out } },
  exit: { opacity: 0, transition: { duration: DURATION.fast, ease: EASE.in } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: reduce() ? 1 : 0.97 },
  visible: { opacity: 1, scale: 1, transition: { duration: DURATION.base, ease: EASE.out } },
  exit: { opacity: 0, scale: reduce() ? 1 : 0.98, transition: { duration: DURATION.fast, ease: EASE.in } },
};

/** Container that reveals children one after another. */
export const staggerContainer = (stagger = 0.045, delayChildren = 0.02): Variants => ({
  hidden: {},
  visible: {
    transition: { staggerChildren: reduce() ? 0 : stagger, delayChildren: reduce() ? 0 : delayChildren },
  },
  exit: { transition: { staggerChildren: 0 } },
});

export const staggerItem: Variants = fadeUp(6);

/** Page-level route transition. */
export const pageVariants: Variants = {
  hidden: { opacity: 0, y: reduce() ? 0 : 10 },
  visible: { opacity: 1, y: 0, transition: { duration: DURATION.slow, ease: EASE.out } },
  exit: { opacity: 0, y: reduce() ? 0 : -6, transition: { duration: DURATION.fast, ease: EASE.in } },
};