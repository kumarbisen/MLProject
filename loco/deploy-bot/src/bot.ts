/**
 * src/bot.ts
 *
 * Telegram bot that supports:
 *  1. One-shot command build: `/build <niche>`
 *  2. Conversational onboarding: Interactively gathers details step-by-step
 *     (niche, brand vibe, product count, payout frequency) before starting
 *     the storefront builder workflow.
 *
 * Commands:
 *  /start         — Welcome & Quick Start conversational guide
 *  /build         — Starts interactive conversational builder (or one-shot `/build <niche>`)
 *  /stores        — List stores owned by the sender
 *  /status <id>   — Get status of a specific store
 *  /cancel        — Exits current conversation flow
 *  /help          — Show all commands
 */
import TelegramBot from "node-telegram-bot-api";
import { runStorefrontBuild, storeDB } from "@locusfounder/mastra-engine";

// ── Conversational Session Types ──────────────────────────────────────────────

interface OnboardingSession {
  step: "awaiting_niche" | "awaiting_vibe" | "awaiting_limit" | "awaiting_schedule" | "confirming";
  nichePrompt?: string;
  brandVibe?: string;
  productLimit?: number;
  payoutSchedule?: "daily" | "weekly" | "monthly";
}

// Thread-safe in-memory session store
const sessions = new Map<number, OnboardingSession>();

// ── Bot Initialization ────────────────────────────────────────────────────────

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!BOT_TOKEN) {
  console.warn(
    "⚠️  TELEGRAM_BOT_TOKEN not set — bot will run in offline mode (API triggers only)"
  );
}

export function createBot(): TelegramBot | null {
  if (!BOT_TOKEN) return null;

  const bot = new TelegramBot(BOT_TOKEN, { polling: true });

  console.log("🤖 LocusFounder Telegram bot started");

  // Helper: Reset conversation state
  const resetSession = (chatId: number) => {
    sessions.delete(chatId);
  };

  // ── /start ─────────────────────────────────────────────────────────────────
  bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    resetSession(chatId);

    bot.sendMessage(
      chatId,
      `👋 Welcome to *LocusFounder*!
      
I'm your fully-automated AI storefront builder.

✨ *We can build your store in two ways:*
1. 💬 *Interactive Onboarding (Recommended):* Just send me a message or type \`/build\` to start a conversation where we plan your brand vibe, product count, and payout schedules together!
2. 🚀 *One-Shot Build:* Type \`/build pet accessory store\` to launch immediately.

📋 *Useful Commands:*
• /build — Start conversational builder
• /stores — View your created stores
• /cancel — Cancel current setup conversation
• /help — Show help guide

_Powered by LocusFounder × Mastra × Locus Logistics_`,
      { parse_mode: "Markdown" }
    );
  });

  // ── /help ──────────────────────────────────────────────────────────────────
  bot.onText(/\/help/, (msg) => {
    bot.sendMessage(
      msg.chat.id,
      `*LocusFounder Commands*

• /build — Starts interactive conversational setup
• /build <niche> — Instantly launch a storefront with default specs
• /stores — List all your active stores
• /status <storeId> — Check building status
• /cancel — Exit interactive conversation setup`,
      { parse_mode: "Markdown" }
    );
  });

  // ── /cancel ────────────────────────────────────────────────────────────────
  bot.onText(/\/cancel/, (msg) => {
    const chatId = msg.chat.id;
    if (sessions.has(chatId)) {
      resetSession(chatId);
      bot.sendMessage(chatId, "❌ Current storefront setup cancelled. Use /build to start over!");
    } else {
      bot.sendMessage(chatId, "No active setup session to cancel.");
    }
  });

  // ── /stores ────────────────────────────────────────────────────────────────
  bot.onText(/\/stores/, (msg) => {
    const chatId = msg.chat.id.toString();
    const stores = storeDB.findByOwner(chatId);

    if (stores.length === 0) {
      bot.sendMessage(
        msg.chat.id,
        "You don't have any stores yet. Type /build to create one!"
      );
      return;
    }

    const storeList = stores
      .map(
        (s: any) =>
          `• *${s.storeName}* (${s.status})\n  ID: \`${s.storeId}\`\n  Preview: ${process.env.NEXT_PUBLIC_API_URL ?? "https://locusfounder-bot-viv.azurewebsites.net"}/stores/${s.slug}/preview`
      )
      .join("\n\n");

    bot.sendMessage(msg.chat.id, `*Your Stores:*\n\n${storeList}`, {
      parse_mode: "Markdown",
    });
  });

  // ── /status ────────────────────────────────────────────────────────────────
  bot.onText(/\/status (.+)/, (msg, match) => {
    const storeId = match?.[1]?.trim();
    if (!storeId) return;

    const store = storeDB.stores.get(storeId);
    if (!store) {
      bot.sendMessage(msg.chat.id, `❌ Store \`${storeId}\` not found.`, {
        parse_mode: "Markdown",
      });
      return;
    }

    bot.sendMessage(
      msg.chat.id,
      `*Store Status*\n\n🏪 ${store.storeName}\n📊 Status: ${store.status}\n🛍️ Products: ${store.products.length}\n📝 Listings: ${store.listings.length}`,
      { parse_mode: "Markdown" }
    );
  });

  // ── /build [niche] ─────────────────────────────────────────────────────────
  bot.onText(/\/build$/, (msg) => {
    const chatId = msg.chat.id;
    // Start interactive conversational onboarding
    sessions.set(chatId, { step: "awaiting_niche" });
    bot.sendMessage(
      chatId,
      `🏪 *Welcome to LocusFounder Interactive Builder!* \n\n*Question 1 of 4:*\nWhat is the *niche* or product category for your store?\n_(e.g., Pet accessories, eco-friendly kitchenware, anime streetwear)_`,
      { parse_mode: "Markdown" }
    );
  });

  bot.onText(/\/build (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const nichePrompt = match?.[1]?.trim();

    if (!nichePrompt || nichePrompt.length < 3) return;

    resetSession(chatId);

    // Run one-shot build
    await bot.sendMessage(
      chatId,
      `🔄 *Building your "${nichePrompt}" store instantly...*\n\nI'll notify you here when everything is ready (approx. 30-60 seconds).\n\n_Step 1/6: Sourcing products..._`,
      { parse_mode: "Markdown" }
    );

    triggerWorkflow(bot, chatId.toString(), nichePrompt, 5, "weekly");
  });

  // ── Conversation Inline Callback Query Handler ─────────────────────────────
  bot.on("callback_query", async (query) => {
    const chatId = query.message?.chat.id;
    if (!chatId) return;

    const session = sessions.get(chatId);
    if (!session) return;

    const data = query.data;
    if (!data) return;

    // Answer callback query to stop spinning status
    await bot.answerCallbackQuery(query.id);

    // Step 3: product catalog size limit selection
    if (session.step === "awaiting_limit") {
      const limit = parseInt(data, 10);
      if (!isNaN(limit)) {
        session.productLimit = limit;
        session.step = "awaiting_schedule";

        sessions.set(chatId, session);

        await bot.sendMessage(
          chatId,
          `📊 *Question 4 of 4:*\nHow frequently do you want StripeConnect payouts sent to your bank account?`,
          {
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [
                [
                  { text: "Daily 🌅", callback_data: "daily" },
                  { text: "Weekly 📅", callback_data: "weekly" },
                  { text: "Monthly 🏦", callback_data: "monthly" },
                ],
              ],
            },
          }
        );
      }
      return;
    }

    // Step 4: payout schedule frequency selection
    if (session.step === "awaiting_schedule") {
      if (data === "daily" || data === "weekly" || data === "monthly") {
        session.payoutSchedule = data;
        session.step = "confirming";

        sessions.set(chatId, session);

        // Display beautiful summary card before launching
        const summary = `📋 *LocusFounder Configuration Summary*
──────────────────────
• *Niche Category:* \`${session.nichePrompt}\`
• *Brand Vibe:* \`${session.brandVibe}\`
• *Product Catalog:* \`${session.productLimit} dropship products\`
• *Payout Scheduling:* \`${session.payoutSchedule} connects\`
• *Platform Commissions:* \`10%\`
──────────────────────
🚀 Are you ready to build and deploy your storefront?`;

        await bot.sendMessage(chatId, summary, {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [
                { text: "Deploy Storefront 🚀", callback_data: "action_deploy" },
                { text: "Cancel ❌", callback_data: "action_cancel" },
              ],
            ],
          },
        });
      }
      return;
    }

    // Final Confirmation Action handlers
    if (session.step === "confirming") {
      if (data === "action_deploy") {
        bot.sendMessage(
          chatId,
          `✨ *Deployment Authorized!* Starting Mastra storefront workflow...\n\n_Step 1/6: Sourcing CJ Dropshipping catalog..._`,
          { parse_mode: "Markdown" }
        );

        const finalNiche = `${session.brandVibe} style ${session.nichePrompt}`;
        triggerWorkflow(
          bot,
          chatId.toString(),
          finalNiche,
          session.productLimit ?? 5,
          session.payoutSchedule ?? "weekly"
        );

        resetSession(chatId);
      } else {
        resetSession(chatId);
        bot.sendMessage(chatId, "❌ Setup cancelled. Use /build to restart.");
      }
    }
  });

  // ── Conversational Message Listener ─────────────────────────────────────────
  bot.on("message", async (msg) => {
    if (msg.text?.startsWith("/")) return; // Commands handled elsewhere

    const chatId = msg.chat.id;
    const session = sessions.get(chatId);

    // If no active session, treat plain text as a trigger to start conversational flow
    if (!session) {
      if (msg.text && msg.text.trim().length > 3) {
        sessions.set(chatId, { step: "awaiting_vibe", nichePrompt: msg.text.trim() });
        await bot.sendMessage(
          chatId,
          `🎯 Got it! We're building a store for: *"${msg.text.trim()}"*\n\n*Question 2 of 4:*\nWhat is the *brand vibe* or aesthetic of this store?\n_(e.g., Luxury, playful, eco-friendly, modern aesthetic)_`,
          { parse_mode: "Markdown" }
        );
      }
      return;
    }

    const text = msg.text?.trim();
    if (!text) return;

    // Step 1: niche input
    if (session.step === "awaiting_niche") {
      session.nichePrompt = text;
      session.step = "awaiting_vibe";
      sessions.set(chatId, session);

      await bot.sendMessage(
        chatId,
        `🎯 Got it!\n\n*Question 2 of 4:*\nWhat is the *brand vibe* or aesthetic of this store?\n_(e.g., Luxury, playful, eco-friendly, modern aesthetic)_`,
        { parse_mode: "Markdown" }
      );
      return;
    }

    // Step 2: brand vibe input
    if (session.step === "awaiting_vibe") {
      session.brandVibe = text;
      session.step = "awaiting_limit";
      sessions.set(chatId, session);

      await bot.sendMessage(
        chatId,
        `🛍️ *Question 3 of 4:*\nHow many source products should we catalog from CJ Dropshipping suppliers?`,
        {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [
                { text: "3 Products", callback_data: "3" },
                { text: "5 Products (Default)", callback_data: "5" },
                { text: "10 Products", callback_data: "10" },
              ],
            ],
          },
        }
      );
      return;
    }
  });

  return bot;
}

// ── Conversational Workflow Launcher ──────────────────────────────────────────

async function triggerWorkflow(
  bot: TelegramBot,
  ownerTelegramId: string,
  nichePrompt: string,
  productLimit: number,
  payoutSchedule: "daily" | "weekly" | "monthly"
): Promise<void> {
  try {
    const result = await runStorefrontBuild({
      nichePrompt,
      ownerTelegramId,
      productLimit,
      platformFeePercent: 10,
      payoutSchedule,
    });

    const notifyStep = result.steps?.["notify-owner"];
    const notifySent = (notifyStep as any)?.output?.sent;
    const final =
      result.status === "success" ? result.result : undefined;

    if (!notifySent) {
      const storeStep = result.steps?.["build-storefront"];
      const storeName =
        final?.storeName ??
        (storeStep as any)?.output?.storeName ??
        "Your Store";
      const previewUrl =
        final?.previewUrl ??
        (storeStep as any)?.output?.previewUrl ??
        "Check dashboard";

      await bot.sendMessage(
        ownerTelegramId,
        `✅ Store "${storeName}" is ready!\n${previewUrl}`,
        { parse_mode: "Markdown" }
      );
    }
  } catch (err) {
    console.error("[bot] Workflow error:", err);
    await bot.sendMessage(
      ownerTelegramId,
      "❌ There was an error building your store. Please try again or contact support.",
      { parse_mode: "Markdown" }
    );
  }
}
