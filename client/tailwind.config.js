/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Pretendard",
          "-apple-system",
          "BlinkMacSystemFont",
          "sans-serif",
        ],
      },
      boxShadow: {
        "glass-inner":
          "inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -10px 24px rgba(80,0,0,0.2)",
      },
    },
  },
  plugins: [],
};
