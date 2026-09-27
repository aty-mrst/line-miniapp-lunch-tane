import type { Config } from 'tailwindcss';

// README「Design Tokens」をそのまま登録
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        tomato: { DEFAULT: '#D9481F', ink: '#A8360F', soft: '#FFE8DC', 'soft-border': '#F4C3AE', light: '#F0A58A', lighter: '#F7D3C4' },
        mustard: { DEFAULT: '#E8A710', soft: '#FFF3D1', ink: '#7A5500', 'ink-2': '#5C4000', bg: '#FFFBEF' },
        sprout: { DEFAULT: '#2F8F4E', ink: '#22703C', soft: '#E2F3E6', border: '#9FD3AE', bg: '#F4FBF5' },
        ink: { DEFAULT: '#2A211B', 2: '#6B5E54', disabled: '#8A7D71' },
        chevron: '#B5A99D',
        bg: '#FFF7EC',
        surface: '#FFFFFF',
        'emoji-bg': '#FFF1E0',
        line: { DEFAULT: '#EFE4D6', strong: '#E3D6C6' },
        'row-divider': '#F4ECE2',
        disabled: { DEFAULT: '#EDE6DD', soft: '#F4EEE7' },
        'neutral-tag': '#F1EBE3',
        skeleton: '#F1E7DB',
        danger: { DEFAULT: '#C8302B', soft: '#FDE8E6', border: '#F2C4C1' },
      },
      fontFamily: {
        maru: ["'Zen Maru Gothic'", 'sans-serif'],
        sans: ["'Noto Sans JP'", "'Hiragino Sans'", 'system-ui', 'sans-serif'],
      },
      borderRadius: { tag: '4px', input: '12px', toast: '14px', card: '16px', dialog: '20px' },
      boxShadow: { toast: '0 8px 24px rgba(42,33,27,.25)' },
    },
  },
  plugins: [],
};
export default config;
