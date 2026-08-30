# Deploying SpeakBetter to a public domain

SpeakBetter is a static site — HTML, CSS, and JavaScript, with no server, no
database, and no API keys. That makes deployment genuinely simple and free at
this scale: you are uploading files.

This guide covers buying a domain, picking a host, wiring up DNS, and checking
the result.

**Time:** about 30 minutes, plus DNS propagation.
**Cost:** roughly $10–15/year for the domain. Hosting is free.

---

## Contents

1. [Before you start](#1-before-you-start)
2. [Buy the domain](#2-buy-the-domain)
3. [Set your site URL](#3-set-your-site-url)
4. [Pick a host](#4-pick-a-host)
5. [Deploy](#5-deploy) — [Netlify](#netlify-recommended) · [Vercel](#vercel) · [Cloudflare Pages](#cloudflare-pages) · [GitHub Pages](#github-pages)
6. [Connect the domain](#6-connect-the-domain)
7. [Verify the deployment](#7-verify-the-deployment)
8. [Updating the site](#8-updating-the-site)
9. [Troubleshooting](#9-troubleshooting)
10. [What is in the repo and why](#10-what-is-in-the-repo-and-why)

---

## 1. Before you start

Confirm the build works locally:

```bash
npm ci
npm run check      # tests, then a full production build
```

You should see 86 tests pass, then a build that ends with `postbuild: done`.

### One thing to know up front

**HTTPS is not optional.** Browsers only grant microphone access on a secure
origin, so on plain `http://` the Record button will fail every time. Every
host below issues a free certificate automatically — just don't disable it, and
don't serve the site from a bare IP address.

---

## 2. Buy the domain

Any registrar works. Reasonable choices, cheapest first:

| Registrar | Notes |
| --- | --- |
| **Cloudflare Registrar** | Sells at wholesale cost, no markup, free WHOIS privacy. Requires moving DNS to Cloudflare. |
| **Namecheap** | Cheap first year, free WHOIS privacy. |
| **Porkbun** | Competitive pricing, free WHOIS privacy. |
| **Google Domains / Squarespace** | Simple, slightly pricier. |

Watch the **renewal** price, not the first-year promo — some registrars sell
year one at $1 and renew at $40.

### On the name

`speakbetter.com` is a short, generic two-word `.com`, so it is very likely
already registered — possibly parked by a reseller asking four or five figures.
Check before planning around it. If it's taken, good alternatives:

- `tryspeakbetter.com` — your own suggestion, and the "try" prefix is a
  well-established pattern for app domains
- `speakbetter.app` — `.app` is on the HSTS preload list, so it is
  **HTTPS-only by default**, which suits a microphone app
- `speakbetterapp.com`, `getspeakbetter.com`, `speakbetter.io`

For a college application, a `.app` or `.io` reads as perfectly credible.

---

## 3. Set your site URL

Edit [`.env`](.env) in the repo root:

```bash
VITE_SITE_URL=https://tryspeakbetter.com
DEPLOY_DOMAIN=
```

- `VITE_SITE_URL` — no trailing slash. Baked into the canonical link and the
  Open Graph tags at build time, so link previews and search results point at
  the right place.
- `DEPLOY_DOMAIN` — **only for GitHub Pages.** Leave empty for other hosts.

This file is committed deliberately. It contains a public URL, not a secret.

> The build **fails** if the `%VITE_SITE_URL%` placeholders don't get
> substituted, rather than shipping broken metadata quietly.

---

## 4. Pick a host

All four are free for this project and give you HTTPS automatically.

| Host | Best for | Custom domain | Header support |
| --- | --- | --- | --- |
| **Netlify** | Simplest path, drag-and-drop option | Free | `netlify.toml` ✅ |
| **Vercel** | Best build performance | Free | `vercel.json` ✅ |
| **Cloudflare Pages** | Best if your domain is already at Cloudflare | Free | `public/_headers` ✅ |
| **GitHub Pages** | Keeping everything on GitHub | Free | ❌ none |

**Recommendation: Netlify or Cloudflare Pages.**

The security-header column matters more than it looks. GitHub Pages cannot send
custom headers at all, so the Content-Security-Policy and `Permissions-Policy`
in this repo are simply ignored there. The site still *works* — but you lose
the hardening, and it's worth knowing you're giving that up rather than
discovering it later.

---

## 5. Deploy

### Netlify (recommended)

**Option A — connect the repository (recommended, gives auto-deploy):**

1. Push this repo to GitHub.
2. Go to [app.netlify.com](https://app.netlify.com) → **Add new site** →
   **Import an existing project** → pick your repo.
3. Netlify reads [`netlify.toml`](netlify.toml) and fills these in for you.
   Confirm they say:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. **Deploy site.**

**Option B — drag and drop (fastest, no Git):**

```bash
npm run build
```

Drag the `dist` folder onto the Netlify dashboard. Note that this skips
`netlify.toml`, so you lose the security headers — fine for a quick test, not
for the real thing.

---

### Vercel

1. Push to GitHub.
2. [vercel.com/new](https://vercel.com/new) → import the repo.
3. Vercel detects Vite and reads [`vercel.json`](vercel.json). Confirm:
   - Framework preset: **Vite**
   - Build command: `npm run build`
   - Output directory: `dist`
4. **Deploy.**

---

### Cloudflare Pages

Best choice if you bought the domain through Cloudflare — DNS is then
configured for you with one click.

1. Push to GitHub.
2. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** →
   **Connect to Git**.
3. Settings:
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Node version: add an environment variable `NODE_VERSION` = `20`
4. **Save and Deploy.**

Headers come from [`public/_headers`](public/_headers), which is copied into
`dist/` during the build.

---

### GitHub Pages

Works, but sends no security headers. Use only if you want everything on
GitHub.

1. Set `DEPLOY_DOMAIN=yourdomain.com` in `.env` so the build writes the
   required `CNAME` file.
2. Repo → **Settings** → **Pages** → Source: **GitHub Actions**.
3. Repo → **Settings** → **Secrets and variables** → **Actions** →
   **Variables** tab → add:
   - `VITE_SITE_URL` = `https://yourdomain.com`
   - `DEPLOY_DOMAIN` = `yourdomain.com`
4. Push to `main`. The workflow in
   [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) runs the
   tests, builds, and publishes. It will **not** deploy if the tests fail.

---

## 6. Connect the domain

### Step 1 — add the domain in your host

| Host | Where |
| --- | --- |
| Netlify | Site → **Domain management** → **Add a domain** |
| Vercel | Project → **Settings** → **Domains** |
| Cloudflare Pages | Project → **Custom domains** |
| GitHub Pages | Repo → **Settings** → **Pages** → **Custom domain** |

### Step 2 — add the DNS records at your registrar

The host will show you exactly what to add. Copy the values **from your own
dashboard** — Netlify and Vercel assign different targets per site, so a value
copied from a tutorial will point somewhere wrong.

The general shape:

| Record | Name | Points to |
| --- | --- | --- |
| `A` or `ALIAS` | `@` (root) | The IP or hostname your dashboard shows |
| `CNAME` | `www` | Your host's target, e.g. `yoursite.netlify.app` |

**GitHub Pages** is the exception — its addresses are fixed and published:

```
A     @    185.199.108.153
A     @    185.199.109.153
A     @    185.199.110.153
A     @    185.199.111.153
CNAME www  <your-github-username>.github.io
```

Verify these against
[GitHub's current documentation](https://docs.github.com/pages/configuring-a-custom-domain-for-your-github-pages-site)
before relying on them; they have changed before.

### Step 3 — wait, then enable HTTPS

DNS usually propagates in 5–30 minutes, occasionally up to 48 hours. Check with:

```bash
nslookup tryspeakbetter.com
```

Once it resolves, your host issues a Let's Encrypt certificate automatically —
usually within minutes. On GitHub Pages you must tick **Enforce HTTPS**
manually once it becomes available.

Also set up the redirect so both spellings work: pick either the apex
(`tryspeakbetter.com`) or `www` as primary, and have the host redirect the
other to it. All four do this in the domain settings.

---

## 7. Verify the deployment

Work through this once the domain resolves.

### Essential

- [ ] `https://yourdomain.com` loads and shows the home page
- [ ] The padlock appears — **no** certificate warning
- [ ] `http://yourdomain.com` redirects to `https://`
- [ ] `www.yourdomain.com` and the bare domain both work
- [ ] **Click Record and allow the microphone.** This is the one that actually
      matters and the one a local test can't prove.
- [ ] Record a sentence and confirm you get a score
- [ ] Play back your own recording in the **Compare** block
- [ ] Switch to Intermediate and confirm a full paragraph transcribes — not
      just the first sentence
- [ ] Reload and confirm your progress is still there
- [ ] Open DevTools → Console: no errors

### Metadata

- [ ] The browser tab shows the microphone icon
- [ ] `https://yourdomain.com/robots.txt` and `/sitemap.xml` load and show
      your real domain
- [ ] View source: `<link rel="canonical">` shows your domain, not
      `speakbetter.com`
- [ ] Paste the URL into Slack, iMessage, or WhatsApp — the preview card should
      show the SpeakBetter banner

Social preview debuggers:
[Facebook](https://developers.facebook.com/tools/debug/) ·
[Twitter/X](https://cards-dev.twitter.com/validator) ·
[LinkedIn](https://www.linkedin.com/post-inspector/)

### Headers (skip on GitHub Pages)

```bash
curl -sI https://yourdomain.com | grep -i "content-security\|permissions\|strict-transport"
```

`Permissions-Policy` must contain `microphone=(self)`. If it says
`microphone=()`, recording is blocked site-wide.

---

## 8. Updating the site

With a Git-connected host (Netlify, Vercel, Cloudflare, or the GitHub Actions
workflow), just push:

```bash
git add -A
git commit -m "Update practice content"
git push
```

The site rebuilds and redeploys in about a minute. Run `npm run check` first —
the GitHub Actions workflow blocks a deploy on failing tests, but the other
hosts will happily publish a broken build.

---

## 9. Troubleshooting

### The Record button does nothing, or permission is denied instantly

Almost always one of:

1. **The site is on `http://`.** Microphone access requires HTTPS.
2. **You blocked the microphone earlier.** Click the padlock in the address
   bar → Site settings → reset the microphone permission.
3. **`Permissions-Policy` is wrong.** Check the header contains
   `microphone=(self)`.
4. **You're in Firefox.** Recording works; *recognition* doesn't — Firefox has
   not implemented the Web Speech API. The app detects this and says so.

### Only the first sentence of a paragraph is recognized

The recognizer stopped at the first pause. This should not happen — continuous
mode turns on automatically above twelve words — but if you see it, confirm you
are on the current build, since older builds had `continuous` hard-coded off.

### The page is blank, and the console shows CSP errors

You edited the CSP. Two rules this app needs:

- `style-src` must include `'unsafe-inline'` — the recording indicator and the
  progress bar are sized with React inline style attributes.
- `media-src` must include `blob:` — that is how your own recording is played
  back.

### Link previews show the wrong domain

`VITE_SITE_URL` was wrong at build time. Fix `.env` (or the host's environment
variable), redeploy, then re-scrape with the debuggers linked above — the
social platforms cache aggressively.

### The site shows an old version after deploying

Hard-reload with `Ctrl+Shift+R`. Asset filenames are content-hashed and
`index.html` is set to `must-revalidate`, so this should be rare. On Cloudflare,
also purge the cache.

### "Not secure" warning after connecting the domain

Certificate issuance is still pending. Wait 15 minutes. If it persists, the DNS
records are usually wrong — the host cannot validate a domain that doesn't
point at it yet.

---

## 10. What is in the repo and why

| File | Purpose |
| --- | --- |
| [`.env`](.env) | Your public site URL. **Edit this first.** |
| [`netlify.toml`](netlify.toml) | Netlify build config, security headers, caching |
| [`vercel.json`](vercel.json) | The same, for Vercel |
| [`public/_headers`](public/_headers) | The same, for Cloudflare Pages |
| [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) | Test, build, deploy to GitHub Pages |
| [`scripts/postbuild.mjs`](scripts/postbuild.mjs) | Writes `sitemap.xml`, the robots `Sitemap:` line, and `CNAME` |
| [`public/robots.txt`](public/robots.txt) | Allows crawling |
| [`public/site.webmanifest`](public/site.webmanifest) | Installable-app metadata |
| [`public/og-image.png`](public/og-image.png) | 1200×630 social preview card |
| [`public/favicon.svg`](public/favicon.svg), `apple-touch-icon.png` | Icons |
| [`.nvmrc`](.nvmrc) | Pins Node 20 for CI and hosts |

### Caching

Files under `/assets/` carry content-hashed names and are cached for a year as
`immutable`. `index.html` is `must-revalidate`, so a new deploy is picked up on
the next visit rather than being served stale.

### Security headers

Set on all hosts except GitHub Pages: a Content-Security-Policy limiting
everything to same-origin, `X-Frame-Options: DENY`, `nosniff`, HSTS, and a
`Permissions-Policy` that allows the microphone and denies camera, geolocation,
payment, and USB.

The CSP was verified against the real production build served with these exact
headers — the app mounts, styles apply, and no violations are reported.

---

## A note on what you're deploying

There is no backend, so there is nothing to keep running, nothing to pay for
per-request, and no key that can leak. A visitor's recordings are never
uploaded by this app.

One caveat worth stating honestly on the site if you add an about page:
Chrome's speech recognition sends audio to Google's servers to transcribe it.
That is the browser's behaviour rather than the application's, but "runs in your
browser" is not the same as "audio never leaves your device."
