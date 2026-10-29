import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#E63946', // rojo peruano
          dark: '#C1121F',
          light: '#FF6B6B',
        },
        accent: {
          DEFAULT: '#F4A261', // naranja
          dark: '#E76F51',
        },
        cream: '#FDF6E3',
        ink: '#1D1D1F',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;