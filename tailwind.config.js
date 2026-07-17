/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#43B5FF', soft: '#113A5D' },
        pos: '#6EE7B7',
        neg: '#FF7A8A',
      },
      boxShadow: { card: '0 12px 28px rgba(2,8,16,0.32)' },
    },
  },
  plugins: [],
};
