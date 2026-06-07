/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        shi: {
          blue: '#253746',
          accent: '#1C64A5',
          grey: '#ACAFBC',
          lime: '#B1DF00',
          teal: '#06B2B1',
          orange: '#FF6D15',
        },
      },
      fontFamily: {
        sans: ['Roboto', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 10px 24px rgba(37, 55, 70, 0.08)',
      },
    },
  },
  plugins: [],
}
