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
      // Client assets build into dist/client, NOT dist/, because app.ts serves the
      // static root with express.static and the esbuild server bundle is emitted to
      // dist/server.cjs. With both in one directory, dist/server.cjs and (worse)
      // dist/server.cjs.map were publicly fetchable — the sourcemap embeds
      // sourcesContent, i.e. the full original TypeScript of app.ts. Nesting the
      // client output makes the static root contain client files and nothing else,
      // so server artefacts can't be exposed by forgetting to exclude them.
      outDir: 'dist/client',
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
