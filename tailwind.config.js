/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * Sales Command OS — Tailwind Configuration
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * All visual primitives are sourced from `src/design-tokens.js`.
 * Backward-compatible aliases ensure existing class names continue to work.
 *
 * @type {import('tailwindcss').Config}
 */
import { tokens } from './src/design-tokens.js';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',

  theme: {
    extend: {
      // ── Colors ────────────────────────────────────────────────────────────
      colors: {
        // — Token-based structured colors —
        dark:     tokens.colors.dark,
        light:    tokens.colors.light,
        accent:   tokens.colors.accent,
        stage:    tokens.colors.stage,
        semantic: tokens.colors.semantic,

        // — Backward-compatible aliases (flat names used in existing code) —
        // Core surfaces → mapped to dark theme bg tiers
        void:     tokens.colors.dark.bg.base,        // '#06080f'  (was '#0b0d17')
        deep:     tokens.colors.dark.bg.elevated1,    // '#0c0f1a'  (was '#121424')
        base:     tokens.colors.dark.bg.elevated2,    // '#121625'  (was '#181a2f')
        card:     tokens.colors.dark.bg.elevated3,    // '#181d30'  (was '#1f223d')
        elevated: tokens.colors.dark.bg.elevated4,    // '#1f253d'  (was '#282c4c')
        hover:    tokens.colors.dark.bg.elevated5,    // '#262d4a'  (was '#31365c')
        input:    tokens.colors.dark.bg.elevated1,    // '#0c0f1a'  (was '#1a1d33')

        // Primary accents
        electric: tokens.colors.accent.blue.DEFAULT,  // '#3b82f6'
        gold:     tokens.colors.accent.amber.DEFAULT, // '#f59e0b'
        neon:     tokens.colors.accent.cyan.DEFAULT,   // '#06b6d4'
        mint:     tokens.colors.accent.green.DEFAULT,  // '#10b981'
        coral:    tokens.colors.accent.red.DEFAULT,    // '#ef4444'  (was '#f43f5e')
        violet:   tokens.colors.accent.violet.DEFAULT, // '#8b5cf6'
        amber:    tokens.colors.accent.amber.DEFAULT,  // '#f59e0b'
        sky:      '#0ea5e9',                           // Keep original sky blue

        // 9-stage pipeline (kebab-case aliases)
        'stage-enquiry':     tokens.colors.stage.enquiry,
        'stage-firstcall':   tokens.colors.stage.firstCall,
        'stage-npc':         tokens.colors.stage.npcRetry,
        'stage-discovery':   tokens.colors.stage.discovery,
        'stage-demo-sched':  tokens.colors.stage.demoSched,
        'stage-demo-done':   tokens.colors.stage.demoDone,
        'stage-negotiation': tokens.colors.stage.negotiation,
        'stage-converted':   tokens.colors.stage.converted,
        'stage-lost':        tokens.colors.stage.lost,

        // Text hierarchy
        'tx-glow':    '#ffffff',
        'tx-bright':  '#e8ecf5',
        'tx-primary': tokens.colors.dark.text.secondary,  // '#b8c3de'
        'tx-dim':     tokens.colors.dark.text.tertiary,    // '#6b7a9e'
        'tx-ghost':   tokens.colors.dark.text.ghost,       // '#3b4563'
        'tx-muted':   '#2a3250',

        // Semantic (flat aliases)
        success: tokens.colors.semantic.success,
        warning: tokens.colors.semantic.warning,
        danger:  tokens.colors.semantic.danger,
        info:    tokens.colors.semantic.info,
      },

      // ── Font Families ─────────────────────────────────────────────────────
      fontFamily: tokens.typography.family,

      // ── Font Sizes ────────────────────────────────────────────────────────
      fontSize: {
        ...tokens.typography.size,
        // Backward-compatible aliases
        xxs:   tokens.typography.size['2xs'],
        micro: tokens.typography.size.xs,
      },

      // ── Border Radius ─────────────────────────────────────────────────────
      borderRadius: {
        sm:   tokens.radii.sm,
        md:   tokens.radii.md,
        lg:   tokens.radii.lg,
        xl:   tokens.radii.xl,
        '2xl': tokens.radii['2xl'],
        '3xl': '1.25rem',  // preserved from original
        '4xl': '1.5rem',   // preserved from original
        full: tokens.radii.full,
      },

      // ── Box Shadows ───────────────────────────────────────────────────────
      boxShadow: {
        // Token-based elevation tiers
        'elevation-1': tokens.elevation[1],
        'elevation-2': tokens.elevation[2],
        'elevation-3': tokens.elevation[3],
        'elevation-4': tokens.elevation[4],

        // Token-based glows
        'glow-blue':   tokens.elevation.glow.blue,
        'glow-green':  tokens.elevation.glow.green,
        'glow-amber':  tokens.elevation.glow.amber,
        'glow-violet': tokens.elevation.glow.violet,
        'glow-red':    tokens.elevation.glow.red,
        'glow-cyan':   tokens.elevation.glow.cyan,

        // Backward-compatible glow aliases
        'glow-electric': tokens.elevation.glow.blue,
        'glow-gold':     tokens.elevation.glow.amber,
        'glow-mint':     tokens.elevation.glow.green,
        'glow-coral':    tokens.elevation.glow.red,
        'glow-neon':     tokens.elevation.glow.cyan,

        // Card & elevated shadows (preserved from original)
        'card':       '0 4px 24px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.04)',
        'card-hover': '0 8px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08)',
        'elevated':   '0 16px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)',
        'inner-glow': 'inset 0 1px 0 rgba(255,255,255,0.06), inset 0 0 20px rgba(59,130,246,0.03)',
      },

      // ── Z-Index ───────────────────────────────────────────────────────────
      zIndex: tokens.zIndex,

      // ── Transition Timing Function ────────────────────────────────────────
      transitionTimingFunction: tokens.motion.easing,

      // ── Transition Duration ───────────────────────────────────────────────
      transitionDuration: tokens.motion.duration,

      // ── Backdrop Blur ─────────────────────────────────────────────────────
      backdropBlur: {
        '3xl': '64px',
      },

      // ── Keyframes ─────────────────────────────────────────────────────────
      keyframes: {
        'slide-up': {
          '0%':   { transform: 'translateY(16px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-in-right': {
          '0%':   { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'slide-in-left': {
          '0%':   { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scale-in': {
          '0%':   { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '0.6', boxShadow: '0 0 8px currentColor' },
          '50%':      { opacity: '1', boxShadow: '0 0 20px currentColor' },
        },
        'pulse-ring': {
          '0%':   { transform: 'scale(1)', opacity: '1' },
          '100%': { transform: 'scale(2)', opacity: '0' },
        },
        'shimmer': {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'confetti-fall': {
          '0%':   { transform: 'translateY(-100vh) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'translateY(100vh) rotate(720deg)', opacity: '0' },
        },
        'count-up': {
          '0%':   { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'ticker': {
          '0%':   { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(-100%)' },
        },
        'bounce-in': {
          '0%':  { transform: 'scale(0)', opacity: '0' },
          '50%': { transform: 'scale(1.15)' },
          '100%':{ transform: 'scale(1)', opacity: '1' },
        },
        'streak-fire': {
          '0%, 100%': { transform: 'scaleY(1)' },
          '50%':      { transform: 'scaleY(1.2) scaleX(0.9)' },
        },
      },

      // ── Animations ────────────────────────────────────────────────────────
      animation: {
        'slide-up':       `slide-up 0.4s ${tokens.motion.easing.spring}`,
        'slide-in-right': `slide-in-right 0.35s ${tokens.motion.easing.spring}`,
        'slide-in-left':  `slide-in-left 0.35s ${tokens.motion.easing.spring}`,
        'fade-in':        'fade-in 0.3s ease-out',
        'scale-in':       `scale-in 0.25s ${tokens.motion.easing.spring}`,
        'pulse-glow':     'pulse-glow 2.5s ease-in-out infinite',
        'pulse-ring':     'pulse-ring 1.5s ease-out infinite',
        'shimmer':        'shimmer 2.5s linear infinite',
        'bounce-in':      `bounce-in 0.5s ${tokens.motion.easing.spring}`,
        'streak-fire':    'streak-fire 0.5s ease-in-out infinite',
        'ticker':         'ticker 20s linear infinite',
      },
    },
  },

  plugins: [],
};
