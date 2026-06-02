/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: { 50:'#e8f0fe', 100:'#c5d5f7', 500:'#2E75B6', 600:'#1F4E79', 700:'#163b5c', 900:'#0c2340' },
        success: { 50:'#d6f0e2', 500:'#1A5C34', 600:'#155029' },
        warning: { 50:'#FCE4D6', 500:'#C55A11', 600:'#a34a0e' },
        danger:  { 50:'#FFE0E0', 500:'#C00000', 600:'#990000' },
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
}
