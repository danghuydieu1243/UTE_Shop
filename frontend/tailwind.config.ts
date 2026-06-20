import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: '#16161A', 2: '#6B6B73', 3: '#A8A8AE' },
        paper: '#FBFAF8',
        surface: '#FFFFFF',
        line: '#ECEAE5',
        'cover-bg': '#F4F2ED',
        accent: '#B8893B',
        star: '#C9A24B',
        'success-bg': '#ECF6EE', 'success-fg': '#2E7D4F',
        'warning-bg': '#FBF3E4', 'warning-fg': '#9A6B16',
        'danger-bg': '#FBECEC', 'danger-fg': '#B43A3A',
        'info-bg': '#EDF1F6', 'info-fg': '#3A5680',
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      borderRadius: { DEFAULT: '2px', sm: '2px', md: '2px', modal: '4px' },
      maxWidth: { container: '1180px' },
      borderColor: { DEFAULT: '#ECEAE5' },
    },
  },
  plugins: [],
} satisfies Config;
