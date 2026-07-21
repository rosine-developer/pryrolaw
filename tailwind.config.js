/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        ink: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
      },
      boxShadow: {
        'soft':     '0 2px 8px 0 rgb(15 23 42 / 0.08), 0 1px 3px 0 rgb(15 23 42 / 0.06)',
        'card':     '0 2px 12px 0 rgb(15 23 42 / 0.10), 0 1px 4px 0 rgb(15 23 42 / 0.06)',
        'elevated': '0 8px 24px -4px rgb(15 23 42 / 0.14), 0 4px 8px -2px rgb(15 23 42 / 0.08)',
      },
      borderRadius: {
        'sm':   '0.375rem',  // 6px  — inputs, badges
        'md':   '0.625rem',  // 10px — small buttons
        'lg':   '1rem',      // 16px — buttons, dropdowns
        'xl':   '1.25rem',   // 20px — cards, panels
        '2xl':  '1.5rem',    // 24px — modals, sidebars
        '3xl':  '1.5625rem', // 25px — hero sections
        'full': '9999px',    // pills, avatars
      },
    },
  },
  plugins: [],
};
