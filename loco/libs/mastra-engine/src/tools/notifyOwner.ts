/**
 * tools/notifyOwner.ts
 *
 * Sends a Telegram message to the store owner with:
 *  • A summary of everything the workflow built
 *  • The live store URL
 *  • The Stripe Connect onboarding link
 *  • A payout summary
 */
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import axios from "axios";

// ── Tool ──────────────────────────────────────────────────────────────────────

export const notifyOwnerTool = createTool({
  id: "notify-owner",
  description:
    "Sends a Telegram message to the store owner summarising the fully-built " +
    "storefront, checkout integration, and payout routing details.",
  inputSchema: z.object({
    ownerTelegramId: z.string(),
    storeName: z.string(),
    storeId: z.string(),
    slug: z.string(),
    previewUrl: z.string(),
    productCount: z.number(),
    stripeConnectUrl: z.string(),
    platformFeePercent: z.number(),
    payoutSchedule: z.string(),
  }),
  outputSchema: z.object({
    sent: z.boolean(),
    messageId: z.number().optional(),
  }),
  execute: async ({ context: inputData }) => {
    const {
      ownerTelegramId,
      storeName,
      storeId,
      slug,
      previewUrl,
      productCount,
      stripeConnectUrl,
      platformFeePercent,
      payoutSchedule,
    } = inputData;

    const BASE_URL = process.env["NEXT_PUBLIC_API_URL"] ?? "https://locusfounder-bot-viv.azurewebsites.net";
    const ownerShare = 100 - platformFeePercent;

    const message = `🎉 *Your Store Is Live!*

🏪 *Store Name:* ${storeName}
🔗 *Store URL:* ${previewUrl}
🛍️ *Products Listed:* ${productCount}

📦 *Checkout:* Locus Pay integrated
💳 *Payouts:* ${ownerShare}% → you | ${platformFeePercent}% platform fee
🗓️ *Payout Schedule:* ${payoutSchedule}

👉 *Connect your Stripe account to start receiving payouts:*
${stripeConnectUrl}

🖥️ *Admin Dashboard:* ${process.env["PUBLIC_ADMIN_URL"] ?? "https://locusfounder-admin-viv.azurewebsites.net"}
📊 *Store ID:* \`${storeId}\`

Everything is running fully unattended. Orders will be processed and shipped automatically via Locus Logistics. You'll receive payout notifications here.

_Built by LocusFounder 🤖_`;

    const result = await sendTelegramMessage(ownerTelegramId, message);
    return result;
  },
});

// ── Telegram ──────────────────────────────────────────────────────────────────

async function sendTelegramMessage(
  chatId: string,
  text: string
): Promise<{ sent: boolean; messageId?: number }> {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

  if (!BOT_TOKEN) {
    console.warn("[notifyOwner] TELEGRAM_BOT_TOKEN not set — skipping notification");
    console.log("[notifyOwner] Would have sent:\n", text);
    return { sent: false };
  }

  try {
    const response = await axios.post(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        chat_id: chatId,
        text,
        parse_mode: "Markdown",
        disable_web_page_preview: false,
      }
    );

    return {
      sent: true,
      messageId: response.data?.result?.message_id,
    };
  } catch (err) {
    console.error("[notifyOwner] Telegram error:", err);
    return { sent: false };
  }
}
