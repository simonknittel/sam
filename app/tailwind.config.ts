import { type Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // New:
        "interaction-300": "var(--color-interaction-300)",
        "interaction-500": "var(--color-interaction-500)",
        "interaction-700": "var(--color-interaction-700)",
        "interaction-900": "var(--color-interaction-900)",
        "text-primary": "var(--color-text-primary)",
        me: "var(--color-me)",

        // Old:
        "brand-red-900": "hsl(0 69% 10% / 1)",
        "brand-red-700": "hsl(0 69% 30% / 1)",
        "brand-red-500": "hsl(0 69% 43% / 1)",
        "brand-red-300": "#CC4444",
        "rsi-blue-100": "#7ef8ff",
        "rsi-blue-200": "#56a6b6",
        "rsi-blue-300": "#0e2635",
      },
      backgroundImage: {
        "brand-text-gradient": "radial-gradient(#BB2222, hsl(0 69% 30% / 1))",
      },
      borderRadius: {
        primary: "var(--radius-primary)",
        secondary: "var(--radius-secondary)",
      },
      screens: {
        "3xl": "1920px",
      },
      fontFamily: {
        mono: "var(--font-roboto-mono), monospace",
      },
    },
  },
  plugins: [
    require("@tailwindcss/typography"),
    require("@tailwindcss/container-queries"),
  ],
} satisfies Config;
