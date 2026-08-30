import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// Testing on a phone needs HTTPS, not just --host. Browsers expose
// navigator.mediaDevices only on a secure origin, and localhost is the sole
// exemption — so over plain http://<lan-ip> the Record button cannot work at
// all. `npm run dev:mobile` sets MOBILE=1 to serve a self-signed certificate.
const mobile = process.env.MOBILE === '1'

// Relative base so the built site works from any static host, including
// project-scoped paths such as https://user.github.io/speakbetter/
export default defineConfig({
  base: './',
  plugins: [react(), ...(mobile ? [basicSsl()] : [])],
  server: mobile ? { host: true, port: 5173, strictPort: true } : undefined,
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
})
