(() => {
  const el = (id) => document.getElementById(id);

  const amountInput = el("amountInput");
  const refreshBtn = el("refreshBtn");

  const themeBtn = el("themeBtn");
  const themeText = el("themeText");

  const loadingPill = el("loadingPill");
  const errorPill = el("errorPill");
  const updatedPill = el("updatedPill");

  const bestChip = el("bestChip");
  const bestText = el("bestText");

  const routesGrid = el("routesGrid");

  // Source status cards
  const srCard = el("srCard");
  const ctCard = el("ctCard");
  const srMeta = el("srMeta");
  const ctMeta = el("ctMeta");

  // Theme
  const THEME_KEY = "rateroute_theme";

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    if (theme === "light") {
      themeText.textContent = "Light";
      const icon = themeBtn.querySelector(".btnIcon");
      if (icon) icon.textContent = "☀";
    } else {
      themeText.textContent = "Dark";
      const icon = themeBtn.querySelector(".btnIcon");
      if (icon) icon.textContent = "☾";
    }
    localStorage.setItem(THEME_KEY, theme);
  }

  function toggleTheme() {
    const cur = document.documentElement.getAttribute("data-theme") || "dark";
    applyTheme(cur === "dark" ? "light" : "dark");
  }

  function fmtNumber(x, decimals = 2) {
    if (x === null || x === undefined || Number.isNaN(x)) return "—";
    return Number(x).toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }

  function fmtRate(x, decimals = 4) {
    if (x === null || x === undefined || Number.isNaN(x)) return "—";
    return fmtNumber(x, decimals);
  }

  function setLoading(isLoading) {
    refreshBtn.disabled = isLoading;
  }

  function setError(msg, silent = false) {
    if (!msg) {
      errorPill.classList.add("hidden");
      errorPill.textContent = "";
      return;
    }
    errorPill.textContent = msg;
    errorPill.classList.remove("hidden");
    if (!silent) alert(msg);
  }

  function setUpdated(tsText) {
    if (!tsText) {
      updatedPill.classList.add("hidden");
      updatedPill.textContent = "";
      return;
    }
    updatedPill.textContent = `Last updated: ${tsText}`;
    updatedPill.classList.remove("hidden");
  }

  function resetUI() {
    routesGrid.innerHTML = "";
    bestChip.textContent = "—";
    bestText.textContent = "Refresh to calculate.";
  }

  function ageLabel(ms) {
    if (ms == null) return "unknown";
    const s = Math.floor(ms / 1000);
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    return `${h}h ago`;
  }

  function setSourceCard(cardEl, metaEl, state, text) {
    if (!cardEl || !metaEl) return;
    cardEl.classList.remove("ok", "warn", "bad");
    cardEl.classList.add(state);
    metaEl.textContent = text;
  }

  // Math
  // THB = (TWD / CathaySell[X]) * SuperRichBuy[X]
  function thbViaCurrency(twdAmount, cathaySell, superRichBuy) {
    if (!twdAmount || twdAmount <= 0) return null;
    if (!cathaySell || cathaySell <= 0) return null;
    if (!superRichBuy || superRichBuy <= 0) return null;
    return (twdAmount / cathaySell) * superRichBuy;
  }

  // Direct TWD -> THB using SuperRich TWD BUY (THB per 1 TWD)
  function thbDirect(twdAmount, superRichBuyTwd) {
    if (!twdAmount || twdAmount <= 0) return null;
    if (!superRichBuyTwd || superRichBuyTwd <= 0) return null;
    return twdAmount * superRichBuyTwd;
  }

  function buildCard({ title, badgeText, isBest, thbOut, detailsLines }) {
    const card = document.createElement("article");
    card.className = "card" + (isBest ? " best" : "");

    card.innerHTML = `
      <div class="cardHead">
        <div>
          <h2 class="cardTitle">${title}</h2>
        </div>
        <div class="badge">${badgeText}</div>
      </div>

      <div class="kpis single">
        <div class="kpi">
          <div class="kLabel">You receive</div>
          <div class="kValue">${thbOut == null ? "—" : `${fmtNumber(thbOut, 2)} THB`}</div>
        </div>
      </div>

      <details class="details">
        <summary class="detailsSummary">Details</summary>
        <div class="detailsBody">
          ${detailsLines.map((line) => `<div>${line}</div>`).join("")}
        </div>
      </details>
    `;
    return card;
  }

  function pickBestKey(items) {
    const valid = items.filter((x) => x.thbOut != null && Number.isFinite(x.thbOut));
    if (!valid.length) return null;
    valid.sort((a, b) => b.thbOut - a.thbOut);
    return valid[0].key;
  }

  function startCountdown(seconds) {
    loadingPill.classList.remove("hidden");
    loadingPill.classList.add("rrDots");

    let remaining = seconds;
    loadingPill.textContent = `Loading rates (${remaining}s)`;

    const iv = setInterval(() => {
      remaining--;
      if (remaining >= 0) {
        loadingPill.textContent = `Loading rates (${remaining}s)`;
      }
    }, 1000);

    return () => {
      clearInterval(iv);
      loadingPill.classList.add("hidden");
      loadingPill.classList.remove("rrDots");
      loadingPill.textContent = "Loading Rate...";
    };
  }

  async function notifyAdmin(payload) {
    try {
      await fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (_) {}
  }

  function renderRates(data) {
    const twdAmount = Number(amountInput.value || 0);
    const sr = data.superRich || {};
    const ct = data.cathay || {};

    // Source freshness (keep simple)
    const srFetchedAt = data.meta?.sources?.superRich?.fetchedAt ?? null;
    const ctFetchedAt = data.meta?.sources?.cathay?.fetchedAt ?? null;

    const now = Date.now();
    const srAge = srFetchedAt ? now - srFetchedAt : null;
    const ctAge = ctFetchedAt ? now - ctFetchedAt : null;

    const WARN_MS = 15 * 60 * 1000;
    const srState = srAge == null ? "warn" : srAge > WARN_MS ? "warn" : "ok";
    const ctState = ctAge == null ? "warn" : ctAge > WARN_MS ? "warn" : "ok";

    setSourceCard(srCard, srMeta, srState, `Fetched ${ageLabel(srAge)}`);
    setSourceCard(ctCard, ctMeta, ctState, `Fetched ${ageLabel(ctAge)}`);

    const computed = [];

    for (const ccy of ["USD", "EUR", "JPY"]) {
      // FORCE adjusted only
      const cathaySell =
        (ct[ccy] && typeof ct[ccy].sellAdjusted === "number") ? ct[ccy].sellAdjusted : null;

      const superRichBuy = sr[ccy]?.buy ?? null;
      const thbOut = thbViaCurrency(twdAmount, cathaySell, superRichBuy);

      computed.push({
        key: ccy,
        title: `TWD → ${ccy} → THB`,
        thbOut,
        details: [
          `TWD → ${ccy} = ${fmtRate(cathaySell, ccy === "JPY" ? 4 : 3)}`,
          `${ccy} → THB = ${fmtRate(superRichBuy, ccy === "JPY" ? 4 : 2)}`,
        ],
      });
    }

    const srTwdBuy = sr.TWD?.buy ?? null;
    const thbOutDirect = thbDirect(twdAmount, srTwdBuy);

    computed.push({
      key: "DIRECT",
      title: "TWD → THB (Direct)",
      thbOut: thbOutDirect,
      details: [`TWD → THB = ${fmtRate(srTwdBuy, 4)}`],
    });

    const bestKey = pickBestKey(computed);

    // Sort best -> worst (nulls last)
    computed.sort((a, b) => {
      const av = Number.isFinite(a.thbOut) ? a.thbOut : -Infinity;
      const bv = Number.isFinite(b.thbOut) ? b.thbOut : -Infinity;
      return bv - av;
    });

    routesGrid.innerHTML = "";
    for (const item of computed) {
      const isBest = item.key === bestKey;
      routesGrid.appendChild(
        buildCard({
          title: item.title,
          badgeText: isBest ? "Best" : "Route",
          isBest,
          thbOut: item.thbOut,
          detailsLines: item.details,
        })
      );
    }

    if (!bestKey) {
      bestChip.textContent = "—";
      bestText.textContent = "Not enough valid data to choose the best route.";
    } else {
      const bestItem = computed.find((x) => x.key === bestKey);
      bestChip.textContent = bestKey === "DIRECT" ? "Direct" : bestKey;
      bestText.textContent = `Best: ${bestItem.title} — ${fmtNumber(
        bestItem.thbOut,
        2
      )} THB from ${fmtNumber(twdAmount, 0)} TWD.`;
    }

    setUpdated(data.meta?.serverTimeText || new Date().toLocaleString());
  }

  async function fetchAndRender() {
    setError("");
    setUpdated("");
    setLoading(true);

    let stopCountdown = null;
    let lastData = null;

    try {
      // Attempt 1 (15s)
      stopCountdown = startCountdown(15);
      let res = await fetch("/api/rates", { cache: "no-store" });
      lastData = await res.json();
      stopCountdown();

      if (lastData?.ok === true) {
        renderRates(lastData);
        return;
      }

      // Attempt 2 (30s)
      stopCountdown = startCountdown(30);
      res = await fetch("/api/rates?refresh=1", { cache: "no-store" });
      lastData = await res.json();
      stopCountdown();

      if (lastData?.ok === true) {
        renderRates(lastData);
        return;
      }

      // Both attempts failed
      setError("Rates are temporarily unavailable. Please try again later or tomorrow.");
      setSourceCard(srCard, srMeta, "bad", "Unavailable");
      setSourceCard(ctCard, ctMeta, "bad", "Unavailable");
      resetUI();

      if (lastData?.meta?.internetOk === true) {
        await notifyAdmin({
          type: "RATE_FETCH_FAILED",
          app: "RateRoute",
          time: new Date().toISOString(),
          errors: lastData?.adminErrors || lastData?.errors || ["Fetch failed"],
        });
      }
    } catch (err) {
      stopCountdown && stopCountdown();
      setError("Unexpected error. Please try again later.", true);
      setSourceCard(srCard, srMeta, "bad", "Unavailable");
      setSourceCard(ctCard, ctMeta, "bad", "Unavailable");
      resetUI();

      // Only notify if we know internet is OK from lastData (if present)
      if (lastData?.meta?.internetOk === true) {
        await notifyAdmin({
          type: "CLIENT_EXCEPTION",
          app: "RateRoute",
          time: new Date().toISOString(),
          error: err?.message || String(err),
        });
      }
    } finally {
      setLoading(false);
    }
  }

  // Events
  themeBtn.addEventListener("click", toggleTheme);
  refreshBtn.addEventListener("click", fetchAndRender);

  let t = null;
  amountInput.addEventListener("input", () => {
    clearTimeout(t);
    t = setTimeout(fetchAndRender, 250);
  });

  // Init theme
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === "light" || saved === "dark") {
    applyTheme(saved);
  } else {
    const prefersLight =
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: light)").matches;
    applyTheme(prefersLight ? "light" : "dark");
  }

  resetUI();
  fetchAndRender();
})();
