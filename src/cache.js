"use strict";

const TTL_MS = 5 * 60 * 1000;

let _cache = null;     // last successful payload
let _cacheAt = 0;      // ms epoch when _cache was set

function setCache(payload) {
  if (!payload || payload.ok !== true) return;
  _cache = payload;
  _cacheAt = Date.now();
}

// Returns the latest cached snapshot if any (even if stale).
// Caller decides whether to use it based on `fresh`.
function getCache() {
  if (!_cache) return null;
  const ageMs = Date.now() - _cacheAt;
  return {
    payload: _cache,
    cachedAt: _cacheAt,
    ageMs,
    fresh: ageMs <= TTL_MS,
  };
}

module.exports = { TTL_MS, getCache, setCache };
