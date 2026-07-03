import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f2f6f9",
          100: "#e3ecf2",
          200: "#c6d8e3",
          300: "#9cbccd",
          400: "#6d97ae",
          500: "#4c7893",
          600: "#3a6079",
          700: "#314e62",
          800: "#273F4F",
          900: "#20333f",
          950: "#141f27"
        },
        ember: {
          50: "#fdf5ef",
          100: "#fbe7d8",
          200: "#f6ccae",
          300: "#f0a97b",
          400: "#ea7f45",
          500: "#e56425",
          600: "#d64f1a",
          700: "#b23c17",
          800: "#8e311a",
          900: "#732b18"
        }
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem"
      },
      boxShadow: {
        soft: "0 1px 2px rgb(20 31 39 / 0.05), 0 8px 24px -12px rgb(20 31 39 / 0.18)",
        lift: "0 2px 4px rgb(20 31 39 / 0.06), 0 16px 40px -16px rgb(20 31 39 / 0.28)"
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        }
      },
      animation: {
        "fade-up": "fade-up .45s ease-out both"
      }
    }
  },
  plugins: []
};
export default config;
