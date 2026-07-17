/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#769381', soft: '#EAF1EA' },
        pos: '#78A991',
        neg: '#C9857A',
        sage: '#8FAE9A',
        aqua: '#8AB8B1',
        mist: '#98B7C7',
        mint: '#8DB7A1',
      },
      boxShadow: { card: '0 10px 26px rgba(55,68,59,0.07)' },
    },
  },
  plugins: [],
};
