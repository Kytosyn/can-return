/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eefbf3",
          100: "#d5f5e1",
          200: "#aeeac7",
          300: "#79d8a7",
          400: "#43bf83",
          500: "#1fa368",
          600: "#138453",
          700: "#106a44",
          800: "#105438",
          900: "#0e452f",
          950: "#07271a",
        },
      },
    },
  },
  plugins: [],
};
