(() => {
  const el = (id) => document.getElementById(id);

  const amountInput = el("amountInput");
  const refreshBtn = el("refreshBtn");
  const themeBtn = el("themeBtn");
  const themeText = el("themeText");
  const loadingPill = el("loadingPill");
  const errorPill = el("errorPill");
  const stalePill = el("stalePill");
  const updatedPill = el("updatedPill");
  const bestChip = el("bestChip");
  const bestText = el("bestText");
  const routesGrid = el("routesGrid");
  const srCard = el("srCard");
  const ctCard = el("ctCard");
  const srMeta = el("srMeta");
  const ctMeta = el("ctMeta");
  const summarySection = document.querySelector(".summary");

  const THEME_KEY = "rateroute_theme";

  // Persisted across fetches so amount changes recalculate instantly
  let lastData = null;
  let _srFetchedAt = null;
  let _ctFetchedAt = null;

  // ── Theme ────────────────────────────────────────────────────────────────

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    // Label shows the action the click will take (icon swap is handled in CSS by data-theme)
    themeText.textContent = theme === "light" ? "Dark" : "Light";
    localStorage.setItem(THEME_KEY, theme);
  }

  function toggleTheme() {
    const cur = document.documentElement.getAttribute("data-theme") || "dark";
    applyTheme(cur === "dark" ? "light" : "dark");
  }

  // ── Formatters ───────────────────────────────────────────────────────────

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

  // ── UI state ─────────────────────────────────────────────────────────────

  function setLoading(isLoading) {
    refreshBtn.disabled = isLoading;
    if (isLoading) {
      loadingPill.textContent = "Loading";
      loadingPill.classList.remove("hidden");
      loadingPill.classList.add("rrDots");
    } else {
      loadingPill.classList.remove("rrDots");
      loadingPill.classList.add("hidden");
    }
  }

  function setError(msg) {
    if (!msg) {
      errorPill.classList.add("hidden");
      errorPill.textContent = "";
      errorPill.removeAttribute("role");
      return;
    }
    errorPill.textContent = msg;
    errorPill.classList.remove("hidden");
    errorPill.setAttribute("role", "alert");
  }

  function setStale(msg) {
    if (!msg) {
      stalePill.classList.add("hidden");
      stalePill.textContent = "";
      return;
    }
    stalePill.textContent = msg;
    stalePill.classList.remove("hidden");
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

  // Dim existing results while fetching instead of wiping them
  function setFetching(on) {
    [routesGrid, summarySection].forEach((node) => {
      if (on) node.classList.add("fetching");
      else node.classList.remove("fetching");
    });
  }

  function resetUI() {
    routesGrid.innerHTML = "";
    bestChip.textContent = "—";
    bestText.textContent = "Enter an amount to compare routes.";
  }

  // ── Source card ages ─────────────────────────────────────────────────────

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

  function refreshSourceAges() {
    if (_srFetchedAt == null && _ctFetchedAt == null) return;
    const now = Date.now();
    const WARN_MS = 15 * 60 * 1000;
    if (_srFetchedAt != null) {
      const age = now - _srFetchedAt;
      setSourceCard(srCard, srMeta, age > WARN_MS ? "warn" : "ok", `Fetched ${ageLabel(age)}`);
    }
    if (_ctFetchedAt != null) {
      const age = now - _ctFetchedAt;
      setSourceCard(ctCard, ctMeta, age > WARN_MS ? "warn" : "ok", `Fetched ${ageLabel(age)}`);
    }
  }

  // Re-render source ages every 30s so "3m ago" stays accurate
  setInterval(refreshSourceAges, 30_000);

  // ── Math ─────────────────────────────────────────────────────────────────

  function thbViaCurrency(twdAmount, cathaySell, superRichBuy) {
    if (!twdAmount || twdAmount <= 0) return null;
    if (!cathaySell || cathaySell <= 0) return null;
    if (!superRichBuy || superRichBuy <= 0) return null;
    return (twdAmount / cathaySell) * superRichBuy;
  }

  function thbDirect(twdAmount, superRichBuyTwd) {
    if (!twdAmount || twdAmount <= 0) return null;
    if (!superRichBuyTwd || superRichBuyTwd <= 0) return null;
    return twdAmount * superRichBuyTwd;
  }

  function calcForeignAmount(twdAmount, cathaySell) {
    if (!twdAmount || twdAmount <= 0) return null;
    if (!cathaySell || cathaySell <= 0) return null;
    return twdAmount / cathaySell;
  }

  // ── Card builder ─────────────────────────────────────────────────────────

  function buildCard({ title, rank, isBest, thbOut, delta, foreignAmt, foreignLabel, detailsLines }) {
    const card = document.createElement("article");
    card.className = "card" + (isBest ? " best" : "");

    const badgeText = isBest ? "Best" : `#${rank}`;
    const hasForeign = foreignAmt != null && foreignLabel;

    const foreignKpiHtml = hasForeign ? `
      <div class="kpi">
        <div class="kLabel">Amount in ${foreignLabel}</div>
        <div class="kValue kValueSm">${fmtNumber(foreignAmt, foreignLabel === "JPY" ? 0 : 2)} ${foreignLabel}</div>
      </div>` : "";

    const deltaHtml = (!isBest && delta != null && Number.isFinite(delta))
      ? `<div class="kpiDelta">${fmtNumber(delta, 2)} THB vs best</div>`
      : "";

    card.innerHTML = `
      <div class="cardHead">
        <h2 class="cardTitle">${title}</h2>
        <div class="badge${isBest ? " badgeBest" : ""}">${badgeText}</div>
      </div>

      <div class="kpis${hasForeign ? "" : " single"}">
        ${foreignKpiHtml}
        <div class="kpi">
          <div class="kLabel">You receive</div>
          <div class="kValue">${thbOut == null ? "—" : `${fmtNumber(thbOut, 2)} THB`}</div>
        </div>
      </div>

      ${deltaHtml}

      <details class="details">
        <summary class="detailsSummary">Details</summary>
        <div class="detailsBody">
          ${detailsLines.map((line) => `<div>${line}</div>`).join("")}
        </div>
      </details>
    `;
    return card;
  }

  // ── Route logic ──────────────────────────────────────────────────────────

  const ROUTE_PRIORITY = { DIRECT: 0, USD: 1, EUR: 2, JPY: 3 };

  function pickBestKey(items) {
    const valid = items.filter((x) => x.thbOut != null && Number.isFinite(x.thbOut));
    if (!valid.length) return null;
    valid.sort((a, b) => {
      if (b.thbOut !== a.thbOut) return b.thbOut - a.thbOut;
      return ROUTE_PRIORITY[a.key] - ROUTE_PRIORITY[b.key];
    });
    return valid[0].key;
  }

  // ── Admin notify ─────────────────────────────────────────────────────────

  async function notifyAdmin(payload) {
    try {
      await fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (_) {}
  }

  // ── Render ───────────────────────────────────────────────────────────────

  function renderRates(data) {
    const twdAmount = Number(amountInput.value || 0);
    const sr = data.superRich || {};
    const ct = data.cathay || {};

    _srFetchedAt = data.meta?.sources?.superRich?.fetchedAt ?? null;
    _ctFetchedAt = data.meta?.sources?.cathay?.fetchedAt ?? null;
    refreshSourceAges();

    const computed = [];

    for (const ccy of ["USD", "EUR", "JPY"]) {
      const cathaySell = ct[ccy]?.sellAdjusted ?? null;
      const superRichBuy = sr[ccy]?.buy ?? null;
      computed.push({
        key: ccy,
        title: `TWD → ${ccy} → THB`,
        thbOut: thbViaCurrency(twdAmount, cathaySell, superRichBuy),
        foreignAmt: calcForeignAmount(twdAmount, cathaySell),
        foreignLabel: ccy,
        details: [
          `TWD → ${ccy} = ${fmtRate(cathaySell, ccy === "JPY" ? 4 : 3)}`,
          `${ccy} → THB = ${fmtRate(superRichBuy, ccy === "JPY" ? 4 : 2)}`,
        ],
      });
    }

    computed.push({
      key: "DIRECT",
      title: "TWD → THB (Direct)",
      thbOut: thbDirect(twdAmount, sr.TWD?.buy ?? null),
      foreignAmt: null,
      foreignLabel: null,
      details: [`TWD → THB = ${fmtRate(sr.TWD?.buy, 4)}`],
    });

    const bestKey = pickBestKey(computed);
    const bestThb = computed.find((x) => x.key === bestKey)?.thbOut ?? null;

    computed.sort((a, b) => {
      const av = Number.isFinite(a.thbOut) ? a.thbOut : -Infinity;
      const bv = Number.isFinite(b.thbOut) ? b.thbOut : -Infinity;
      return bv - av;
    });

    routesGrid.innerHTML = "";
    computed.forEach((item, i) => {
      const delta =
        item.key === bestKey || item.thbOut == null || bestThb == null
          ? null
          : item.thbOut - bestThb;

      routesGrid.appendChild(
        buildCard({
          title: item.title,
          rank: i + 1,
          isBest: item.key === bestKey,
          thbOut: item.thbOut,
          delta,
          foreignAmt: item.foreignAmt,
          foreignLabel: item.foreignLabel,
          detailsLines: item.details,
        })
      );
    });

    bestChip.textContent = bestKey === "DIRECT" ? "Direct" : (bestKey ?? "—");
    if (!twdAmount || twdAmount <= 0) {
      bestText.textContent = "Enter an amount to compare routes.";
    } else if (bestKey) {
      bestText.textContent = `Best: ${bestKey === "DIRECT" ? "Direct" : bestKey} — ${fmtNumber(
        computed.find((x) => x.key === bestKey).thbOut,
        2
      )} THB`;
    } else {
      bestText.textContent = "Not enough valid data.";
    }

    if (data.meta?.stale && data.meta?.cachedAtText) {
      setStale(`Showing cached rates from ${data.meta.cachedAtText}`);
    } else {
      setStale(null);
    }

    setUpdated(data.meta?.serverTimeText || new Date().toLocaleString());
  }

  // ── Fetch ────────────────────────────────────────────────────────────────

  async function fetchAndRender() {
    setError("");
    setLoading(true);

    const hasExistingData = lastData !== null;
    if (hasExistingData) {
      // Dim existing results rather than wiping them
      setFetching(true);
    }

    let fetchedData = null;

    try {
      const res = await fetch("/api/rates", { cache: "no-store" });
      fetchedData = await res.json();

      if (fetchedData?.ok) {
        lastData = fetchedData;
        setFetching(false);
        renderRates(lastData);
        return;
      }

      throw new Error("Fetch returned ok:false");
    } catch (err) {
      setFetching(false);
      setError("Rates are temporarily unavailable. Please try again later.");
      if (!hasExistingData) resetUI();

      if (fetchedData?.meta?.internetOk === true) {
        await notifyAdmin({
          type: "RATE_FETCH_FAILED",
          time: new Date().toISOString(),
          errors: fetchedData?.errors || [],
        });
      }
    } finally {
      setLoading(false);
    }
  }

  // ── Events ───────────────────────────────────────────────────────────────

  themeBtn.addEventListener("click", toggleTheme);
  refreshBtn.addEventListener("click", fetchAndRender);

  // Recalculate instantly on amount change — no network needed
  amountInput.addEventListener("input", () => {
    if (lastData) renderRates(lastData);
  });

  // Enter in the amount field triggers a fresh fetch
  amountInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") fetchAndRender();
  });

  applyTheme(localStorage.getItem(THEME_KEY) || "dark");
  resetUI();
  fetchAndRender();
})();
