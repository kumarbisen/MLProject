/**
 * workflows/storefrontBuilderWorkflow.ts
 *
 * The LocusFounder master workflow — fully unattended, 6-step pipeline:
 *
 *  Step 1 → sourceProducts    : discover products from suppliers
 *  Step 2 → buildStorefront   : generate store identity + HTML
 *  Step 3 → writeListings     : AI-write every product listing
 *  Step 4 → integrateCheckout : register with Locus & get embed code
 *  Step 5 → routePayouts      : set up Stripe Connect split payments
 *  Step 6 → notifyOwner       : send Telegram summary to owner
 */
import { createWorkflow, createStep } from "@mastra/core/workflows";
import { z } from "zod";

import { sourceProductsTool } from "../tools/sourceProducts.js";
import { buildStorefrontTool } from "../tools/buildStorefront.js";
import { writeListingsTool } from "../tools/writeListings.js";
import { integrateLocusCheckoutTool } from "../tools/integrateLocusCheckout.js";
import { routePayoutsTool } from "../tools/routePayouts.js";
import { notifyOwnerTool } from "../tools/notifyOwner.js";
import { storeDB } from "../db/inMemoryStore.js";
import { resolveStepInput } from "./workflowInput.js";

// ── Trigger Schema ─────────────────────────────────────────────────────────────

const TriggerSchema = z.object({
  nichePrompt: z
    .string()
    .min(3)
    .describe('e.g. "pet accessory dropshipping store"'),
  ownerTelegramId: z
    .string()
    .describe("Telegram chat ID of the store owner"),
  productLimit: z
    .number()
    .int()
    .min(1)
    .max(20)
    .default(5)
    .describe("How many products to source"),
  platformFeePercent: z
    .number()
    .min(0)
    .max(50)
    .default(10)
    .describe("Platform commission %"),
  payoutSchedule: z
    .enum(["daily", "weekly", "monthly"])
    .default("weekly"),
});

// ── Step 1: Source Products ───────────────────────────────────────────────────

const step1SourceProducts = createStep({
  id: "source-products",
  inputSchema: TriggerSchema,
  outputSchema: z.object({
    products: z.array(z.any()),
    totalFound: z.number(),
    nichePrompt: z.string(),
    ownerTelegramId: z.string(),
    productLimit: z.number(),
    platformFeePercent: z.number(),
    payoutSchedule: z.enum(["daily", "weekly", "monthly"]),
  }),
  execute: async ({ inputData, getInitData }) => {
    const {
      nichePrompt,
      ownerTelegramId,
      productLimit,
      platformFeePercent,
      payoutSchedule,
    } = resolveStepInput<z.infer<typeof TriggerSchema>>({ inputData, getInitData });

    if (!nichePrompt?.trim()) {
      throw new Error("nichePrompt is required — pass inputData to run.start()");
    }

    console.log(`[Step 1] Sourcing products for niche: "${nichePrompt}"`);

    const result = await sourceProductsTool.execute!({
      context: { niche: nichePrompt, limit: productLimit },
      runtimeContext: {} as any,
    });

    return {
      ...result,
      nichePrompt,
      ownerTelegramId,
      productLimit,
      platformFeePercent,
      payoutSchedule,
    };
  },
});

// ── Step 2: Build Storefront ──────────────────────────────────────────────────

const step2BuildStorefront = createStep({
  id: "build-storefront",
  inputSchema: z.object({
    products: z.array(z.any()),
    totalFound: z.number(),
    nichePrompt: z.string(),
    ownerTelegramId: z.string(),
    productLimit: z.number(),
    platformFeePercent: z.number(),
    payoutSchedule: z.enum(["daily", "weekly", "monthly"]),
  }),
  outputSchema: z.object({
    storeId: z.string(),
    storeName: z.string(),
    slug: z.string(),
    previewUrl: z.string(),
    colorPalette: z.any(),
    products: z.array(z.any()),
    nichePrompt: z.string(),
    ownerTelegramId: z.string(),
    platformFeePercent: z.number(),
    payoutSchedule: z.enum(["daily", "weekly", "monthly"]),
  }),
  execute: async ({ inputData, getInitData }) => {
    const { products, nichePrompt, ownerTelegramId, platformFeePercent, payoutSchedule } =
      resolveStepInput({ inputData, getInitData });

    console.log(`[Step 2] Building storefront for "${nichePrompt}"`);

    const result = await buildStorefrontTool.execute!({
      context: { niche: nichePrompt, ownerTelegramId },
      runtimeContext: {} as any,
    });

    // Attach products to store record
    const store = storeDB.stores.get(result.storeId);
    if (store) {
      store.products = products;
      store.status = "products_sourced";
      storeDB.stores.set(result.storeId, store);
    }

    return {
      ...result,
      products,
      nichePrompt,
      ownerTelegramId,
      platformFeePercent,
      payoutSchedule,
    };
  },
});

// ── Step 3: Write Listings ────────────────────────────────────────────────────

const step3WriteListings = createStep({
  id: "write-listings",
  inputSchema: z.object({
    storeId: z.string(),
    storeName: z.string(),
    slug: z.string(),
    previewUrl: z.string(),
    colorPalette: z.any(),
    products: z.array(z.any()),
    nichePrompt: z.string(),
    ownerTelegramId: z.string(),
    platformFeePercent: z.number(),
    payoutSchedule: z.enum(["daily", "weekly", "monthly"]),
  }),
  outputSchema: z.object({
    listings: z.array(z.any()),
    storeId: z.string(),
    storeName: z.string(),
    slug: z.string(),
    previewUrl: z.string(),
    products: z.array(z.any()),
    ownerTelegramId: z.string(),
    platformFeePercent: z.number(),
    payoutSchedule: z.enum(["daily", "weekly", "monthly"]),
  }),
  execute: async ({ inputData, getInitData }) => {
    const {
      storeId,
      storeName,
      slug,
      previewUrl,
      products,
      nichePrompt,
      ownerTelegramId,
      platformFeePercent,
      payoutSchedule,
    } = resolveStepInput({ inputData, getInitData });

    console.log(`[Step 3] Writing AI listings for ${products?.length ?? 0} products`);

    const result = await writeListingsTool.execute!({
      context: { storeId, products, storeName, niche: nichePrompt },
      runtimeContext: {} as any,
    });

    return {
      ...result,
      storeName,
      slug,
      previewUrl,
      products,
      ownerTelegramId,
      platformFeePercent,
      payoutSchedule,
    };
  },
});

// ── Step 4: Integrate Locus Checkout ─────────────────────────────────────────

const step4IntegrateCheckout = createStep({
  id: "integrate-locus-checkout",
  inputSchema: z.object({
    listings: z.array(z.any()),
    storeId: z.string(),
    storeName: z.string(),
    slug: z.string(),
    previewUrl: z.string(),
    products: z.array(z.any()),
    ownerTelegramId: z.string(),
    platformFeePercent: z.number(),
    payoutSchedule: z.enum(["daily", "weekly", "monthly"]),
  }),
  outputSchema: z.object({
    locusConfig: z.any(),
    storeId: z.string(),
    storeName: z.string(),
    slug: z.string(),
    previewUrl: z.string(),
    products: z.array(z.any()),
    ownerTelegramId: z.string(),
    platformFeePercent: z.number(),
    payoutSchedule: z.enum(["daily", "weekly", "monthly"]),
    registered: z.boolean(),
  }),
  execute: async ({ inputData, getInitData }) => {
    const {
      storeId,
      storeName,
      slug,
      previewUrl,
      products,
      ownerTelegramId,
      platformFeePercent,
      payoutSchedule,
    } = resolveStepInput({ inputData, getInitData });

    console.log(`[Step 4] Integrating Locus Checkout for storeId: ${storeId}`);

    const result = await integrateLocusCheckoutTool.execute!({
      context: { storeId, storeName, slug, ownerTelegramId },
      runtimeContext: {} as any,
    });

    return {
      ...result,
      storeName,
      slug,
      previewUrl,
      products,
      ownerTelegramId,
      platformFeePercent,
      payoutSchedule,
    };
  },
});

// ── Step 5: Route Payouts ─────────────────────────────────────────────────────

const step5RoutePayouts = createStep({
  id: "route-payouts",
  inputSchema: z.object({
    locusConfig: z.any(),
    storeId: z.string(),
    storeName: z.string(),
    slug: z.string(),
    previewUrl: z.string(),
    products: z.array(z.any()),
    ownerTelegramId: z.string(),
    platformFeePercent: z.number(),
    payoutSchedule: z.enum(["daily", "weekly", "monthly"]),
    registered: z.boolean(),
  }),
  outputSchema: z.object({
    payoutConfig: z.any(),
    stripeConnectUrl: z.string(),
    storeId: z.string(),
    storeName: z.string(),
    slug: z.string(),
    previewUrl: z.string(),
    products: z.array(z.any()),
    ownerTelegramId: z.string(),
    platformFeePercent: z.number(),
    payoutSchedule: z.enum(["daily", "weekly", "monthly"]),
  }),
  execute: async ({ inputData, getInitData }) => {
    const {
      storeId,
      storeName,
      slug,
      previewUrl,
      products,
      ownerTelegramId,
      platformFeePercent,
      payoutSchedule,
    } = resolveStepInput({ inputData, getInitData });

    console.log(`[Step 5] Routing payouts for storeId: ${storeId}`);

    const result = await routePayoutsTool.execute!({
      context: { storeId, ownerTelegramId, payoutSchedule, platformFeePercent },
      runtimeContext: {} as any,
    });

    return {
      ...result,
      storeName,
      slug,
      previewUrl,
      products,
      ownerTelegramId,
      platformFeePercent,
      payoutSchedule,
    };
  },
});

// ── Step 6: Notify Owner ──────────────────────────────────────────────────────

const step6NotifyOwner = createStep({
  id: "notify-owner",
  inputSchema: z.object({
    payoutConfig: z.any(),
    stripeConnectUrl: z.string(),
    storeId: z.string(),
    storeName: z.string(),
    slug: z.string(),
    previewUrl: z.string(),
    products: z.array(z.any()),
    ownerTelegramId: z.string(),
    platformFeePercent: z.number(),
    payoutSchedule: z.enum(["daily", "weekly", "monthly"]),
  }),
  outputSchema: z.object({
    sent: z.boolean(),
    messageId: z.number().optional(),
    storeId: z.string(),
    storeName: z.string(),
    previewUrl: z.string(),
    productCount: z.number(),
  }),
  execute: async ({ inputData, getInitData }) => {
    const {
      storeId,
      storeName,
      slug,
      previewUrl,
      products,
      ownerTelegramId,
      platformFeePercent,
      payoutSchedule,
      stripeConnectUrl,
    } = resolveStepInput({ inputData, getInitData });

    console.log(`[Step 6] Notifying owner ${ownerTelegramId}`);

    const result = await notifyOwnerTool.execute!({
      context: {
        ownerTelegramId,
        storeName,
        storeId,
        slug,
        previewUrl,
        productCount: products.length,
        stripeConnectUrl,
        platformFeePercent,
        payoutSchedule,
      },
      runtimeContext: {} as any,
    });

    console.log(`✅ [LocusFounder] Store "${storeName}" is LIVE!`);
    console.log(`   Preview: ${previewUrl}`);

    return {
      ...result,
      storeId,
      storeName,
      previewUrl,
      productCount: products.length,
    };
  },
});

// ── Assemble Workflow ─────────────────────────────────────────────────────────

export const storefrontBuilderWorkflow = createWorkflow({
  id: "storefront-builder",
  inputSchema: TriggerSchema,
  outputSchema: z.object({
    sent: z.boolean(),
    messageId: z.number().optional(),
    storeId: z.string(),
    storeName: z.string(),
    previewUrl: z.string(),
    productCount: z.number(),
  }),
})
  .then(step1SourceProducts)
  .then(step2BuildStorefront)
  .then(step3WriteListings)
  .then(step4IntegrateCheckout)
  .then(step5RoutePayouts)
  .then(step6NotifyOwner)
  .commit();

export type StorefrontBuilderTrigger = z.infer<typeof TriggerSchema>;
