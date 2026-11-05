import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";

const isDev = process.env.NODE_ENV !== 'production';

// https://vite.dev/config/
export default defineConfig({
  server: {
    host: '0.0.0.0', // 监听地址
    allowedHosts: ['caa6a25.r21.cpolar.top'],
    port: 5173,        // 开发服务器端口
  },
  preview: {
    host: '0.0.0.0',
    allowedHosts: ['caa6a25.r21.cpolar.top'],
    port: 5173,
  },
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'charts-vendor': ['recharts'],
        },
      },
    },
  },
  plugins: [
    react({
      babel: isDev ? {
        plugins: ['react-dev-locator'],
      } : {},
    }),
    tsconfigPaths()
  ],
})
