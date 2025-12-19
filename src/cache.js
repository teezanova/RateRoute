"use strict";

const TTL_MS = 5 * 60 * 1000;

let _cache = null;
let _cacheAt = 0;

function getCache() {
  if (!_cache) return null;
  if (_cache.ok !== true) return null; // don't serve cached failures
  if (Date.now() - _cacheAt > TTL_MS) return null;
  return _cache;
}

function setCache(payload) {
  if (!payload || payload.ok !== true) return; // cache success only
  _cache = payload;
  _cacheAt = Date.now();
}

module.exports = { TTL_MS, getCache, setCache };
