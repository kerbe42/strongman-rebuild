/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // week-type palette (build / deload / test)
        build: { DEFAULT: "#1d4ed8", soft: "#1e3a8a" },
        deload: { DEFAULT: "#0f766e", soft: "#134e4a" },
        test: { DEFAULT: "#b45309", soft: "#7c2d12" },
      },
      minHeight: {
        tap: "3.25rem", // large tap target for chalked hands
      },
    },
  },
  plugins: [],
};
