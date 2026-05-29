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
          DEFAULT: '#6C5CE7',
          hover: '#5A4BD1',
          light: '#EDE9FE',
        },
        secondary: {
          DEFAULT: '#00B894',
          hover: '#00A382',
        },
        accent: {
          DEFAULT: '#FD79A8',
        },
        dark: {
          bg: '#0F0F0F',
          surface: '#1A1A1A',
          border: '#2A2A2A',
          text: '#FAFAFA',
          muted: '#A3A3A3',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        premium: '0 4px 20px -2px rgba(108, 92, 231, 0.1)',
        'premium-hover': '0 8px 30px -2px rgba(108, 92, 231, 0.15)',
      }
    },
  },
  plugins: [],
}
