/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * Sales Command OS — Unified Design Token System
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Single source of truth for every visual primitive in the application.
 * Consumed by tailwind.config.js to generate utility classes and can be
 * imported directly in JS/TS files for runtime access to raw values.
 *
 * Architecture:
 *   colors.dark / colors.light  → Theme-specific surface, border, text tokens
 *   colors.accent               → Semantic accent palette (blue, green, amber…)
 *   colors.stage                → 9-stage pipeline colors
 *   colors.semantic             → Success / warning / danger / info
 *   spacing                     → 4px base-unit scale
 *   radii                       → Border-radius scale
 *   elevation                   → Box-shadow tiers + colored glow effects
 *   motion                      → Duration & easing curves
 *   zIndex                      → Layering hierarchy
 *   typography                  → Font families & modular type scale
 *
 * Usage:
 *   import { tokens } from '@/design-tokens';           // named
 *   import tokens from '@/design-tokens';               // default
 *   const bg = tokens.colors.dark.bg.base;              // '#06080f'
 */

// ─────────────────────────────────────────────────────────────────────────────
// Colors
// ─────────────────────────────────────────────────────────────────────────────

const colors = {
  // ── Dark Theme ──────────────────────────────────────────────────────────────
  // OLED-aware elevation model: lighter surfaces indicate higher elevation.
  // bg.base is near-black; each subsequent tier adds luminance.
  dark: {
    bg: {
      base:      '#06080f',   // App background — near-OLED black with a hint of blue
      elevated1: '#0c0f1a',   // Primary content areas (sidebars, main panels)
      elevated2: '#121625',   // Cards, list items
      elevated3: '#181d30',   // Nested cards, active sections
      elevated4: '#1f253d',   // Popovers, dropdown menus
      elevated5: '#262d4a',   // Tooltips, highest-elevation surfaces
    },
    surface: {
      DEFAULT: 'rgba(255,255,255,0.025)',  // Transparent surface fill
      hover:   'rgba(255,255,255,0.05)',   // Hovered interactive surface
      active:  'rgba(255,255,255,0.08)',   // Pressed / active surface
      overlay: 'rgba(6,8,15,0.85)',        // Modal / drawer backdrop
    },
    border: {
      subtle: 'rgba(255,255,255,0.04)',    // Barely-visible dividers
      DEFAULT:'rgba(255,255,255,0.07)',     // Standard borders
      strong: 'rgba(255,255,255,0.12)',     // Emphasized borders (focus rings, etc.)
    },
    text: {
      primary:   'rgba(255,255,255,0.92)', // Headlines, critical labels
      secondary: '#b8c3de',                // Body copy, descriptions
      tertiary:  '#6b7a9e',                // Captions, timestamps
      ghost:     '#3b4563',                // Disabled / placeholder text
      inverse:   '#06080f',                // Text on bright accent backgrounds
    },
  },

  // ── Light Theme ─────────────────────────────────────────────────────────────
  // Conventional "paper" elevation: white surfaces sit above tinted backgrounds.
  light: {
    bg: {
      base:      '#f8f9fc',   // App background — warm light gray
      elevated1: '#ffffff',   // Primary content areas
      elevated2: '#ffffff',   // Cards (same as elevated1 for simplicity)
      elevated3: '#f0f2f7',   // Nested sections, sidebar backgrounds
      elevated4: '#e8ebf2',   // Popovers, dropdown menus
      elevated5: '#dfe3ec',   // Highest-elevation surfaces
    },
    surface: {
      DEFAULT: 'rgba(0,0,0,0.02)',    // Transparent surface fill
      hover:   'rgba(0,0,0,0.04)',    // Hovered interactive surface
      active:  'rgba(0,0,0,0.06)',    // Pressed / active surface
      overlay: 'rgba(248,249,252,0.9)', // Modal / drawer backdrop
    },
    border: {
      subtle: 'rgba(0,0,0,0.04)',     // Barely-visible dividers
      DEFAULT:'rgba(0,0,0,0.08)',     // Standard borders
      strong: 'rgba(0,0,0,0.14)',     // Emphasized borders
    },
    text: {
      primary:   '#111827',            // Headlines, critical labels
      secondary: '#4b5563',            // Body copy
      tertiary:  '#9ca3af',            // Captions
      ghost:     '#d1d5db',            // Disabled / placeholder
      inverse:   '#ffffff',            // Text on dark backgrounds
    },
  },

  // ── Semantic Accent Palette ─────────────────────────────────────────────────
  // Each accent includes DEFAULT (standard), light (hover/highlight),
  // dark (pressed/active), and subtle (12% opacity background tint).
  accent: {
    blue: {
      DEFAULT: '#3b82f6',
      light:   '#60a5fa',
      dark:    '#2563eb',
      subtle:  'rgba(59,130,246,0.12)',
    },
    green: {
      DEFAULT: '#10b981',
      light:   '#34d399',
      dark:    '#059669',
      subtle:  'rgba(16,185,129,0.12)',
    },
    amber: {
      DEFAULT: '#f59e0b',
      light:   '#fbbf24',
      dark:    '#d97706',
      subtle:  'rgba(245,158,11,0.12)',
    },
    red: {
      DEFAULT: '#ef4444',
      light:   '#f87171',
      dark:    '#dc2626',
      subtle:  'rgba(239,68,68,0.12)',
    },
    violet: {
      DEFAULT: '#8b5cf6',
      light:   '#a78bfa',
      dark:    '#7c3aed',
      subtle:  'rgba(139,92,246,0.12)',
    },
    cyan: {
      DEFAULT: '#06b6d4',
      light:   '#22d3ee',
      dark:    '#0891b2',
      subtle:  'rgba(6,182,212,0.12)',
    },
  },

  // ── 9-Stage Pipeline Colors ─────────────────────────────────────────────────
  // Unique hue for each stage so pipelines are instantly scannable.
  stage: {
    enquiry:     '#60a5fa',   // Soft blue
    firstCall:   '#a78bfa',   // Lavender
    npcRetry:    '#fb923c',   // Orange
    discovery:   '#fbbf24',   // Yellow
    demoSched:   '#f59e0b',   // Amber
    demoDone:    '#2dd4bf',   // Teal
    negotiation: '#6366f1',   // Indigo
    converted:   '#10b981',   // Green
    lost:        '#ef4444',   // Red
  },

  // ── Semantic Status Colors ──────────────────────────────────────────────────
  semantic: {
    success: '#10b981',
    warning: '#f59e0b',
    danger:  '#ef4444',
    info:    '#3b82f6',
  },
};


// ─────────────────────────────────────────────────────────────────────────────
// Spacing
// ─────────────────────────────────────────────────────────────────────────────
// 4px base unit. Keys map to Tailwind's default `spacing` scale.

const spacing = {
  0:    '0px',
  px:   '1px',
  0.5:  '2px',
  1:    '4px',
  1.5:  '6px',
  2:    '8px',
  2.5:  '10px',
  3:    '12px',
  3.5:  '14px',
  4:    '16px',
  5:    '20px',
  6:    '24px',
  7:    '28px',
  8:    '32px',
  9:    '36px',
  10:   '40px',
  11:   '44px',
  12:   '48px',
  14:   '56px',
  16:   '64px',
  20:   '80px',
  24:   '96px',
  28:   '112px',
  32:   '128px',
  36:   '144px',
  40:   '160px',
  44:   '176px',
  48:   '192px',
  52:   '208px',
  56:   '224px',
  60:   '240px',
  64:   '256px',
  72:   '288px',
  80:   '320px',
  96:   '384px',
};


// ─────────────────────────────────────────────────────────────────────────────
// Border Radii
// ─────────────────────────────────────────────────────────────────────────────

const radii = {
  none: '0px',
  sm:   '6px',
  md:   '10px',
  lg:   '14px',
  xl:   '20px',
  '2xl':'24px',
  full: '9999px',
};


// ─────────────────────────────────────────────────────────────────────────────
// Elevation (Box Shadows)
// ─────────────────────────────────────────────────────────────────────────────
// Tiered shadows with a subtle white border-glow for dark-mode definition.
// Glow variants add a colored halo for interactive or highlighted elements.

const elevation = {
  1: '0 1px 3px rgba(0,0,0,0.12), 0 0 0 1px rgba(255,255,255,0.03)',
  2: '0 4px 16px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.04)',
  3: '0 8px 32px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.05)',
  4: '0 16px 48px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.06)',
  glow: {
    blue:   '0 0 20px rgba(59,130,246,0.25), 0 0 60px rgba(59,130,246,0.08)',
    green:  '0 0 20px rgba(16,185,129,0.25), 0 0 60px rgba(16,185,129,0.08)',
    amber:  '0 0 20px rgba(245,158,11,0.3), 0 0 60px rgba(245,158,11,0.1)',
    violet: '0 0 20px rgba(139,92,246,0.25), 0 0 60px rgba(139,92,246,0.08)',
    red:    '0 0 20px rgba(239,68,68,0.25), 0 0 60px rgba(239,68,68,0.08)',
    cyan:   '0 0 20px rgba(6,182,212,0.25), 0 0 60px rgba(6,182,212,0.08)',
  },
};


// ─────────────────────────────────────────────────────────────────────────────
// Motion
// ─────────────────────────────────────────────────────────────────────────────
// Standardized durations and easing curves for consistent animation feel.

const motion = {
  duration: {
    instant: '75ms',
    fast:    '150ms',
    normal:  '250ms',
    slow:    '400ms',
    slower:  '600ms',
  },
  easing: {
    spring:   'cubic-bezier(0.22, 1, 0.36, 1)',     // Natural spring overshoot
    snappy:   'cubic-bezier(0.2, 0.8, 0.2, 1)',     // Quick snap-in
    bounce:   'cubic-bezier(0.34, 1.56, 0.64, 1)',   // Playful bounce
    standard: 'cubic-bezier(0.4, 0, 0.2, 1)',        // Material standard
  },
};


// ─────────────────────────────────────────────────────────────────────────────
// Z-Index
// ─────────────────────────────────────────────────────────────────────────────
// Predictable stacking order — never reach for magic numbers again.

const zIndex = {
  dropdown: 50,
  sticky:   60,
  overlay:  70,
  modal:    80,
  popover:  90,
  toast:    100,
  tooltip:  110,
};


// ─────────────────────────────────────────────────────────────────────────────
// Typography
// ─────────────────────────────────────────────────────────────────────────────

const typography = {
  // Font family stacks — each with a clear purpose
  family: {
    sans:    ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
    mono:    ['JetBrains Mono', 'Fira Code', 'monospace'],
    display: ['Space Grotesk', 'Inter', 'sans-serif'],
    heading: ['Outfit', 'Inter', 'sans-serif'],
  },
  // Modular type scale — optimized for data-dense dashboards
  // Each entry: [fontSize, { lineHeight }]
  size: {
    '2xs':  ['0.625rem',  { lineHeight: '0.875rem' }],    // 10px
    xs:     ['0.6875rem', { lineHeight: '1rem' }],         // 11px
    sm:     ['0.8125rem', { lineHeight: '1.25rem' }],      // 13px
    base:   ['0.875rem',  { lineHeight: '1.375rem' }],     // 14px
    md:     ['0.9375rem', { lineHeight: '1.5rem' }],       // 15px
    lg:     ['1.125rem',  { lineHeight: '1.625rem' }],     // 18px
    xl:     ['1.25rem',   { lineHeight: '1.75rem' }],      // 20px
    '2xl':  ['1.5rem',    { lineHeight: '2rem' }],         // 24px
    '3xl':  ['1.875rem',  { lineHeight: '2.25rem' }],      // 30px
    '4xl':  ['2.25rem',   { lineHeight: '2.5rem' }],       // 36px
  },
};


// ─────────────────────────────────────────────────────────────────────────────
// Assembled Token Object
// ─────────────────────────────────────────────────────────────────────────────

export const tokens = {
  colors,
  spacing,
  radii,
  elevation,
  motion,
  zIndex,
  typography,
};

export default tokens;
