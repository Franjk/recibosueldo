import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

const siteUrl = process.env.SITE_URL || (
  process.env.DEPLOY_TARGET === 'github-pages'
    ? 'https://franjk.github.io/recibosueldo/'
    : undefined
)

export default defineConfig({
  base: process.env.DEPLOY_TARGET === 'github-pages' ? '/recibosueldo/' : '/',
  plugins: [
    react(),
    {
      name: 'site-seo',
      transformIndexHtml(html) {
        if (!siteUrl) return html.replace('<!-- seo:url -->', '')
        const url = new URL(siteUrl)
        if (url.protocol !== 'https:') throw new Error('SITE_URL debe usar HTTPS')
        return html.replace('<!-- seo:url -->', [
          `<link rel="canonical" href="${url.href}" />`,
          `<meta property="og:url" content="${url.href}" />`,
        ].join('\n    '))
      },
      generateBundle() {
        if (!siteUrl) return
        const url = new URL(siteUrl)
        this.emitFile({
          type: 'asset',
          fileName: 'sitemap.xml',
          source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${url.href.replaceAll('&', '&amp;')}</loc></url>\n</urlset>\n`,
        })
      },
    },
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
