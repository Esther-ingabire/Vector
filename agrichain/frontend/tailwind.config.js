/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: { 50:'#eef7f2', 100:'#c8e6d5', 200:'#a0d4b8', 300:'#72be97', 400:'#228b52', 500:'#1a5c34', 600:'#155029', 700:'#0f3d22', 800:'#0b2b18', 900:'#0b2b18' },
        success: { 50:'#f0fdf4', 100:'#dcfce7', 400:'#4ade80', 500:'#22c55e', 600:'#16a34a', 700:'#15803d' },
        warning: { 50:'#f7fee7', 100:'#ecfccb', 400:'#a3e635', 500:'#65a30d', 600:'#4d7c0f' },
        danger:  { 50:'#fff1f2', 100:'#ffe4e6', 400:'#f87171', 500:'#ef4444', 600:'#dc2626' },
        info:    { 50:'#eff6ff', 100:'#dbeafe', 500:'#3b82f6', 600:'#2563eb' },
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
}
