/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        outfit: ['Outfit', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
      },
      colors: {
        void: '#06060F',
        surface: 'rgba(255,255,255,0.04)',
        'surface-hover': 'rgba(255,255,255,0.07)',
        'surface-border': 'rgba(255,255,255,0.08)',
        accent: {
          violet: '#7C3AED',
          cyan: '#06B6D4',
          pink: '#EC4899',
        },
        slate: {
          850: '#0F172A',
          900: '#0A0F1E',
          950: '#06060F',
        },
      },
      backgroundImage: {
        'gradient-accent': 'linear-gradient(135deg, #7C3AED, #06B6D4)',
        'gradient-card': 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(6,182,212,0.08))',
        'gradient-danger': 'linear-gradient(135deg, #F43F5E, #FB923C)',
        'gradient-success': 'linear-gradient(135deg, #10B981, #06B6D4)',
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'gradient-x': 'gradient-x 8s ease infinite',
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'shimmer': 'shimmer 1.5s infinite',
        'count-up': 'countUp 1s ease-out forwards',
      },
      keyframes: {
        'gradient-x': {
          '0%, 100%': { 'background-position': '0% 50%' },
          '50%': { 'background-position': '100% 50%' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      boxShadow: {
        'glass': '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)',
        'glass-hover': '0 12px 40px rgba(124,58,237,0.2), inset 0 1px 0 rgba(255,255,255,0.12)',
        'accent-glow': '0 0 30px rgba(124,58,237,0.4)',
        'cyan-glow': '0 0 20px rgba(6,182,212,0.3)',
        'card-hover': '0 20px 60px rgba(0,0,0,0.5)',
      },
    },
  },
  plugins: [],
}
