import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

/**
 * Vite configuration for Electron installer UI
 *
 * This config is separate from the main Next.js app to avoid conflicts.
 * It bundles React components AND Tailwind CSS for offline support.
 */
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2020',
    outDir: path.resolve(__dirname, 'dist/installer'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'src/installer/index.tsx'),
        styles: path.resolve(__dirname, 'src/installer/styles/tailwind-input.css'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          return chunkInfo.name === 'main' ? 'wizard-react.js' : '[name].js';
        },
        assetFileNames: 'wizard-styles.css',
      },
    },
  },
  css: {
    postcss: {
      plugins: [
        require('tailwindcss')({
          config: path.resolve(__dirname, '../tailwind.installer.config.js'),
        }),
        require('autoprefixer'),
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../src'),
    },
  },
});
