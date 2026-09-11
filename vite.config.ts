import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

function resolveSiteUrl(env: Record<string, string>): string {
  const explicit = env.VITE_SITE_URL?.replace(/\/$/, '')
  if (explicit) return explicit
  if (env.VERCEL_ENV === 'production' && env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${env.VERCEL_PROJECT_PRODUCTION_URL.replace(/\/$/, '')}`
  }
  if (env.VERCEL_URL) {
    return `https://${env.VERCEL_URL.replace(/\/$/, '')}`
  }
  return ''
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const siteUrl = resolveSiteUrl(env)

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'inject-site-url',
        transformIndexHtml(html) {
          return html.replaceAll('%VITE_SITE_URL%', siteUrl)
        },
      },
    ],
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
      },
    },
  }
})
