/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#d4a017',
          light: '#f4c867',
          dark: '#8d6d0b'
        },
        surface: {
          DEFAULT: 'var(--surface-light)',
          dark: 'var(--surface-dark)'
        },
        white: '#f8f2df'
      },
      animation: {
        fade: 'fade 0.2s ease-in-out',
        slideUp: 'slideUp 0.25s ease-out',
        overlay: 'overlay 0.2s ease-in-out'
      },
      keyframes: {
        fade: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 }
        },
        slideUp: {
          '0%': { transform: 'translateY(12px)', opacity: 0 },
          '100%': { transform: 'translateY(0)', opacity: 1 }
        },
        overlay: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 }
        }
      }
    }
  },
  plugins: []
};
