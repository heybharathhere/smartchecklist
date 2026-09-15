/** @type {import('tailwindcss').Config} */
const token = (name) => `rgb(var(${name}) / <alpha-value>)`;

export default {
  darkMode: ['class', '.dark'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: token('--c-ink'),
        raised: token('--c-raised'),
        surface: token('--c-surface'),
        hairline: token('--c-hairline'),
        limestone: token('--c-text'),
        steel: token('--c-muted'),
        copper: token('--c-accent'),
        'copper-soft': token('--c-accent-soft'),
        teal: token('--c-progress'),
        critical: token('--c-critical'),
        high: token('--c-high'),
        medium: token('--c-medium'),
        low: token('--c-low'),
      },
      fontFamily: {
        display: ['Sora', 'Segoe UI', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      borderRadius: {
        card: '18px',
        control: '11px',
      },
      boxShadow: {
        raise: '0 1px 2px rgb(var(--c-shadow) / 0.28), 0 12px 32px -18px rgb(var(--c-shadow) / 0.55)',
        float: '0 24px 60px -24px rgb(var(--c-shadow) / 0.7)',
        inset: 'inset 0 1px 0 rgb(255 255 255 / var(--sheen))',
      },
      transitionTimingFunction: {
        swift: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.97)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.22s cubic-bezier(0.22, 1, 0.36, 1)',
        'scale-in': 'scale-in 0.16s cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
};
