/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        groww: {
          primary: "#00D09C",
          "primary-dark": "#00B386",
          "primary-hover": "#00C48F",
          "primary-bg": "rgba(0, 208, 156, 0.08)",
          bg: "#F4F6F8",
          card: "#FFFFFF",
          border: "#EAECF0",
          text: "#1E222D",
          muted: "#7C7E8C",
          green: "#00B386",
          red: "#EB5757",
          amber: "#F59E0B",
          blue: "#3B82F6",
        },
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        display: ["Outfit", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      keyframes: {
        flashGreen: {
          "0%": { backgroundColor: "#E6F9F5" },
          "100%": { backgroundColor: "transparent" },
        },
        flashRed: {
          "0%": { backgroundColor: "#FDF2F2" },
          "100%": { backgroundColor: "transparent" },
        },
        livePulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        },
      },
      animation: {
        "flash-up": "flashGreen 0.7s ease-out",
        "flash-down": "flashRed 0.7s ease-out",
        "live-pulse": "livePulse 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
