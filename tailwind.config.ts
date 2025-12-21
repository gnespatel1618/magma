import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{ts,tsx,js,jsx}',
    './electron/**/*.{ts,js}'
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(214 32% 91%)',
        input: 'hsl(214 32% 91%)',
        ring: '#E11D48',
        background: 'hsl(210 40% 98%)',
        foreground: 'hsl(222.2 47.4% 11.2%)',
        primary: {
          DEFAULT: '#E11D48',
          foreground: '#FFFFFF'
        },
        'rose-brand': '#E11D48',
        'rose-light': '#FFE4E6',
        'rose-dark': '#881337',
        'rose-error': '#EF4444',
        'warm-gray': '#FAFAF9',
        muted: {
          DEFAULT: 'hsl(214 32% 95%)',
          foreground: 'hsl(215.4 16.3% 46.9%)'
        },
        accent: {
          DEFAULT: 'hsl(214 32% 95%)',
          foreground: 'hsl(222.2 47.4% 11.2%)'
        },
        card: {
          DEFAULT: 'hsl(0 0% 100%)',
          foreground: 'hsl(222.2 47.4% 11.2%)'
        }
      },
      borderRadius: {
        lg: '12px',
        md: '10px',
        sm: '8px'
      },
      boxShadow: {
        soft: '0 10px 30px rgba(15, 23, 42, 0.08)'
      }
    }
  },
  plugins: [require('tailwindcss-animate')]
};

export default config;

