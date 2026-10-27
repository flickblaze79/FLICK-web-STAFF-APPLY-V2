import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(() => {
  return {
    base: '/FLICK-web-STAFF-APPLY-V2/',
    plugins: [
      react(),
      tailwindcss(),
      // Generate 404.html from index.html for GitHub Pages single-page app support
      {
        name: 'spa-404-fallback',
        closeBundle() {
          const indexPath = path.resolve(__dirname, 'dist/index.html');
          const notFoundPath = path.resolve(__dirname, 'dist/404.html');
          if (fs.existsSync(indexPath)) {
            fs.copyFileSync(indexPath, notFoundPath);
          }
        },
      },
      // In dev mode, redirect or rewrite root path / to the base path so preview URLs work seamlessly
      {
        name: 'root-redirect-dev',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (req.url === '/' || req.url === '/index.html') {
              res.writeHead(302, { Location: '/FLICK-web-STAFF-APPLY-V2/' });
              res.end();
              return;
            }
            next();
          });
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
