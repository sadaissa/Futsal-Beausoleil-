import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: "#07090a", 900: "#0b0f0d", 800: "#111814", 700: "#18221c", 600: "#223027" },
        pitch: { DEFAULT: "#13723f", light: "#1f9d57", dark: "#0b4a28", line: "#c9f3d8" },
        gold: { DEFAULT: "#e5b53a", light: "#f8e08e", dark: "#9c7316", deep: "#6b4c0b" },
        boulet: { DEFAULT: "#c62828", dark: "#5a0b0b" },
      },
      fontFamily: {
        display: ["var(--font-display)", "Impact", "sans-serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        gold: "0 0 0 1px rgba(248,224,142,.55), 0 10px 40px -10px rgba(229,181,58,.55)",
        boulet: "0 0 0 1px rgba(255,120,120,.4), 0 10px 40px -10px rgba(198,40,40,.6)",
      },
      keyframes: {
        shine: { "0%": { backgroundPosition: "200% 0" }, "100%": { backgroundPosition: "-200% 0" } },
        rise: { "0%": { opacity: "0", transform: "translateY(18px) scale(.96)" }, "100%": { opacity: "1", transform: "none" } },
        pulseGlow: { "0%,100%": { opacity: ".55" }, "50%": { opacity: "1" } },
      },
      animation: {
        shine: "shine 6s linear infinite",
        rise: "rise .6s cubic-bezier(.2,.8,.2,1) both",
        pulseGlow: "pulseGlow 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
