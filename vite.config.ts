import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Tauri expects a fixed port and no browser opening; the dev server runs
// behind the Tauri shell via `npm run tauri dev`.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: true, host: false },
  envPrefix: ['VITE_', 'TAURI_'],
  build: {
    target: 'es2020',
    outDir: 'dist',
    // Tauri debug console support.
    sourcemap: process.env.TAURI_ENV_DEBUG ? 'inline' : false,
    minify: !process.env.TAURI_ENV_DEBUG,
  },
});
