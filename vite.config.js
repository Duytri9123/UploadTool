import { defineConfig } from 'vite';
import path from 'path';
import autoprefixer from 'autoprefixer';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  root: 'static/src',
  base: '/static/dist/',
  build: {
    outDir: path.resolve(__dirname, 'static/dist'),
    emptyOutDir: true,
    sourcemap: true,
    // Code splitting for better caching
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'static/src/main.js'),
      },
      output: {
        // Stable asset names for Flask template references
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) {
            return 'assets/[name].css';
          }
          return 'assets/[name]-[hash][extname]';
        },
        // Split vendor chunks for better caching
        manualChunks: {
          vendor: [],
        },
      },
    },
    // Minify for production
    minify: 'esbuild',
    target: 'es2020',
  },
  css: {
    preprocessorOptions: {
      scss: {
        // Let main.scss handle all imports
      },
    },
    postcss: {
      plugins: [autoprefixer()],
    },
    devSourcemap: true,
  },
  server: {
    port: 3000,
    strictPort: false,
    hmr: { overlay: true },
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
