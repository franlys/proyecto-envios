// ==============================================================================
// 🎨 DESIGN TOKENS - ProLogix Design System
// ==============================================================================
// Sistema de diseño enterprise inspirado en Stripe, Brex, Mercury

/**
 * PALETA DE COLORES PRINCIPAL
 * Slate para neutrales, Indigo para acciones primarias
 */
export const colors = {
  // Neutrales (Slate)
  slate: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a'
  },

  // Primario (Indigo)
  indigo: {
    50: '#eef2ff',
    100: '#e0e7ff',
    200: '#c7d2fe',
    300: '#a5b4fc',
    400: '#818cf8',
    500: '#6366f1',
    600: '#4f46e5',
    700: '#4338ca',
    800: '#3730a3',
    900: '#312e81'
  },

  // Success (Emerald)
  emerald: {
    50: '#ecfdf5',
    100: '#d1fae5',
    200: '#a7f3d0',
    300: '#6ee7b7',
    400: '#34d399',
    500: '#10b981',
    600: '#059669',
    700: '#047857',
    800: '#065f46',
    900: '#064e3b'
  },

  // Warning (Amber)
  amber: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f'
  },

  // Danger (Rose)
  rose: {
    50: '#fff1f2',
    100: '#ffe4e6',
    200: '#fecdd3',
    300: '#fda4af',
    400: '#fb7185',
    500: '#f43f5e',
    600: '#e11d48',
    700: '#be123c',
    800: '#9f1239',
    900: '#881337'
  }
};

/**
 * TIPOGRAFÍA
 * Inter para UI, Geist Mono para código
 */
export const typography = {
  fonts: {
    sans: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    mono: '"Geist Mono", "Fira Code", "Courier New", monospace'
  },

  sizes: {
    xs: '0.75rem',      // 12px
    sm: '0.875rem',     // 14px
    base: '1rem',       // 16px
    lg: '1.125rem',     // 18px
    xl: '1.25rem',      // 20px
    '2xl': '1.5rem',    // 24px
    '3xl': '1.875rem',  // 30px
    '4xl': '2.25rem',   // 36px
    '5xl': '3rem'       // 48px
  },

  weights: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700
  }
};

/**
 * ESPACIADO
 * Sistema de 4px
 */
export const spacing = {
  0: '0',
  1: '0.25rem',   // 4px
  2: '0.5rem',    // 8px
  3: '0.75rem',   // 12px
  4: '1rem',      // 16px
  5: '1.25rem',   // 20px
  6: '1.5rem',    // 24px
  8: '2rem',      // 32px
  10: '2.5rem',   // 40px
  12: '3rem',     // 48px
  16: '4rem',     // 64px
  20: '5rem',     // 80px
  24: '6rem'      // 96px
};

/**
 * BORDER RADIUS
 */
export const borderRadius = {
  none: '0',
  sm: '0.25rem',    // 4px
  base: '0.5rem',   // 8px
  md: '0.75rem',    // 12px
  lg: '1rem',       // 16px
  xl: '1.5rem',     // 24px
  '2xl': '2rem',    // 32px
  full: '9999px'
};

/**
 * SOMBRAS
 * Sombras sutiles para profundidad
 */
export const shadows = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  base: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)'
};

/**
 * TRANSICIONES
 */
export const transitions = {
  fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
  base: '200ms cubic-bezier(0.4, 0, 0.2, 1)',
  slow: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
  bounce: '500ms cubic-bezier(0.68, -0.55, 0.265, 1.55)'
};

/**
 * COMPONENTES PRE-CONFIGURADOS
 */
export const components = {
  // Botones
  button: {
    primary: `
      bg-indigo-600 text-white rounded-lg px-4 py-2
      hover:bg-indigo-700 active:bg-indigo-800
      transition-colors duration-200
      font-medium shadow-sm
      disabled:opacity-50 disabled:cursor-not-allowed
    `,
    secondary: `
      bg-slate-100 text-slate-700 rounded-lg px-4 py-2
      hover:bg-slate-200 active:bg-slate-300
      transition-colors duration-200
      font-medium
      disabled:opacity-50 disabled:cursor-not-allowed
    `,
    danger: `
      bg-rose-600 text-white rounded-lg px-4 py-2
      hover:bg-rose-700 active:bg-rose-800
      transition-colors duration-200
      font-medium shadow-sm
      disabled:opacity-50 disabled:cursor-not-allowed
    `,
    ghost: `
      bg-transparent text-slate-600 rounded-lg px-4 py-2
      hover:bg-slate-100 active:bg-slate-200
      transition-colors duration-200
      font-medium
      disabled:opacity-50 disabled:cursor-not-allowed
    `
  },

  // Cards
  card: {
    base: `
      bg-white rounded-xl shadow-sm border border-slate-200
      hover:shadow-md transition-shadow duration-200
    `,
    elevated: `
      bg-white rounded-xl shadow-lg border border-slate-200
    `,
    interactive: `
      bg-white rounded-xl shadow-sm border border-slate-200
      hover:shadow-md hover:border-indigo-300
      transition-all duration-200 cursor-pointer
    `
  },

  // Inputs
  input: {
    base: `
      w-full px-4 py-2 border border-slate-300 rounded-lg
      focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
      transition-all duration-200
      disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed
    `,
    error: `
      w-full px-4 py-2 border-2 border-rose-500 rounded-lg
      focus:outline-none focus:ring-2 focus:ring-rose-500
      transition-all duration-200
    `
  },

  // Badges
  badge: {
    success: `
      inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
      bg-emerald-100 text-emerald-800
    `,
    warning: `
      inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
      bg-amber-100 text-amber-800
    `,
    danger: `
      inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
      bg-rose-100 text-rose-800
    `,
    info: `
      inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
      bg-indigo-100 text-indigo-800
    `,
    neutral: `
      inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
      bg-slate-100 text-slate-800
    `
  }
};

/**
 * UTILIDADES PARA ANIMACIONES
 */
export const animations = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.3 }
  },

  slideUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4 }
  },

  slideDown: {
    initial: { opacity: 0, y: -20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4 }
  },

  scaleIn: {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    transition: { duration: 0.3 }
  },

  // Para listas con stagger
  staggerContainer: {
    animate: {
      transition: {
        staggerChildren: 0.1
      }
    }
  },

  staggerItem: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 }
  }
};

export default {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  transitions,
  components,
  animations
};
