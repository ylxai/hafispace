/**
 * Hafispace Design System
 * Professional Photography Platform UI/UX Guide
 * 
 * Color Palette: Clean, minimal, photography-focused
 * Style: Liquid Glass - subtle gradients, glassmorphism, clean lines
 */

// ============================================================================
// COLOR PALETTE
// ============================================================================

export const colors = {
  // Primary - Professional Slate (neutral, clean)
  slate: {
    50: '#F8FAFC',   // Background
    100: '#F1F5F9',  // Light backgrounds
    200: '#E2E8F0',  // Borders, dividers
    300: '#CBD5E1',  // Subtle text
    400: '#94A3B8',  // Muted text
    500: '#64748B',  // Secondary text
    600: '#475569',  // Body text
    700: '#334155',  // Headings
    800: '#1E293B',  // Primary text
    900: '#0F172A',  // Headings, emphasis
    950: '#020617',  // Pure dark
  },

  // Accent - Sky Blue (trust, professional)
  sky: {
    50: '#F0F9FF',   // Light backgrounds
    100: '#E0F2FE',  // Hover states
    200: '#BAE6FD',  // Light accents
    300: '#7DD3FC',  // Subtle highlights
    400: '#38BDF8',  // Secondary actions
    500: '#0EA5E9',  // Primary accent (use sparingly)
    600: '#0284C7',  // Hover states
    700: '#0369A1',  // Active states
    800: '#075985',  // Dark accents
    900: '#0C4A6E',  // Deep accents
  },

  // Semantic Colors (use minimally)
  success: {
    50: '#F0FDF4',
    100: '#DCFCE7',
    500: '#10B981',  // Success states
    600: '#059669',
    700: '#047857',
  },
  
  error: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    500: '#EF4444',  // Error states
    600: '#DC2626',
    700: '#B91C1C',
  },

  warning: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    500: '#F59E0B',  // Warning states
    600: '#D97706',
    700: '#B45309',
  },

  // Glass Effects
  glass: {
    light: 'rgba(255, 255, 255, 0.7)',
    medium: 'rgba(255, 255, 255, 0.5)',
    dark: 'rgba(255, 255, 255, 0.3)',
    border: 'rgba(255, 255, 255, 0.18)',
  },
};

// ============================================================================
// TYPOGRAPHY
// ============================================================================

export const typography = {
  // Font Families
  fonts: {
    sans: 'Plus Jakarta Sans, system-ui, -apple-system, sans-serif',
    mono: 'JetBrains Mono, monospace',
  },

  // Font Sizes (using Tailwind's scale)
  sizes: {
    xs: '0.75rem',    // 12px - Captions, metadata
    sm: '0.875rem',   // 14px - Secondary text
    base: '1rem',     // 16px - Body text
    lg: '1.125rem',   // 18px - Lead text
    xl: '1.25rem',    // 20px - H3
    '2xl': '1.5rem',  // 24px - H2
    '3xl': '1.875rem',// 30px - H1
    '4xl': '2.25rem', // 36px - Display
  },

  // Font Weights
  weights: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },

  // Letter Spacing
  tracking: {
    tight: '-0.025em',
    normal: '0',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },
};

// ============================================================================
// SPACING
// ============================================================================

export const spacing = {
  // Using Tailwind's spacing scale (multiples of 4)
  xs: '0.25rem',   // 4px
  sm: '0.5rem',    // 8px
  md: '1rem',      // 16px
  lg: '1.5rem',    // 24px
  xl: '2rem',      // 32px
  '2xl': '3rem',   // 48px
  '3xl': '4rem',   // 64px
};

// ============================================================================
// BORDER RADIUS
// ============================================================================

export const borderRadius = {
  none: '0',
  sm: '0.25rem',   // 4px - Subtle rounding
  md: '0.375rem',  // 6px - Default
  lg: '0.5rem',    // 8px - Cards
  xl: '0.75rem',   // 12px - Large cards
  '2xl': '1rem',   // 16px - Modals
  '3xl': '1.5rem', // 24px - Hero sections
  full: '9999px',  // Pills, buttons
};

// ============================================================================
// SHADOWS (Liquid Glass Effect)
// ============================================================================

export const shadows = {
  // Subtle shadows for depth
  xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
  
  // Glass morphism shadows
  glass: '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
  glassHover: '0 8px 32px 0 rgba(31, 38, 135, 0.1)',
  
  // Inner shadows for depth
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
};

// ============================================================================
// GRADIENTS (Subtle, Professional)
// ============================================================================

export const gradients = {
  // Background gradients
  background: 'linear-gradient(180deg, #F8FAFC 0%, #FFFFFF 100%)',
  
  // Card gradients (liquid glass effect)
  card: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)',
  cardHover: 'linear-gradient(135deg, rgba(255,255,255,1) 0%, rgba(255,255,255,0.8) 100%)',
  
  // Accent gradients (use sparingly)
  accent: 'linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)',
  
  // Overlay gradients
  overlay: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.5) 100%)',
};

// ============================================================================
// COMPONENT STYLES
// ============================================================================

export const componentStyles = {
  // Cards
  card: {
    base: 'bg-white rounded-2xl border border-slate-200 shadow-sm',
    glass: 'bg-white/70 backdrop-blur-xl border border-white/20 shadow-glass',
    hover: 'hover:shadow-lg hover:border-slate-300 transition-all duration-300',
  },

  // Buttons
  button: {
    primary: 'bg-slate-900 text-white hover:bg-slate-800 rounded-full px-6 py-2.5 text-sm font-medium transition-all duration-200 hover:shadow-md',
    secondary: 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300 rounded-full px-6 py-2.5 text-sm font-medium transition-all duration-200 hover:shadow-sm',
    ghost: 'text-slate-600 hover:bg-slate-100 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200',
    danger: 'text-red-600 border border-red-200 hover:bg-red-50 rounded-full px-6 py-2.5 text-sm font-medium transition-all duration-200',
  },

  // Inputs
  input: {
    base: 'w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition-all duration-200',
    glass: 'bg-white/50 backdrop-blur-sm border border-white/20',
  },

  // Badges
  badge: {
    default: 'inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700',
    success: 'inline-flex items-center rounded-full border border-green-200 bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700',
    warning: 'inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700',
    error: 'inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700',
  },

  // Modals
  modal: {
    backdrop: 'fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50',
    content: 'fixed inset-0 z-50 flex items-center justify-center p-4',
    panel: 'bg-white rounded-3xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-white/20',
  },

  // Navigation
  nav: {
    item: 'text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors duration-200',
    active: 'text-slate-900 font-semibold',
  },
};

// ============================================================================
// ANIMATIONS
// ============================================================================

export const animations = {
  // Durations
  duration: {
    fast: '150ms',
    normal: '200ms',
    slow: '300ms',
    slower: '500ms',
  },

  // Easing
  ease: {
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },

  // Common animations
  fadeIn: 'animate-fade-in',
  fadeOut: 'animate-fade-out',
  slideUp: 'animate-slide-up',
  slideDown: 'animate-slide-down',
  scaleIn: 'animate-scale-in',
};

// ============================================================================
// USAGE GUIDELINES
// ============================================================================

/**
 * DO:
 * - Use slate colors for 90% of the UI
 * - Use sky blue ONLY for primary actions and highlights
 * - Keep backgrounds clean and minimal
 * - Use glass effects sparingly (modals, overlays)
 * - Maintain plenty of whitespace
 * - Use subtle shadows for depth
 * 
 * DON'T:
 * - Use more than 2 colors per screen
 * - Use bright/vibrant colors excessively
 * - Add heavy gradients
 * - Use harsh shadows
 * - Clutter the interface
 */

// ============================================================================
// TAILWIND CONFIG EXTENSION
// ============================================================================

export const tailwindConfig = {
  theme: {
    extend: {
      colors: {
        slate: colors.slate,
        sky: colors.sky,
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glass': shadows.glass,
        'glass-hover': shadows.glassHover,
        'inner': shadows.inner,
      },
      backgroundImage: {
        'gradient-card': gradients.card,
        'gradient-accent': gradients.accent,
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
};
