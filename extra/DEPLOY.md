# Continuum — Deployment Guide

This is a Vite + React SPA. The repository is configured to deploy out-of-the-box on **Vercel**, **Netlify**, **Cloudflare Pages**, or any static host that supports SPA fallback.

> The `backend/` folder is a separate Spring Boot service. This guide covers only the frontend bundle.

---

## 1. Build

```bash
bun install        # or: npm install
bun run build      # outputs to ./dist
```

Local preview:

```bash
bun run preview
```

---

## 2. Required environment variable

Create `.env` (or set in your host's dashboard):

```
VITE_API_URL=https://your-backend.example.com
```

`VITE_API_URL` is the public base URL of the Continuum backend. If unset, the app falls back to `/api` (same-origin).

---

## 3. Vercel

The repo includes `vercel.json` with SPA rewrites already configured.

1. Import the repo on Vercel.
2. Framework preset: **Vite** (auto-detected).
3. Build command: `bun run build` (or `npm run build`).
4. Output directory: `dist`.
5. Add the env var `VITE_API_URL` in *Project → Settings → Environment Variables*.
6. Deploy.

---

## 4. Netlify

The repo includes `netlify.toml` and `public/_redirects` (SPA fallback).

1. Connect the repo on Netlify.
2. Build command: `npm run build`.
3. Publish directory: `dist`.
4. Set `VITE_API_URL` in *Site → Settings → Environment Variables*.

---

## 5. Cloudflare Pages / static host

1. Build command: `npm run build`.
2. Output directory: `dist`.
3. Add an SPA rewrite: every unmatched route → `/index.html`.
4. Set `VITE_API_URL` in env.

---

## 6. Docker (optional)

Serve `dist/` with any static server (e.g. `nginx`). Make sure your nginx `try_files` ends with `/index.html` so client-side routes work after refresh.

---

## Files kept for deployment

- `vercel.json` — Vercel SPA rewrites
- `netlify.toml` + `public/_redirects` — Netlify SPA fallback
- `public/manifest.json`, `public/robots.txt`, `public/timer-service-worker.js`

Everything else under `backend/` is independent and not required for the frontend build.
