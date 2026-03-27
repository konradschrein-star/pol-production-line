/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './electron/src/installer/**/*.{tsx,ts,jsx,js}',
    './src/installer/**/*.{tsx,ts,jsx,js}', // Phase 2 components
  ],
  theme: {
    extend: {
      colors: {
        // Match main app design system
        surface: '#1a1a1a',
        surface_container_lowest: '#0f0f0f',
        surface_container_low: '#1e1e1e',
        surface_container: '#252525',
        surface_container_high: '#2f2f2f',
        surface_bright: '#3d3d3d',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['Roboto Mono', 'Courier New', 'monospace'],
      },
    },
  },
  plugins: [],
};
