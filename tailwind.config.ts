import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0B0C0F",
        panel: "#131519",
        line: "#22252B",
        mist: "#8A8F98",
        paper: "#EDEDF0",
        accent: "#2DD4BF",
        accentDim: "#1B7F73",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
        mono: ["var(--font-mono)"],
      },
      keyframes: {
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.2" },
        },
        rise: {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        blink: "blink 1.2s ease-in-out infinite",
        rise: "rise 0.25s ease-out",
      },
    },
  },
  plugins: [],
};
export default config;
