import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: {
          DEFAULT: "#FBFBFA",
          subtle: "#F4F3EF",
          card: "#FFFFFF",
        },
        ink: {
          DEFAULT: "#111110",
          secondary: "#64635E",
          muted: "#9E9D97",
        },
        border: {
          hairline: "#E5E4DE",
          subtle: "#D6D5CD",
        },
        signal: {
          lime: "#C8FF00",
          crimson: "#C5221F",
          amber: "#D97706",
        },
      },
      fontFamily: {
        serif: ["Instrument Serif", "Georgia", "serif"],
        mono: ["Geist Mono", "JetBrains Mono", "monospace"],
        sans: ["Geist Sans", "Inter", "-apple-system", "sans-serif"],
      },
      boxShadow: {
        subtle: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)",
      },
    },
  },
  plugins: [],
};

export default config;
