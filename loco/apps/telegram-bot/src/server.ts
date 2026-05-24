/**
 * src/server.ts
 *
 * Express HTTP server that:
 *  1. Runs the Telegram bot
 *  2. Serves storefront HTML previews
 *  3. Exposes a REST API for the admin dashboard
 *  4. Handles Locus + Stripe webhooks
 */
import "dotenv/config";
import express from "express";
import { createBot } from "./bot.js";
import { storeDB, storefrontBuilderWorkflow } from "@locusfounder/mastra-engine";

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS for admin dashboard dev
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// ── Health Check ──────────────────────────────────────────────────────────────

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "locusfounder", timestamp: new Date().toISOString() });
});

// ── Store Preview ─────────────────────────────────────────────────────────────

app.get("/stores/:slug/preview", (req, res) => {
  const store = storeDB.findBySlug(req.params.slug);
  if (!store) return res.status(404).send("Store not found");

  const html = storeDB.storefrontHTML.get(store.storeId);
  if (!html) return res.status(404).send("Storefront not ready yet");

  res.setHeader("Content-Type", "text/html");
  res.send(html);
});

// ── Products API (used by storefront JS) ─────────────────────────────────────

app.get("/api/stores/:slug/products", (req, res) => {
  const store = storeDB.findBySlug(req.params.slug);
  if (!store) return res.status(404).json({ error: "Store not found" });

  res.json({
    products: store.products,
    total: store.products.length,
  });
});

// ── Admin: List All Stores ─────────────────────────────────────────────────────

app.get("/api/stores", (_req, res) => {
  const stores = storeDB.listStores().map((s) => ({
    storeId: s.storeId,
    storeName: s.storeName,
    slug: s.slug,
    niche: s.niche,
    status: s.status,
    productCount: s.products.length,
    listingCount: s.listings.length,
    createdAt: s.createdAt,
  }));
  res.json({ stores, total: stores.length });
});

// ── Admin: Get Store Detail ───────────────────────────────────────────────────

app.get("/api/stores/:storeId", (req, res) => {
  const store = storeDB.stores.get(req.params.storeId);
  if (!store) return res.status(404).json({ error: "Store not found" });
  res.json(store);
});

// ── Trigger Workflow via REST ─────────────────────────────────────────────────

app.post("/api/build", async (req, res) => {
  const { nichePrompt, ownerTelegramId, productLimit, platformFeePercent, payoutSchedule } =
    req.body;

  if (!nichePrompt || !ownerTelegramId) {
    return res.status(400).json({ error: "nichePrompt and ownerTelegramId are required" });
  }

  // Start workflow asynchronously
  res.json({
    message: "Workflow started",
    nichePrompt,
    ownerTelegramId,
    status: "running",
  });

  try {
    const run = storefrontBuilderWorkflow.createRun();
    await run.start({
      inputData: {
        nichePrompt,
        ownerTelegramId,
        productLimit: productLimit ?? 5,
        platformFeePercent: platformFeePercent ?? 10,
        payoutSchedule: payoutSchedule ?? "weekly",
      },
    });
  } catch (err) {
    console.error("[server] /api/build workflow error:", err);
  }
});

// ── Locus Webhook ─────────────────────────────────────────────────────────────

app.post("/webhooks/locus/:storeId", (req, res) => {
  const { storeId } = req.params;
  const event = req.body;

  console.log(`[Locus Webhook] storeId=${storeId}`, event?.type);

  // Handle order events
  if (event?.type === "order.created") {
    console.log(`  → New order: ${event.orderId}`);
    // TODO: trigger fulfillment, update inventory, send buyer confirmation
  }

  if (event?.type === "order.delivered") {
    console.log(`  → Order delivered: ${event.orderId}`);
    // TODO: trigger review request, update analytics
  }

  res.json({ received: true });
});

// ── Stripe Webhook ────────────────────────────────────────────────────────────

app.post("/webhooks/stripe/:storeId", (req, res) => {
  const { storeId } = req.params;
  const event = req.body;

  console.log(`[Stripe Webhook] storeId=${storeId}`, event?.type);

  if (event?.type === "charge.succeeded") {
    console.log(`  → Payment confirmed: ${event?.data?.object?.amount / 100} USD`);
    // TODO: trigger order fulfillment via Locus
  }

  if (event?.type === "payout.created") {
    console.log(`  → Payout to owner initiated`);
    // TODO: notify owner via Telegram
  }

  res.json({ received: true });
});

// ── Mock Stripe Connect ───────────────────────────────────────────────────────

app.get("/mock-stripe-connect", (req, res) => {
  const { storeId, account } = req.query;
  res.send(`
    <html>
      <body style="font-family:sans-serif;max-width:500px;margin:80px auto;text-align:center">
        <h2>🔗 Mock Stripe Connect</h2>
        <p>Store ID: <strong>${storeId}</strong></p>
        <p>Account: <strong>${account}</strong></p>
        <p style="color:#888">In production, this would redirect to Stripe's onboarding flow.</p>
        <a href="/api/stores/${storeId}" style="background:#635BFF;color:#fff;padding:.8rem 2rem;border-radius:8px;text-decoration:none;display:inline-block;margin-top:1rem">
          View Store →
        </a>
      </body>
    </html>
  `);
});

// ── Start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n🚀 LocusFounder API server running on http://localhost:${PORT}`);
  console.log(`   Health:    GET /health`);
  console.log(`   Build:     POST /api/build`);
  console.log(`   Stores:    GET /api/stores`);
  console.log(`   Preview:   GET /stores/:slug/preview\n`);

  // Start Telegram bot
  const bot = createBot();
  if (bot) {
    console.log("🤖 Telegram bot polling...");
  } else {
    console.log("⚠️  Telegram bot not started (TELEGRAM_BOT_TOKEN not set)");
  }
});

export default app;
