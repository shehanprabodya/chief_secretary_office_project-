/** @type {import('tailwindcss').Config} */

export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f4f8',
          100: '#d9e7f7',
          200: '#a8ceef',
          300: '#7ab4e8',
          400: '#4c9ae0',
          500: '#2563b8',
          600: '#1e4a8f',
          700: '#1a3f7a',
          800: '#143465',
          900: '#0f2951',
        },
        slate: {
          50: '#f8fafc',
          100: '#f1f5f9',
          150: '#eef2f5',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          750: '#2d3748',
          800: '#1e293b',
          900: '#0f172a',
          950: '#0a1628',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'system-ui', 'sans-serif'],
        serif: ['Georgia', 'serif'],
        mono: ['Menlo', 'Monaco', 'monospace'],
      },
      fontSize: {
        xs: ['11px', { lineHeight: '1.4', letterSpacing: '-0.5px' }],
        sm: ['12px', { lineHeight: '1.5', letterSpacing: '-0.25px' }],
        base: ['14px', { lineHeight: '1.6' }],
        lg: ['15px', { lineHeight: '1.7' }],
        xl: ['16px', { lineHeight: '1.75' }],
        '2xl': ['18px', { lineHeight: '1.8' }],
        '3xl': ['20px', { lineHeight: '1.9' }],
      },
      spacing: {
        '0.75': '3px',
        '2.25': '9px',
        '4.5': '18px',
      },
      opacity: {
        6: '0.06',
        8: '0.08',
        12: '0.12',
        35: '0.35',
        65: '0.65',
        72: '0.72',
        82: '0.82',
      },
      zIndex: {
        50: '50',
        100: '100',
      },
      borderRadius: {
        xs: '4px',
        sm: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px',
      },
      boxShadow: {
        xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        sm: '0 1px 4px rgba(0, 0, 0, 0.06)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        lg: '0 8px 24px rgba(0, 0, 0, 0.1)',
        xl: '0 12px 32px rgba(0, 0, 0, 0.15)',
        '2xl': '0 20px 48px rgba(0, 0, 0, 0.2)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideInUp 0.4s ease-out',
        'slide-down': 'slideInDown 0.4s ease-out',
        'slide-left': 'slideInLeft 0.4s ease-out',
        'slide-right': 'slideInRight 0.4s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideInUp: {
          '0%': { transform: 'translateY(1rem)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideInDown: {
          '0%': { transform: 'translateY(-1rem)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideInLeft: {
          '0%': { transform: 'translateX(-1rem)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(1rem)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
      },
      transitionDuration: {
        150: '150ms',
        200: '200ms',
        250: '250ms',
      },
      maxWidth: {
        xs: '20rem',
        sm: '24rem',
        md: '28rem',
        lg: '32rem',
        xl: '36rem',
        '2xl': '42rem',
      },
      minHeight: {
        screen: '100vh',
        'screen-safe': 'calc(100vh - 56px)',
      },
      aspectRatio: {
        '4/3': '4 / 3',
        '16/9': '16 / 9',
        '21/9': '21 / 9',
      },
    },
  },
  plugins: [
    function ({ addVariant }) {
      addVariant('not-last', '&:not(:last-child)');
      addVariant('not-first', '&:not(:first-child)');
    },
  ],
};
