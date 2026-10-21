import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f1f0ff",
          100: "#e4e2ff",
          200: "#cdc9ff",
          300: "#aaa3ff",
          400: "#8473ff",
          500: "#6847ff",
          600: "#5a2ef5",
          700: "#4c22d8",
          800: "#3f1eb0",
          900: "#341d8a",
        },
        ink: {
          50: "#f7f7f9",
          100: "#eeeef2",
          200: "#dcdce4",
          300: "#b9b9c7",
          400: "#8d8da1",
          500: "#6a6a80",
          600: "#4f4f63",
          700: "#3b3b4c",
          800: "#232331",
          900: "#14141d",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["'Plus Jakarta Sans'", "Inter", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(20,20,29,.04), 0 4px 16px rgba(20,20,29,.06)",
        pop: "0 12px 40px rgba(52,29,138,.18)",
      },
      keyframes: {
        "fade-up": { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "none" } },
        shimmer: { "0%": { backgroundPosition: "-400px 0" }, "100%": { backgroundPosition: "400px 0" } },
      },
      animation: {
        "fade-up": "fade-up .35s ease-out both",
        shimmer: "shimmer 1.4s linear infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
