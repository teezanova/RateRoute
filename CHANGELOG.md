# Changelog

All notable changes to RateRoute will be documented in this file.

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
