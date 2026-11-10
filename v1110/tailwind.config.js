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
        studio: {
          black: '#121214',
          viewport: '#1A1A1A',
        },
        panel: {
          surface: '#1C1C1E',
          elevated: '#242426',
          border: '#2C2C2E',
        },
        wood: {
          oak: '#D4AF37',
          walnut: '#8B5A2B',
          birch: '#DEB887',
        },
        semantic: {
          emerald: '#30D158',
          amber: '#FF9F0A',
          crimson: '#FF453A',
          blue: '#0A84FF',
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'sans-serif'],
      },
      backdropBlur: {
        glass: '16px',
      }
    },
  },
  plugins: [],
}
