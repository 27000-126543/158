/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        primary: {
          50: '#E8F3FF',
          100: '#BEDAFF',
          200: '#94C2FF',
          300: '#6AA7FF',
          400: '#408CFF',
          500: '#165DFF',
          600: '#0E42D2',
          700: '#0A2BA0',
          800: '#061A6E',
          900: '#030D3C',
        },
        success: {
          50: '#E8FFEA',
          100: '#B8FFBF',
          200: '#8AFF95',
          300: '#5CFF6B',
          400: '#2EFF41',
          500: '#00B42A',
          600: '#009A29',
          700: '#007D26',
          800: '#005F20',
          900: '#004219',
        },
        warning: {
          50: '#FFF7E8',
          100: '#FFE8B8',
          200: '#FFD78A',
          300: '#FFC55C',
          400: '#FFB32E',
          500: '#FF7D00',
          600: '#D96A00',
          700: '#B35700',
          800: '#8C4400',
          900: '#663100',
        },
        danger: {
          50: '#FFECE8',
          100: '#FFCDC4',
          200: '#FFAEA0',
          300: '#FF8F7C',
          400: '#FF7058',
          500: '#F53F3F',
          600: '#CB2634',
          700: '#A01829',
          800: '#750E1E',
          900: '#4A0713',
        },
        neutral: {
          50: '#F7F8FA',
          100: '#F2F3F5',
          200: '#E5E6EB',
          300: '#C9CDD4',
          400: '#86909C',
          500: '#4E5969',
          600: '#272E3B',
          700: '#1D2129',
          800: '#000000',
        }
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-soft': 'pulseSoft 2s infinite',
        'number-roll': 'numberRoll 1s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        numberRoll: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
