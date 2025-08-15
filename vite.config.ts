import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      server: {
        host: true,
        port: 5173,
      },
      build: {
        target: 'esnext',
        rollupOptions: {
          external: ['openai', '@google/generative-ai'],
          output: {
            manualChunks: undefined,
          },
        },
      },
      esbuild: {
        target: 'esnext'
      }
    };
});
