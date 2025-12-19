"use strict";

const { chromium } = require("playwright");

const URL =
  "https://www.cathaybk.com.tw/cathaybk/personal/product/deposit/currency-billboard/";

const CODES = ["USD", "EUR", "JPY"];
const ADJ = { USD: 0.005, EUR: 0.02, JPY: 0.0005 };

function toNum(x) {
  if (x == null) return null;
  const m = String(x).replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
}

function normalizeText(t) {
  return String(t || "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\r/g, "")
    .trim();
}

/**
 * Extract sell from a block near a currency code.
 * We search for:
 *   <CCY> ... <LABEL> ... <num> <num>
 * and take the SECOND number as sell (common bank display: buy then sell).
 */
function extractSellForCcy(allText, ccy) {
  const prefer = "數位通路優惠匯率";
  const fallback = "即期匯率";

  const idx = allText.indexOf(ccy);
  console.log("CT DEBUG head:", allText.slice(0, 2000));
  if (idx < 0) return null;

  const windowText = allText.slice(idx, idx + 3500);

  function pick(label) {
    // capture two numbers after label
    const re = new RegExp(label + "[\\s\\S]*?(\\d+\\.\\d+)[\\s]+(\\d+\\.\\d+)", "m");
    const m = windowText.match(re);
    if (!m) return null;
    const buy = toNum(m[1]);
    const sell = toNum(m[2]);
    if (!Number.isFinite(sell)) return null;
    return { sourceRow: label, sellRaw: sell, buyRaw: buy };
  }

  return pick(prefer) || pick(fallback);
}

async function scrapeCathay() {
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
  });
  const page = await context.newPage();

  try {
    await page.goto(URL, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(2000);

    const raw = await page.evaluate(() => document.body.innerText || "");
    const allText = normalizeText(raw);

    const out = {};
    for (const ccy of CODES) {
      const row = extractSellForCcy(allText, ccy);
      if (!row) throw new Error(`Cathay missing ${ccy} row (數位通路優惠匯率/即期匯率).`);

      const adjustment = ADJ[ccy] ?? 0;
      const sellAdjusted = Math.round((row.sellRaw - adjustment) * 10000) / 10000;

      out[ccy] = {
        sourceRow: row.sourceRow,
        sellRaw: row.sellRaw,
        adjustment,
        sellAdjusted,
      };
    }

    return { ok: true, fetchedAt: Date.now(), rates: out };
  } finally {
    await page.close().catch(() => {});
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}

module.exports = { scrapeCathay };
