// ─── NEXUS Motion Constants ─────────────────────────────────────────
// Shared spring physics & transition presets for cinematic UI.

export const spring = {
  gentle: { type: 'spring', stiffness: 150, damping: 20, mass: 1 },
  snappy: { type: 'spring', stiffness: 300, damping: 25, mass: 0.8 },
  bouncy: { type: 'spring', stiffness: 400, damping: 15, mass: 0.6 },
  heavy:  { type: 'spring', stiffness: 200, damping: 30, mass: 1.2 },
  soft:   { type: 'spring', stiffness: 120, damping: 18, mass: 1 },
};

export const transition = {
  fast:    { duration: 0.15, ease: [0.25, 0.46, 0.45, 0.94] },
  default: { duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] },
  slow:    { duration: 0.4,  ease: [0.25, 0.46, 0.45, 0.94] },
  smooth:  { duration: 0.5,  ease: [0.22, 1, 0.36, 1] },
};

export const pageTransition = {
  initial: { opacity: 0, y: 20, filter: 'blur(4px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  exit:    { opacity: 0, y: -10, filter: 'blur(4px)' },
  transition: spring.gentle,
};

export const slideUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: spring.gentle,
};

export const slideRight = {
  initial: { opacity: 0, x: 24 },
  animate: { opacity: 1, x: 0 },
  transition: spring.gentle,
};

export const slideInFromRight = {
  initial: { x: '100%' },
  animate: { x: 0 },
  exit:    { x: '100%' },
  transition: spring.snappy,
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.92 },
  animate: { opacity: 1, scale: 1 },
  exit:    { opacity: 0, scale: 0.95 },
  transition: spring.snappy,
};

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit:    { opacity: 0 },
  transition: transition.default,
};

export const stagger = {
  container: (staggerDelay = 0.04) => ({
    animate: { transition: { staggerChildren: staggerDelay } },
  }),
  item: {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
  },
};

export const magneticHover = {
  whileHover: { scale: 1.04 },
  whileTap:   { scale: 0.97 },
  transition: spring.snappy,
};
