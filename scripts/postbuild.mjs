/**
 * Post-build step.
 *
 * Writes the few files that need to know the deployed domain, which the
 * static files in public/ cannot: the sitemap, the Sitemap line in robots.txt,
 * and the CNAME file GitHub Pages uses to claim a custom domain.
 *
 * Run automatically by `npm run build`.
 */

import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { loadEnv } from 'vite'

const DIST = 'dist'
const MODE = process.env.NODE_ENV === 'development' ? 'development' : 'production'

// Load .env the same way Vite does, then let real environment variables win,
// so a CI provider can override without editing the file.
const fileEnv = loadEnv(MODE, process.cwd(), '')
const env = { ...fileEnv, ...process.env }

const siteUrl = (env.VITE_SITE_URL ?? '').trim().replace(/\/+$/, '')
const deployDomain = (env.DEPLOY_DOMAIN ?? '').trim()

if (!existsSync(DIST)) {
  console.error(`postbuild: ${DIST}/ not found — run the build first.`)
  process.exit(1)
}

if (!siteUrl) {
  console.warn(
    'postbuild: VITE_SITE_URL is not set. Skipping sitemap and robots. ' +
      'Set it in .env before deploying, or canonical and Open Graph URLs will be wrong.',
  )
} else if (!/^https:\/\//.test(siteUrl)) {
  // Microphone access requires a secure origin, so an http:// site cannot work.
  console.warn(`postbuild: VITE_SITE_URL is "${siteUrl}" — it must start with https://`)
}

if (siteUrl) {
  // --- sitemap.xml ---------------------------------------------------------
  // One page. Routing is hash-based, and search engines ignore the fragment,
  // so listing #/practice separately would be pointless.
  const today = new Date().toISOString().slice(0, 10)
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${siteUrl}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`
  writeFileSync(join(DIST, 'sitemap.xml'), sitemap)
  console.log(`postbuild: wrote ${DIST}/sitemap.xml`)

  // --- robots.txt ----------------------------------------------------------
  const robotsPath = join(DIST, 'robots.txt')
  if (existsSync(robotsPath)) {
    appendFileSync(robotsPath, `\nSitemap: ${siteUrl}/sitemap.xml\n`)
    console.log('postbuild: appended Sitemap line to robots.txt')
  }

  // --- sanity check on the built HTML --------------------------------------
  // If the %VITE_SITE_URL% placeholders did not get substituted, the canonical
  // and Open Graph tags ship broken. Fail loudly rather than deploy that.
  const html = readFileSync(join(DIST, 'index.html'), 'utf8')
  if (html.includes('%VITE_SITE_URL%')) {
    console.error('postbuild: index.html still contains %VITE_SITE_URL% placeholders.')
    process.exit(1)
  }
}

// --- CNAME -----------------------------------------------------------------
if (deployDomain) {
  writeFileSync(join(DIST, 'CNAME'), `${deployDomain}\n`)
  console.log(`postbuild: wrote ${DIST}/CNAME for ${deployDomain}`)
}

console.log('postbuild: done')
