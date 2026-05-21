/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "rgb(var(--bg))",
        card: "rgb(var(--card))",
        muted: "rgb(var(--muted))",
        border: "rgb(var(--border))",
        text: "rgb(var(--text))",
        "text-muted": "rgb(var(--text-muted))",
        primary: "rgb(var(--primary))",
        "primary-600": "rgb(var(--primary-600))",
        success: "rgb(var(--success))",
        warning: "rgb(var(--warning))",
        danger: "rgb(var(--danger))",
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
