# Changelog

All notable changes to RateRoute will be documented in this file.

## v1.03 — 2026-05-02

### UX/UI improvements

- **Instant recalculation**: Changing the TWD amount now recalculates all routes immediately without a network fetch. Rates are fetched once and reused locally.
- **No more alert popups**: Error messages now appear only in the inline error pill — no blocking `alert()` dialog.
- **Stale-data loading**: While a refresh is in progress, existing route cards stay visible but dimmed instead of being wiped to blank.
- **Theme button label**: Button now shows the action ("Light" / "Dark") rather than the current state, matching standard UX convention.
- **Intermediate currency amount**: Each currency route card now shows a second KPI — the amount of USD / EUR / JPY the TWD converts to before reaching THB (e.g., "Amount in USD: 312.45 USD").
- **Delta vs best**: Non-best route cards show how much less THB they yield (e.g., "−45.20 THB vs best").
- **Rank badges**: Route cards show `#2`, `#3`, `#4` instead of the generic "Route" label; the winner shows "Best" with a green tint.
- **Enter key**: Pressing Enter inside the amount field triggers a fresh rate fetch.
- **Live source age**: Source card timestamps ("Fetched 3m ago") refresh every 30 s so they stay accurate after the page loads.
- **Favicon**: Added SVG favicon matching the app logo.
- **Footer**: Clarified Cathay rate adjustment note to "Cathay sell rates adjusted for EVA Air cardholder discount."

## v1.02 — 2026-05-02

### Infrastructure: Cloudflare Tunnel + URL Update

- **Cloudflare Tunnel**: Integrated `cloudflared` into `docker-compose.yml` for secure external access without port forwarding.
- **External URL**: Updated primary external access point to `https://rates.tee-station.com`.
- **Local Access**: Added to local Caddy reverse proxy at `http://rateroute.home`.

## v1.01 — 2026-05-02

### Infrastructure: Docker + local reverse proxy

- **Dockerized**: Added `Dockerfile` using `mcr.microsoft.com/playwright:v1.49.0-noble` as base image. Playwright and Chromium are installed via `npm ci` postinstall during build.
- **Added** `.dockerignore` (excludes `node_modules`, `.git`, `.env`).
- **Reverse proxy**: Added `docker-compose.yml` configured to join the shared `proxy` Docker network (no host port exposed). Caddy routes `http://rateroute.home` → container port 3000.
- **Migrated from Render**: App is now self-hosted on local Docker. Access via `http://rateroute.home`.

## v1.00 — initial

- TWD→THB exchange rate finder.
- Scrapes SuperRich Thailand (buy/sell for USD, EUR, JPY, TWD) and Cathay Bank Taiwan (sell for USD, EUR, JPY) using Playwright/Chromium.
- Server-side cache (5-min TTL, success-only).
- Background refresh every 12 hours on boot.
- Email notification via SMTP when fetch fails and internet is up.
- Hosted on Render.
