import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'surface-dim': '#131313',
        'surface': '#1a1a1a',
        'surface-bright': '#3d3d3d',
        'surface-container-lowest': '#0f0f0f',
        'surface-container-low': '#1e1e1e',
        'surface-container': '#252525',
        'surface-container-high': '#2f2f2f',
        'surface-container-highest': '#3a3a3a',
        'on-surface': '#eeeeee',
        'on-surface-variant': '#d0d0d0',
        'primary': '#ffffff',
        'on-primary': '#1a1c1c',
        'primary-container': '#d4d4d4',
        'secondary': '#c6c6c7',
        'outline': '#919191',
        'outline-variant': '#3f3f3f',
        'error': '#ffb4ab',
      },
      fontFamily: {
        headline: ['Inter', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        label: ['Inter', 'sans-serif'],
        mono: ['Roboto Mono', 'monospace'],
      },
      fontSize: {
        'label-sm': '0.6875rem',
      },
      borderRadius: {
        'sm': '0.375rem',   // 6px
        DEFAULT: '0.5rem',   // 8px
        'md': '0.5rem',      // 8px
        'lg': '0.75rem',     // 12px
        'xl': '1rem',        // 16px
        '2xl': '1.5rem',     // 24px
        'full': '9999px',
      },
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.15)',
        DEFAULT: '0 1px 3px 0 rgba(0, 0, 0, 0.2)',
        'md': '0 2px 8px 0 rgba(0, 0, 0, 0.25)',
        'lg': '0 4px 16px 0 rgba(0, 0, 0, 0.3)',
        'xl': '0 8px 24px 0 rgba(0, 0, 0, 0.4)',
        'inner': 'inset 0 1px 2px 0 rgba(0, 0, 0, 0.2)',
      },
      keyframes: {
        scroll: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-33.333%)' },
        },
      },
      animation: {
        scroll: 'scroll 30s linear infinite',
      },
    },
  },
  plugins: [],
}
export default config
