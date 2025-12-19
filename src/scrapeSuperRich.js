"use strict";

const { chromium } = require("playwright");

const URL = "https://www.superrichthailand.com/#!/en/exchange/";
const CODES = ["USD", "EUR", "JPY", "TWD"];

function toNum(x) {
  const n = Number(String(x).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

function extractDecimals(text) {
  return (text.match(/-?\d+\.\d+/g) || [])
    .map(toNum)
    .filter((v) => Number.isFinite(v));
}

// Plausibility filters (THB terms for SuperRich buy/sell)
// These ranges are wide on purpose, only to reject obvious wrong matches like 0 or 9999.
function plausible(code, buy, sell) {
  if (!Number.isFinite(buy) || !Number.isFinite(sell)) return false;
  if (buy <= 0 || sell <= 0) return false;
  if (sell < buy) return false;

  const ranges = {
    USD: [10, 80],
    EUR: [10, 120],
    JPY: [0.05, 2.0],  // JPY per 1
    TWD: [0.1, 5.0]
  };

  const r = ranges[code];
  if (!r) return true;
  return buy >= r[0] && buy <= r[1] && sell >= r[0] && sell <= r[1];
}

async function scrapeSuperRich() {
  const browser = await chromium.launch({
  headless: true,
  args: [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage"
  ]
});
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36",
    locale: "en-US",
  });
  const page = await context.newPage();

  try {
    await page.goto(URL, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForSelector("body");
    await page.waitForTimeout(3500);

    const out = {};

    for (const code of CODES) {
      // Grab many candidate blocks in DOM order that contain the code and some digits
      const candidates = await page.evaluate((code) => {
        const norm = (s) =>
          String(s || "")
            .replace(/\u00a0/g, " ")
            .replace(/[ \t]+/g, " ")
            .replace(/\r/g, "")
            .trim();

        const els = Array.from(document.querySelectorAll("tr, li, div, section"));
        const picked = [];

        function isVisible(el) {
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.height > 0;
        }

        for (const el of els) {
          if (!isVisible(el)) continue;
          const t = norm(el.innerText || el.textContent);
          if (!t) continue;

          // Must contain code and at least 2 decimals somewhere
          if (!t.includes(code)) continue;
          if (!/\d+\.\d+/.test(t)) continue;

          // Avoid huge containers (whole page)
          if (t.length > 900) continue;

          picked.push(t);
          if (picked.length >= 30) break; // limit
        }

        return picked;
      }, code);

      if (!candidates || candidates.length === 0) {
        throw new Error(`SuperRich cannot find any rate blocks for ${code}.`);
      }

      // Pick first valid candidate by decimals + plausibility
      let chosen = null;
      for (const text of candidates) {
        const dec = extractDecimals(text);
        if (dec.length < 2) continue;
        const buy = dec[dec.length - 2];
        const sell = dec[dec.length - 1];
        if (!plausible(code, buy, sell)) continue;
        chosen = { buy, sell };
        break;
      }

      if (!chosen) {
        // Debug hint: show first few candidates (only if needed)
        // console.log("SR DEBUG", code, candidates.slice(0, 5));
        throw new Error(`SuperRich ${code} buy/sell not readable (no valid row).`);
      }

      out[code] = chosen;
    }

    return { ok: true, fetchedAt: Date.now(), rates: out };
  } finally {
    await page.close().catch(() => {});
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}

module.exports = { scrapeSuperRich };
