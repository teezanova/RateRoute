"use strict";

const { getCache, setCache, TTL_MS } = require("./cache");
const { scrapeSuperRich } = require("./scrapeSuperRich");
const { scrapeCathay } = require("./scrapeCathay");
const dns = require("dns").promises;

async function internetLooksUp(timeoutMs = 1500) {
  try {
    await Promise.race([
      dns.lookup("example.com"),
      new Promise((_, rej) => setTimeout(() => rej(new Error("dns_timeout")), timeoutMs)),
    ]);
    return true;
  } catch (_) {
    return false;
  }
}
function nowText() {
  return new Date().toLocaleString();
}

function redactErrorsForUser(adminErrors) {
  // If any upstream/network problem exists, show a single friendly message.
  const joined = adminErrors.join(" ").toLowerCase();

  const isNetwork =
    joined.includes("err_internet_disconnected") ||
    joined.includes("net::") ||
    joined.includes("timeout") ||
    joined.includes("dns") ||
    joined.includes("econn") ||
    joined.includes("socket") ||
    joined.includes("navigation") ||
    joined.includes("page.goto");

  if (isNetwork) return ["Unable to fetch rates right now. Please try again."];

  // Otherwise generic
  return ["Unable to fetch rates right now. Please try again."];
}

async function getRates({ force = false } = {}) {
  if (!force) {
    const cached = getCache();
    if (cached) {
      cached.meta = cached.meta || {};
      cached.meta.cached = true;
      return cached;
    }
  }
const internetOk = await internetLooksUp();

  const adminErrors = [];
  let sr = null;
  let ct = null;

  try {
    sr = await scrapeSuperRich();
  } catch (e) {
    adminErrors.push(`SuperRich fetch failed: ${e?.message || String(e)}`);
  }

  try {
    ct = await scrapeCathay();
  } catch (e) {
    adminErrors.push(`Cathay fetch failed: ${e?.message || String(e)}`);
  }

  const superRich = sr?.rates || {};
  const cathay = ct?.rates || {};

  // Validate only if that source fetch succeeded.
  // This avoids “too many errors” when Wi-Fi is off.
  if (sr?.ok) {
    for (const c of ["USD", "EUR", "JPY", "TWD"]) {
      const buy = superRich?.[c]?.buy;
      const sell = superRich?.[c]?.sell;
      if (!Number.isFinite(buy) || !Number.isFinite(sell) || buy <= 0 || sell <= 0) {
        adminErrors.push(`SuperRich missing/invalid ${c} buy/sell.`);
      }
    }
  }

  if (ct?.ok) {
    for (const c of ["USD", "EUR", "JPY"]) {
      const sell = cathay?.[c]?.sellAdjusted ?? cathay?.[c]?.sell;
      if (!Number.isFinite(sell) || sell <= 0) {
        adminErrors.push(`Cathay missing/invalid ${c} sell.`);
      }
    }
  }

  const ok = adminErrors.length === 0;
  const userErrors = ok ? [] : redactErrorsForUser(adminErrors);

  const payload = {
    ok,
    // For user/UI
    errors: userErrors,

    // For admin/debug only (do not show in UI)
    adminErrors,

    superRich,
    cathay,

    meta: {
      internetOk,
      cached: false,
      cacheTtlMs: TTL_MS,
      serverTimestamp: Date.now(),
      serverTimeText: nowText(),
      sources: {
        superRich: {
          fetchedAt: sr?.fetchedAt ?? null,
          fetchedText: sr?.fetchedAt ? new Date(sr.fetchedAt).toLocaleString() : null,
          ok: !!sr?.ok,
        },
        cathay: {
          fetchedAt: ct?.fetchedAt ?? null,
          fetchedText: ct?.fetchedAt ? new Date(ct.fetchedAt).toLocaleString() : null,
          ok: !!ct?.ok,
        },
      },
    },
  };

  setCache(payload);
  return payload;
}

module.exports = { getRates };
