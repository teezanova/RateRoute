"use strict";

require("dotenv").config();
const path = require("path");
const express = require("express");
const { getRates } = require("./src/getRates");

const app = express();
app.use(express.json({ limit: "200kb" }));
const PORT = process.env.PORT || 3000;

// Serve frontend
app.use(express.static(path.join(__dirname, "public")));
const nodemailer = require("nodemailer");

app.post("/api/notify", async (req, res) => {
  try {
    const payload = req.body || {};
    const subject = `[RateRoute] ${payload.type || "Notification"}`;
    const text = JSON.stringify(payload, null, 2);

    // If SMTP not configured, just log (still returns ok:true so app doesn't break)
    const {
      SMTP_HOST,
      SMTP_PORT,
      SMTP_USER,
      SMTP_PASS,
      ADMIN_EMAIL,
      SMTP_SECURE
    } = process.env;

    if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !ADMIN_EMAIL) {
      console.log("ADMIN NOTIFY (SMTP not configured):", subject, text);
      return res.json({ ok: true, sent: false, reason: "SMTP not configured" });
    }

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: String(SMTP_SECURE || "").toLowerCase() === "true", // true for 465
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });

    await transporter.sendMail({
      from: SMTP_USER,
      to: ADMIN_EMAIL,
      subject,
      text,
    });

    res.json({ ok: true, sent: true });
  } catch (e) {
    console.log("ADMIN NOTIFY FAILED:", e?.message || e);
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});
// Health check
app.get("/health", (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// API: rates (cached 5 min inside getRates)
// Optional force refresh: /api/rates?refresh=1
app.get("/api/rates", async (req, res) => {
  try {
    const force = req.query.refresh === "1" || req.query.refresh === "true";
    const payload = await getRates({ force });

    // Avoid browser caching (we manage caching server-side)
    res.setHeader("Cache-Control", "no-store");

    // If payload.ok is false, return 502 to signal upstream fetch failure
    res.status(payload.ok ? 200 : 502).json(payload);
  } catch (err) {
    res.setHeader("Cache-Control", "no-store");
    res.status(500).json({
      ok: false,
      errors: [err?.message || "Unexpected server error."],
      superRich: {},
      cathay: {},
      meta: {
        cached: false,
        cacheTtlMs: null,
        serverTimestamp: Date.now(),
        serverTimeText: new Date().toLocaleString(),
        sources: {
          superRich: { fetchedAt: null, fetchedText: null },
          cathay: { fetchedAt: null, fetchedText: null },
        },
      },
    });
  }
});

// Fallback for any unknown route: serve index.html (simple SPA behavior)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});
const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

async function backgroundRefresh() {
  try {
    const payload = await getRates({ force: true });
    console.log("[BG REFRESH]", payload.ok ? "OK" : "FAIL", new Date().toLocaleString());
  } catch (e) {
    console.log("[BG REFRESH] ERROR", e?.message || e);
  }
}

// run once on boot, then every 12h
backgroundRefresh();
setInterval(backgroundRefresh, TWELVE_HOURS_MS);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`RateRoute running: http://localhost:${PORT}`);
});
