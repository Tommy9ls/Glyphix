/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Poppins", "sans-serif"],
      },
      colors: {
        gold: {
          400: "#F5C842",
          500: "#E6B800",
          600: "#C9A000",
        }
      }
    },
  },
  plugins: [],
}