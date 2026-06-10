import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#fff4ed",
          100: "#ffe0c5",
          200: "#ffc09a",
          300: "#ff9060",
          400: "#f96d30",
          500: "#e55c00",
          600: "#cc4f00",
          700: "#a33d00",
          800: "#7a2d00",
          900: "#521e00",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "'Fira Code'", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
