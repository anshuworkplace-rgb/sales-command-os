/**
 * NEXUS — Motion System
 * Centralized animation constants for Framer Motion.
 * Import these across all components for consistent, cinematic motion.
 */

/* ─── Spring Physics Presets ─── */
export const spring = {
  snappy: { type: 'spring', stiffness: 500, damping: 30 },
  smooth: { type: 'spring', stiffness: 300, damping: 25 },
  cinematic: { type: 'spring', stiffness: 100, damping: 20 },
  gentle: { type: 'spring', stiffness: 200, damping: 20 },
  bouncy: { type: 'spring', stiffness: 400, damping: 15 },
};

/* ─── Transition Timing Presets ─── */
export const transition = {
  page: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
  fast: { duration: 0.15, ease: [0.22, 1, 0.36, 1] },
  smooth: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
};

/* ─── Animation Variants ─── */
export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const slideUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

export const slideDown = {
  initial: { opacity: 0, y: -20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 10 },
};

export const slideLeft = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

export const slideRight = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 },
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

export const scaleUp = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.9 },
};

/* ─── Stagger Container ─── */
export const stagger = {
  animate: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

export const staggerSlow = {
  animate: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.15,
    },
  },
};

/* ─── Hover & Tap Interactions ─── */
export const hoverScale = {
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.98 },
  transition: { type: 'spring', stiffness: 400, damping: 20 },
};

export const hoverLift = {
  whileHover: { y: -2 },
  whileTap: { y: 0 },
  transition: { type: 'spring', stiffness: 400, damping: 20 },
};

export const hoverGlow = {
  whileHover: {
    boxShadow: '0 0 30px rgba(99, 102, 241, 0.3)',
  },
  transition: { duration: 0.2 },
};
