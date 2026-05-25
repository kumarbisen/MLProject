/**
 * tools/routePayouts.ts
 *
 * Configures automatic payout routing:
 *   • Platform takes a fee (default 10%)
 *   • Remainder is routed to the store owner via Stripe Connect
 *
 * Also stores payout configuration in the store record.
 */
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { storeDB } from "../db/inMemoryStore.js";

// ── Schemas ──────────────────────────────────────────────────────────────────

const PayoutConfigSchema = z.object({
  ownerStripeAccountId: z.string(),
  platformFeePercent: z.number(),
  ownerSharePercent: z.number(),
  payoutSchedule: z.enum(["daily", "weekly", "monthly"]),
  currency: z.string().default("usd"),
  minimumPayoutUsd: z.number().default(10),
  webhookEndpoint: z.string().url(),
});

// ── Tool ──────────────────────────────────────────────────────────────────────

export const routePayoutsTool = createTool({
  id: "route-payouts",
  description:
    "Sets up Stripe Connect payout routing. The platform collects a " +
    "configurable fee and routes the owner's share automatically on each sale.",
  inputSchema: z.object({
    storeId: z.string(),
    ownerTelegramId: z.string(),
    payoutSchedule: z
      .enum(["daily", "weekly", "monthly"])
      .default("weekly")
      .describe("How often to pay out to the owner"),
    platformFeePercent: z
      .number()
      .min(0)
      .max(50)
      .default(10)
      .describe("Platform commission percentage"),
  }),
  outputSchema: z.object({
    payoutConfig: PayoutConfigSchema,
    storeId: z.string(),
    stripeConnectUrl: z
      .string()
      .url()
      .describe("URL for the owner to connect their Stripe account"),
  }),
  execute: async ({ context: inputData }) => {
    const { storeId, ownerTelegramId, payoutSchedule, platformFeePercent } = inputData;

    // Look up owner Stripe account (in production, retrieved from user profile)
    const ownerStripeAccountId =
      process.env.OWNER_STRIPE_ACCOUNT_ID ?? `acct_mock_${ownerTelegramId.slice(-6)}`;

    const BASE_URL = process.env["NEXT_PUBLIC_API_URL"] ?? "https://locusfounder-bot-viv.azurewebsites.net";

    const payoutConfig: z.infer<typeof PayoutConfigSchema> = {
      ownerStripeAccountId,
      platformFeePercent,
      ownerSharePercent: 100 - platformFeePercent,
      payoutSchedule,
      currency: "usd",
      minimumPayoutUsd: 10,
      webhookEndpoint: `${BASE_URL}/webhooks/stripe/${storeId}`,
    };

    // Persist payout config
    const store = storeDB.stores.get(storeId);
    if (store) {
      store.payoutConfig = payoutConfig;
      store.status = "live";
      storeDB.stores.set(storeId, store);
    }

    // In production, create a Stripe Connect onboarding link
    const stripeConnectUrl = await createStripeConnectLink(storeId, ownerStripeAccountId);

    return {
      payoutConfig,
      storeId,
      stripeConnectUrl,
    };
  },
});

// ── Stripe Integration ────────────────────────────────────────────────────────

async function createStripeConnectLink(
  storeId: string,
  accountId: string
): Promise<string> {
  const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;
  const BASE_URL = process.env["NEXT_PUBLIC_API_URL"] ?? "https://locusfounder-bot-viv.azurewebsites.net";

  if (STRIPE_SECRET && !accountId.startsWith("acct_mock_")) {
    try {
      // Dynamic import — stripe is an optional production dependency
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const stripeModule = await import("stripe" as any).catch(() => null);
      if (!stripeModule) throw new Error("stripe package not installed");

      const StripeClass = stripeModule.default ?? stripeModule;
      const stripe = new StripeClass(STRIPE_SECRET, { apiVersion: "2024-12-18.acacia" });

      const link = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${BASE_URL}/stores/${storeId}/stripe-refresh`,
        return_url: `${BASE_URL}/stores/${storeId}/stripe-success`,
        type: "account_onboarding",
      });

      return link.url;
    } catch (err) {
      console.warn("[routePayouts] Stripe error:", err);
    }
  }

  // Mock fallback
  return `${BASE_URL}/mock-stripe-connect?storeId=${storeId}&account=${accountId}`;
}
