/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#3FE3FF',
          hover: '#2FD0EC',
          light: '#7BF0FF',
          dark: '#0AA8C4',
        },
        brand: {
          blue: '#2353E9',
        },
        secondary: {
          DEFAULT: '#00B894',
          hover: '#00A382',
        },
        accent: {
          DEFAULT: '#FD79A8',
        },
        dark: {
          bg: '#050505',
          surface: '#111111',
          border: 'rgba(255, 255, 255, 0.08)',
          text: '#FFFFFF',
          muted: '#8E8E93',
          deeper: '#000000',
          card: '#0A0A0A',
          sidebar: '#080808',
          'nav-active': 'rgba(63, 227, 255, 0.08)',
          hover: '#161616',
        }
      },
      fontFamily: {
        sans: ['Geist', 'sans-serif'],
        mono: ['Geist Mono', 'monospace'],
      },
      boxShadow: {
        premium: '0 4px 24px rgba(0, 0, 0, 0.6)',
        'premium-hover': '0 12px 30px rgba(0, 0, 0, 0.8), 0 0 16px rgba(63, 227, 255, 0.03)',
        glow: '0 0 16px rgba(63, 227, 255, 0.08)',
        'glow-sm': '0 0 10px rgba(63, 227, 255, 0.04)',
        'card-glow': '0 0 24px rgba(0, 0, 0, 0.4)',
      }
    },
  },
  plugins: [],
}
