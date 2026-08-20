const express = require("express");
const app = express();

app.use(express.json({ limit: "1mb" }));

// Destination 1: Kylas native Interakt integration (existing sync)
const KYLAS_URL =
  "https://interakt.integrations.kylas.io/whatsapp-messages/d769ad4a-fbf1-409a-a2ee-79e8ab8cb0bd/226/handler";

// Destination 2: Make.com custom webhook (CTA tracking + TAT)
// Replace this with your Make.com webhook URL after creating the scenario
const MAKE_URL = process.env.MAKE_WEBHOOK_URL || "https://hook.eu2.make.com/YOUR_WEBHOOK_ID_HERE";

// Health check
app.get("/", (req, res) => {
  res.json({ status: "ok", service: "interakt-fanout" });
});

// Fan-out endpoint — Interakt sends events here
app.post("/webhook", async (req, res) => {
  const payload = JSON.stringify(req.body);
  const headers = {
    "Content-Type": "application/json",
  };

  // Copy Interakt's secret key header if present
  if (req.headers["x-interakt-secret"]) {
    headers["x-interakt-secret"] = req.headers["x-interakt-secret"];
  }

  // Fire both requests simultaneously, don't wait for either to block the other
  const forward = (url, label) =>
    fetch(url, { method: "POST", headers, body: payload })
      .then((r) => console.log(`${label}: ${r.status}`))
      .catch((err) => console.error(`${label} FAILED:`, err.message));

  // Respond to Interakt immediately, forward in background
  res.status(200).json({ ok: true });

  await Promise.allSettled([
    forward(KYLAS_URL, "KYLAS"),
    forward(MAKE_URL, "MAKE"),
  ]);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Interakt fan-out running on port ${PORT}`));
