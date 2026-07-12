/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#3182F6', soft: '#E8F1FE' },
        pos: '#1DB47C',
        neg: '#F04452',
      },
      boxShadow: { card: '0 2px 12px rgba(0,0,0,0.06)' },
    },
  },
  plugins: [],
};
