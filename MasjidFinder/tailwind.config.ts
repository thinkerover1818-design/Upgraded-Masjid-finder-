import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        emerald: { 900: "#0B342B", 700: "#12503F", 600: "#166C55", 100: "#E4EEE9" },
        gold: { 600: "#B4872E", 500: "#C79A3E" },
        sand: { 50: "#F7F4EC", 100: "#F1ECDF" },
        ink: { 900: "#1B2320", 600: "#4A554F", 400: "#7C877F" },
      },
    },
  },
  plugins: [],
};
export default config;
