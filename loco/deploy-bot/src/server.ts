/**
 * src/server.ts
 *
 * Express HTTP server that:
 *  1. Runs the Telegram bot
 *  2. Serves storefront HTML previews
 *  3. Exposes a REST API for the admin dashboard
 *  4. Handles 17TRACK + Stripe webhooks
 */
import "dotenv/config";
import express from "express";
import { createBot } from "./bot.js";
import { registerCustomerApi } from "./customerApi.js";
import {
  locusFounderAgent,
  registerWith17Track,
  runStorefrontBuild,
  storeDB,
} from "@locusfounder/mastra-engine";

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

registerCustomerApi(app);

// ── Health Check ──────────────────────────────────────────────────────────────

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "locusfounder", timestamp: new Date().toISOString() });
});

// ── Store Preview (multi-page) ────────────────────────────────────────────────

function sendStorePage(
  res: express.Response,
  store: { storeId: string },
  page: "home" | "shop" | "about" | "contact" | "product"
) {
  const html = storeDB.getStorefrontPage(store.storeId, page);
  if (!html) return res.status(404).send("Storefront not ready yet");
  res.setHeader("Content-Type", "text/html");
  res.send(html);
}

app.get("/stores/:slug/preview", (req, res) => {
  const store = storeDB.findBySlug(req.params.slug);
  if (!store) return res.status(404).send("Store not found");
  sendStorePage(res, store, "home");
});

app.get("/stores/:slug/shop", (req, res) => {
  const store = storeDB.findBySlug(req.params.slug);
  if (!store) return res.status(404).send("Store not found");
  sendStorePage(res, store, "shop");
});

app.get("/stores/:slug/about", (req, res) => {
  const store = storeDB.findBySlug(req.params.slug);
  if (!store) return res.status(404).send("Store not found");
  sendStorePage(res, store, "about");
});

app.get("/stores/:slug/contact", (req, res) => {
  const store = storeDB.findBySlug(req.params.slug);
  if (!store) return res.status(404).send("Store not found");
  sendStorePage(res, store, "contact");
});

app.get("/stores/:slug/product/:productId", (req, res) => {
  const store = storeDB.findBySlug(req.params.slug);
  if (!store) return res.status(404).send("Store not found");
  sendStorePage(res, store, "product");
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

app.get("/api/stores/:slug/products/:productId", (req, res) => {
  const store = storeDB.findBySlug(req.params.slug);
  if (!store) return res.status(404).json({ error: "Store not found" });

  const product = store.products.find(
    (p) => p.supplierId === req.params.productId
  );
  if (!product) return res.status(404).json({ error: "Product not found" });

  res.json(product);
});

// ── Admin: List All Stores ─────────────────────────────────────────────────────

app.get("/api/stores", (_req, res) => {
  const stores = storeDB.listStores().map((s: any) => ({
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
    await runStorefrontBuild({
      nichePrompt: String(nichePrompt).trim(),
      ownerTelegramId: String(ownerTelegramId),
      productLimit: productLimit ?? 5,
      platformFeePercent: platformFeePercent ?? 10,
      payoutSchedule: payoutSchedule ?? "weekly",
    });
  } catch (err) {
    console.error("[server] /api/build workflow error:", err);
  }
});

// ── Register 17TRACK Monitoring ─────────────────────────────────────────────

app.post("/api/register-tracking", async (req, res) => {
  const { trackingNumber, carrierCode } = req.body ?? {};

  if (!trackingNumber) {
    return res.status(400).json({ error: "trackingNumber is required" });
  }

  try {
    const result = await registerWith17Track.execute!({
      context: {
        trackingNumber,
        carrierCode,
      },
      runtimeContext: {} as any,
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error("[server] /api/register-tracking error:", error);
    return res.status(500).json({ error: "Failed to register tracking number" });
  }
});

// ── 17TRACK Webhook ──────────────────────────────────────────────────────────

app.post("/api/17track-webhook", async (req, res) => {
  try {
    const webhookData = req.body;
    const acceptedShipment = webhookData?.data?.accepted?.[0] ?? webhookData?.data?.accepted ?? webhookData?.data;

    if (!acceptedShipment) {
      return res.status(200).json({ status: "ignored_empty_payload" });
    }

    const trackingNumber = acceptedShipment.number ?? webhookData?.number;
    if (!trackingNumber) {
      return res.status(200).json({ status: "ignored_missing_tracking_number" });
    }

    const latestStatus =
      acceptedShipment.latest_status?.status ??
      acceptedShipment.latest_status?.e ??
      webhookData?.event ??
      acceptedShipment.e ??
      "Unknown";

    const statusDescription =
      acceptedShipment.latest_status?.desc ??
      acceptedShipment.status_description ??
      acceptedShipment.description ??
      "Package processing...";

    const aiPrompt = `
LOGISTICS ALERT: Tracking Number ${trackingNumber} has changed status.
New Status Code/Tag: ${latestStatus}
Details from Carrier: ${statusDescription}

Write a brief, professional notification update for the store owner.
`;

    const aiResponse = await (locusFounderAgent as any).generate?.(aiPrompt);
    const notificationText =
      aiResponse?.text?.trim() ??
      `📦 17TRACK update for ${trackingNumber}\n\nStatus: ${latestStatus}\nDetails: ${statusDescription}`;

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const founderChatId = process.env.FOUNDER_TELEGRAM_CHAT_ID;

    if (botToken && founderChatId) {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: founderChatId,
          text: notificationText,
        }),
      });
    } else {
      console.warn("[server] Missing TELEGRAM_BOT_TOKEN or FOUNDER_TELEGRAM_CHAT_ID; skipping founder notification");
      console.log("[server] 17TRACK alert:", notificationText);
    }

    return res.status(200).json({ code: 0, message: "Webhook event handled successfully." });
  } catch (error) {
    console.error("[server] 17TRACK webhook error:", error);
    return res.status(500).json({ error: "Internal pipeline fault" });
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
  console.log(`   Customer:  POST /api/auth/login`);
  console.log(`   Dashboard: GET /api/customer/apps`);
  console.log(`   Preview:   GET /stores/:slug/preview (home, shop, about, contact, product)\n`);

  // Start Telegram bot
  const bot = createBot();
  if (bot) {
    console.log("🤖 Telegram bot polling...");
  } else {
    console.log("⚠️  Telegram bot not started (TELEGRAM_BOT_TOKEN not set)");
  }
});

export default app;
