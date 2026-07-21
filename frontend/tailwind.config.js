/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkBg: '#0b0f19',
        darkCard: '#111827',
        darkCardHover: '#1f2937',
        glassBorder: 'rgba(255, 255, 255, 0.08)'
      }
    },
  },
  plugins: [],
}
