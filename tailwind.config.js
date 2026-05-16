/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./App.tsx', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        ink: {
          50: '#FAFAF7',
          100: '#F1F0EB',
          900: '#111',
        },
        accent: {
          500: '#5B4FE5',
        },
      },
      fontFamily: {
        sans: ['Pretendard', 'System'],
      },
    },
  },
  plugins: [],
};
