import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          // Split heavy third-party libs into their own long-cached chunks so
          // the main app bundle is smaller and these rarely-changing vendors
          // stay cached across app deploys.
          // Split heavy third-party libs into their own long-cached chunks so the
          // main app bundle is smaller and these rarely-changing vendors stay
          // cached across app deploys.
          manualChunks: {
            react: ['react', 'react-dom'],
            motion: ['motion'],
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
