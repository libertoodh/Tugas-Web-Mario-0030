import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // Palet mengikuti identitas Institut Desain dan Bisnis Bali:
      // biru laut dalam sebagai warna utama dan oranye sebagai aksen.
      // (Nilai diambil dari CSS global situs resmi idbbali.ac.id.)
      colors: {
        ink: {
          900: "#101820",
          800: "#1c2732",
          700: "#33404d",
          600: "#4d5a67",
          500: "#6b7885",
        },
        sand: {
          50: "#f6f8fa",
          100: "#eef1f5",
          200: "#e3e8ee",
          300: "#d2dae3",
        },
        brand: {
          50: "#eef6fb",
          100: "#d6e9f5",
          200: "#a9cfe6",
          300: "#74aecb",
          400: "#3d8bb0",
          500: "#1e7096",
          600: "#0c5d80",
          700: "#024d71",
          800: "#023e5c",
          900: "#012f46",
        },
        accent: {
          50: "#fff4ea",
          100: "#ffe5cc",
          200: "#ffc999",
          300: "#ffa866",
          400: "#fa8c33",
          500: "#f17711",
          600: "#d66209",
          700: "#b24e08",
          800: "#8c3d08",
          900: "#6f3109",
        },
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 1px 2px rgba(20, 23, 21, 0.04), 0 8px 24px -12px rgba(20, 23, 21, 0.12)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};

export default config;
