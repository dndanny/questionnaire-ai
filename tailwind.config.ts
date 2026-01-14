
import type { Config } from "tailwindcss";
const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand': {
          100: '#E0F7FA',
          300: '#4DD0E1',
          500: '#00BCD4',
          700: '#0097A7',
          900: '#006064',
        },
        'accent': {
          pink: '#FF80AB',
          yellow: '#FFEA00',
        }
      },
      boxShadow: {
        'neopop': '4px 4px 0px 0px rgba(0,0,0,1)',
        'neopop-active': '0px 0px 0px 0px rgba(0,0,0,1)',
      }
    },
  },
  plugins: [],
};
export default config;
