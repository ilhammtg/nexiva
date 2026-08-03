import path from 'path'
import fs from 'fs'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendTarget = env.VITE_BACKEND_URL || 'http://localhost:8080'

  const certPath = path.resolve(__dirname, './certs/localhost.pem')
  const keyPath = path.resolve(__dirname, './certs/localhost-key.pem')
  const hasCert = fs.existsSync(certPath) && fs.existsSync(keyPath)

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5173,
      host: true, // Listen on all local IP addresses (required for docker port forwarding)
      https: hasCert ? {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath),
      } : undefined,
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: true,
          secure: false,
        },
        '/uploads': {
          target: backendTarget,
          changeOrigin: true,
          secure: false,
        },
        '/ws': {
          target: backendTarget.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:'),
          ws: true,
          secure: false,
        },
      },
    },
  }
})
