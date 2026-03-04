import type { Variants } from 'framer-motion'

// Page entrance — subtle vertical shift, no jarring flicker
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2, ease: 'easeIn' } },
}

// Stagger container — children animate in sequence
export const staggerContainer: Variants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
}

// Individual card/item that staggers in
export const staggerItem: Variants = {
  initial: { opacity: 0, y: 20, scale: 0.97 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] },
  },
}

// Fade in only (for subtle elements)
export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.4 } },
}

// Slide up from below (for hero content)
export const slideUp: Variants = {
  initial: { opacity: 0, y: 40 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] },
  },
}

// Scale in (for badges, pills)
export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.8 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.3, ease: 'backOut' },
  },
}

// Card hover lift — pass as spread props directly onto motion.div
export const cardHover = {
  whileHover: { y: -2, transition: { duration: 0.15 } },
  whileTap: { scale: 0.98 },
}
