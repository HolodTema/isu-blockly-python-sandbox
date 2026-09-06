import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        worker: 'src/worker/pyodideWorker.ts',
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'worker') {
            return 'worker/[name].js';
          }
          return 'assets/[name]-[hash].js';
        },
      },
    },
  },
  server: {
    hmr: {
      overlay: false,
    },
  },
});

