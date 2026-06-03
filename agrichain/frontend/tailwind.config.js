/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: { 50:'#eef7f2', 100:'#c8e6d5', 200:'#a0d4b8', 300:'#72be97', 400:'#3fa871', 500:'#228b52', 600:'#1a5c34', 700:'#155029', 900:'#0b2b18' },
        success: { 50:'#d6f0e2', 500:'#1A5C34', 600:'#155029' },
        warning: { 50:'#FCE4D6', 500:'#C55A11', 600:'#a34a0e' },
        danger:  { 50:'#FFE0E0', 500:'#C00000', 600:'#990000' },
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
}
