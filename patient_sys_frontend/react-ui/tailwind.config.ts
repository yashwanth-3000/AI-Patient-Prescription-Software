import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(214 32% 91%)",
        input: "hsl(214 32% 91%)",
        ring: "hsl(220 14% 96%)",
        background: "#ffffff",
        foreground: "#111111",
        primary: {
          DEFAULT: "#111111",
          foreground: "#ffffff"
        },
        muted: {
          DEFAULT: "#f5f5f5",
          foreground: "#6b7280"
        },
        card: {
          DEFAULT: "#ffffff",
          foreground: "#111111"
        }
      },
      borderRadius: {
        "2xl": "1rem"
      }
    }
  },
  plugins: [],
} satisfies Config;


