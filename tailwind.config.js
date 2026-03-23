/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: '#09090b',
        'glass-bg': 'rgba(24, 24, 27, 0.6)',
        'glass-bg-hover': 'rgba(39, 39, 42, 0.8)',
        'glass-border': 'rgba(255, 255, 255, 0.08)',
        'glass-border-hover': 'rgba(147, 51, 234, 0.4)',
        'accent-base': '#9333ea',
      },
      fontFamily: {
        body: ['Inter', 'sans-serif'],
        handwritten: ['Caveat', 'cursive'],
      }
    },
  },
  plugins: [],
}
