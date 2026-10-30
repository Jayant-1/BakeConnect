import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        cream: {
          base: '#FFF7EB',
          surface: '#FFFFFF',
          subtle: '#F6EEE3',
          border: '#E2D7C5',
        },
        pale: {
          blue: '#D9EAF3',
          subtle: '#EBF4F9',
          border: '#BFD9E8',
        },
        bakery: {
          orange: '#FF7836',
          hover: '#E86322',
          subtle: '#FFF0E8',
        },
        chocolate: {
          dark: '#342421',
          muted: '#614B47',
          faint: '#9E8681',
        },
        neutral: {
          surface: '#F1ECE4',
          border: '#DCD4C8',
        },
        crust: {
          dark: '#342421',
          muted: '#614B47',
          faint: '#9E8681',
        },
        berry: {
          jam: '#FF7836',
          hover: '#E86322',
          subtle: '#FFF0E8',
        },
        butter: {
          warm: '#D4973B',
          surface: '#FDF8EC',
        },
        sea: {
          tide: '#548FA8',
          subtle: '#EDF5F9',
        },
        status: {
          success: '#286E46',
          'success-bg': '#EDF7F1',
          warning: '#A15C07',
          'warning-bg': '#FEF6EC',
          error: '#B91C1C',
          'error-bg': '#FEF2F2',
          info: '#1D5C96',
          'info-bg': '#EFF6FC',
        },
      },
      boxShadow: {
        'offset-dark': '4px 4px 0px #342421',
        'offset-sm': '2px 2px 0px #342421',
        'offset-lg': '6px 6px 0px #342421',
      },
      fontFamily: {
        display: ['var(--font-anton)', 'Impact', 'sans-serif'],
        sans: ['var(--font-roboto)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      animation: {
        'spin-slow': 'spin 20s linear infinite',
        'fade-in': 'fadeIn 0.25s ease-out forwards',
        'slide-up': 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(12px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
