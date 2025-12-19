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

  // 🔒 STRICT PRIORITY (lower = higher priority)
  const ROUTE_PRIORITY = {
    DIRECT: 0,
    USD: 1,
    EUR: 2,
    JPY: 3,
  };

  function pickBestKey(items) {
    const valid = items.filter(
      (x) => x.thbOut != null && Number.isFinite(x.thbOut)
    );
    if (!valid.length) return null;

    valid.sort((a, b) => {
      // 1️⃣ Highest THB wins
      if (b.thbOut !== a.thbOut) {
        return b.thbOut - a.thbOut;
      }
      // 2️⃣ Tie → strict priority
      return (
        ROUTE_PRIORITY[a.key] - ROUTE_PRIORITY[b.key]
      );
    });

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

    const srFetchedAt = data.meta?.sources?.superRich?.fetchedAt ?? null;
    const ctFetchedAt = data.meta?.sources?.cathay?.fetchedAt ?? null;

    const now = Date.now();
    const srAge = srFetchedAt ? now - srFetchedAt : null;
    const ctAge = ctFetchedAt ? now - ctFetchedAt : null;

    const WARN_MS = 15 * 60 * 1000;
    setSourceCard(srCard, srMeta, srAge > WARN_MS ? "warn" : "ok", `Fetched ${ageLabel(srAge)}`);
    setSourceCard(ctCard, ctMeta, ctAge > WARN_MS ? "warn" : "ok", `Fetched ${ageLabel(ctAge)}`);

    const computed = [];

    for (const ccy of ["USD", "EUR", "JPY"]) {
      const cathaySell = ct[ccy]?.sellAdjusted ?? null;
      const superRichBuy = sr[ccy]?.buy ?? null;
      computed.push({
        key: ccy,
        title: `TWD → ${ccy} → THB`,
        thbOut: thbViaCurrency(twdAmount, cathaySell, superRichBuy),
        details: [
          `TWD → ${ccy} = ${fmtRate(cathaySell, ccy === "JPY" ? 4 : 3)}`,
          `${ccy} → THB = ${fmtRate(superRichBuy, ccy === "JPY" ? 4 : 2)}`
        ]
      });
    }

    computed.push({
      key: "DIRECT",
      title: "TWD → THB (Direct)",
      thbOut: thbDirect(twdAmount, sr.TWD?.buy ?? null),
      details: [`TWD → THB = ${fmtRate(sr.TWD?.buy, 4)}`]
    });

    const bestKey = pickBestKey(computed);

    computed.sort((a, b) => {
      const av = Number.isFinite(a.thbOut) ? a.thbOut : -Infinity;
      const bv = Number.isFinite(b.thbOut) ? b.thbOut : -Infinity;
      return bv - av;
    });

    routesGrid.innerHTML = "";
    for (const item of computed) {
      routesGrid.appendChild(
        buildCard({
          title: item.title,
          badgeText: item.key === bestKey ? "Best" : "Route",
          isBest: item.key === bestKey,
          thbOut: item.thbOut,
          detailsLines: item.details,
        })
      );
    }

    bestChip.textContent = bestKey === "DIRECT" ? "Direct" : bestKey;
    bestText.textContent = bestKey
      ? `Best: ${bestKey} — ${fmtNumber(
          computed.find(x => x.key === bestKey).thbOut, 2
        )} THB`
      : "Not enough valid data.";

    setUpdated(data.meta?.serverTimeText || new Date().toLocaleString());
  }

  async function fetchAndRender() {
    setError("");
    setUpdated("");
    setLoading(true);

    let stopCountdown = null;
    let lastData = null;

    try {
      stopCountdown = startCountdown(60);
      let res = await fetch("/api/rates", { cache: "no-store" });
      lastData = await res.json();
      stopCountdown();

      if (lastData?.ok) {
        renderRates(lastData);
        return;
      }

      await new Promise((r) => setTimeout(r, 1000));

      stopCountdown = startCountdown(90);
      res = await fetch("/api/rates?refresh=1", { cache: "no-store" });
      lastData = await res.json();
      stopCountdown();

      if (lastData?.ok) {
        renderRates(lastData);
        return;
      }

      throw new Error("Both attempts failed");
    } catch (err) {
      stopCountdown && stopCountdown();
      setError("Rates are temporarily unavailable. Please try again later.");
      resetUI();

      if (lastData?.meta?.internetOk === true) {
        await notifyAdmin({
          type: "RATE_FETCH_FAILED",
          time: new Date().toISOString(),
          errors: lastData?.errors || []
        });
      }
    } finally {
      setLoading(false);
    }
  }

  themeBtn.addEventListener("click", toggleTheme);
  refreshBtn.addEventListener("click", fetchAndRender);
  amountInput.addEventListener("input", fetchAndRender);

  applyTheme(localStorage.getItem(THEME_KEY) || "dark");
  resetUI();
  fetchAndRender();
})();
