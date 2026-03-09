import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#07090f',
        card: '#111827',
        accent: '#7c3aed',
        mint: '#34d399'
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(124,58,237,0.3), 0 20px 50px -20px rgba(124,58,237,0.45)'
      }
    }
  },
  plugins: []
} satisfies Config;
