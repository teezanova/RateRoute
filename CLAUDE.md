# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start              # run server locally (port 3000)
docker compose up --build   # build & start via Docker (served on rateroute:3000 via Caddy proxy)
```

No test suite or linter is configured.

## Architecture

The app finds the best TWD→THB conversion route by comparing four paths: TWD→USD→THB, TWD→EUR→THB, TWD→JPY→THB, and TWD→THB direct. It scrapes live rates from two sources, caches them server-side, and exposes them through a single API endpoint consumed by a vanilla JS frontend.

### Data flow

```
GET /api/rates
  └─ getRates()          src/getRates.js
       ├─ getCache()     src/cache.js         — in-memory, 5-min TTL, only caches ok:true
       ├─ scrapeSuperRich()  src/scrapeSuperRich.js  — buy/sell for USD, EUR, JPY, TWD (in THB)
       └─ scrapeCathay()    src/scrapeCathay.js     — sell rate for USD, EUR, JPY (TWD per unit)
```

On boot and every 12 hours, `server.js` calls `getRates({ force: true })` in the background.

### Scrapers

Both scrapers launch a headless Chromium browser via Playwright with `--no-sandbox` flags (required in Docker). They share the same pattern: navigate → wait for render → extract text → parse numbers → close browser.

**SuperRich** (`scrapeSuperRich.js`): Queries the live exchange-rate page. For each currency code it collects up to 30 visible DOM blocks containing the code and decimal numbers, picks the first pair (second-to-last and last decimals in the block) that passes `plausible()` range checks. Returns `{ buy, sell }` in THB per unit.

**Cathay** (`scrapeCathay.js`): Dumps `document.body.innerText`, then for each currency searches for the 數位通路優惠匯率 row first, falling back to 即期匯率. Extracts the second number (sell). Applies a per-currency adjustment (`ADJ`) to produce `sellAdjusted`. Returns only the sell side.

### Conversion logic (frontend)

`public/app.js` computes THB output for each route:
- **Via currency**: `(twdAmount / cathaySell) * superRichBuy`
- **Direct**: `twdAmount * superRichBuyTWD`

Best route = highest THB output; ties broken by priority order `DIRECT > USD > EUR > JPY`.

### API shape

`GET /api/rates` returns:
```json
{
  "ok": true,
  "errors": [],
  "adminErrors": [],
  "superRich": { "USD": { "buy": 33.5, "sell": 34.0 }, ... },
  "cathay":    { "USD": { "sellRaw": 30.5, "sellAdjusted": 30.495, ... }, ... },
  "meta": { "cached": true, "cacheTtlMs": 300000, "internetOk": true, "sources": { ... } }
}
```

`adminErrors` is never shown in the UI — only `errors` (redacted for users). The cache only stores `ok:true` payloads; failed fetches are never cached.

### Email notifications

`POST /api/notify` sends SMTP email (configured via `.env`) when the frontend detects a failed fetch and `meta.internetOk` is true. If SMTP env vars are missing it logs and returns `{ ok: true, sent: false }` — it never blocks the app.
