/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        "off-white": "#F9FAFB",
        "pastel-black": "#333D47",
        "pastel-blue": "#A5C9FF",
        "pastel-blue-hover": "#94B9F0",
        "soft-gray": "#E5E9F0",
        "dark-bg": "#1E2228",
        "dark-card": "#272C34",
        "dark-text": "#E8ECEF",
        "dark-muted": "#8B96A5",
      },
      fontFamily: {
        "sans": ["Plus Jakarta Sans", "sans-serif"]
      },
    },
  },
  plugins: [],
}
