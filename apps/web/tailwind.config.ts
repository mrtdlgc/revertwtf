import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        mono: ['"JetBrains Mono"', '"IBM Plex Mono"', "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
        display: ['"VT323"', '"IBM Plex Mono"', "ui-monospace", "monospace"],
      },
      colors: {
        ink: "#0b0d14",
        paper: "#f2ead2",
        bone: "#cfc2a3",
        blood: "#ff3d65",
        acid: "#d7ff2f",
        cyan: "#28e0bf",
        amber: "#ffae42",
        violet: "#8b6dff",
        rust: "#a84b2b",
        smoke: "#141723",
        chalk: "#fff8dc",
      },
      letterSpacing: {
        widish: "0.04em",
        wide2: "0.08em",
      },
      borderWidth: { "3": "3px" },
    },
  },
  plugins: [],
} satisfies Config;
