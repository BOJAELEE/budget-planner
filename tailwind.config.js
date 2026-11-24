/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#18181b', soft: '#f1f5f9' },
        pos: '#15803d',
        neg: '#dc2626',
        sage: '#18181b',
        aqua: '#52525b',
        mist: '#6b7280',
        mint: '#15803d',
      },
      boxShadow: { card: '0 2px 10px rgba(17,24,39,0.05)' },
    },
  },
  plugins: [],
};
