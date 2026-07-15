import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    // Deliberately NOT `host: true` — the Cloudflare tunnel (cloudflared) connects to
    // localhost directly and makes it publicly reachable, so Vite doesn't need to bind
    // to the LAN at all. Keeping it localhost-only means only ONE "Local:" line prints
    // instead of one "Network:" line per network adapter on the machine.
    //
    // Vite 5 rejects requests whose Host header it doesn't recognize (e.g. the tunnel's
    // domain) unless explicitly allowed. `true` disables the check entirely — fine for a
    // temporary public demo tunnel, not something to leave on for a real deployment.
    allowedHosts: true,
    proxy: {
      // SSE stream — must be listed first and explicitly, with buffering disabled
      '/api/v1/notifications/stream': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        selfHandleResponse: false,
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes) => {
            // Ensure Vite doesn't buffer the streaming response
            proxyRes.headers['cache-control'] = 'no-cache'
            proxyRes.headers['x-accel-buffering'] = 'no'
          })
        },
      },
      // All other API requests
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
