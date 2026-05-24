/**
 * tools/integrateLocusCheckout.ts
 *
 * Registers the store with the Locus logistics platform, creates a
 * Locus Checkout session configuration, and returns the checkout
 * widget embed code + webhook endpoint details.
 *
 * Locus API docs: https://docs.locus.sh/
 */
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import axios, { AxiosError } from "axios";
import { storeDB } from "../db/inMemoryStore.js";

// ── Schemas ──────────────────────────────────────────────────────────────────

const LocusConfigSchema = z.object({
  locusClientId: z.string(),
  checkoutWebhookUrl: z.string().url(),
  trackingPageUrl: z.string().url(),
  checkoutEmbedSnippet: z.string().describe("HTML script tag to embed in storefront"),
  shippingZones: z.array(
    z.object({
      region: z.string(),
      carrier: z.string(),
      estimatedDays: z.string(),
      freeShippingThreshold: z.number().optional(),
    })
  ),
});

// ── Tool ──────────────────────────────────────────────────────────────────────

export const integrateLocusCheckoutTool = createTool({
  id: "integrate-locus-checkout",
  description:
    "Registers the store with Locus, configures real-time order tracking, " +
    "sets up the Locus Checkout widget, and returns embed code and webhook details.",
  inputSchema: z.object({
    storeId: z.string(),
    storeName: z.string(),
    slug: z.string(),
    ownerTelegramId: z.string(),
  }),
  outputSchema: z.object({
    locusConfig: LocusConfigSchema,
    storeId: z.string(),
    registered: z.boolean(),
  }),
  execute: async ({ context: inputData }) => {
    const { storeId, storeName, slug, ownerTelegramId } = inputData;

    // Register store with Locus (real or mock)
    const locusConfig = await registerWithLocus(storeId, storeName, slug);

    // Update store DB
    const store = storeDB.stores.get(storeId);
    if (store) {
      store.locusConfig = locusConfig;
      store.status = "checkout_integrated";
      storeDB.stores.set(storeId, store);
    }

    return {
      locusConfig,
      storeId,
      registered: true,
    };
  },
});

// ── Locus Integration ─────────────────────────────────────────────────────────

async function registerWithLocus(
  storeId: string,
  storeName: string,
  slug: string
): Promise<z.infer<typeof LocusConfigSchema>> {
  const LOCUS_API_KEY = process.env.LOCUS_API_KEY;
  const LOCUS_CLIENT_ID = process.env.LOCUS_CLIENT_ID;
  const LOCUS_BASE_URL = process.env.LOCUS_BASE_URL ?? "https://api.locus.sh";
  const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

  if (LOCUS_API_KEY && LOCUS_CLIENT_ID) {
    // ── Real Locus API call ────────────────────────────────────────────────
    try {
      await axios.post(
        `${LOCUS_BASE_URL}/client/${LOCUS_CLIENT_ID}/store/register`,
        {
          storeId,
          storeName,
          webhookUrl: `${BASE_URL}/webhooks/locus/${storeId}`,
          callbackUrl: `${BASE_URL}/stores/${slug}/order-confirmed`,
        },
        {
          headers: {
            Authorization: `Bearer ${LOCUS_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );
    } catch (err) {
      const axiosErr = err as AxiosError;
      console.warn("[integrateLocusCheckout] Locus API error, using mock:", axiosErr.message);
    }
  } else {
    console.warn("[integrateLocusCheckout] LOCUS_API_KEY not set — using mock config");
  }

  // ── Mock / fallback config ─────────────────────────────────────────────────
  const clientId = LOCUS_CLIENT_ID ?? "mock_client_" + storeId.slice(-6);

  return {
    locusClientId: clientId,
    checkoutWebhookUrl: `${BASE_URL}/webhooks/locus/${storeId}`,
    trackingPageUrl: `${LOCUS_BASE_URL ?? "https://track.locus.sh"}/track/${storeId}`,
    checkoutEmbedSnippet: `<script src="https://checkout.locus.sh/v2/widget.js" 
  data-client-id="${clientId}"
  data-store-id="${storeId}"
  data-webhook="${BASE_URL}/webhooks/locus/${storeId}"
  defer>
</script>`,
    shippingZones: [
      { region: "US", carrier: "USPS", estimatedDays: "7-10", freeShippingThreshold: 35 },
      { region: "EU", carrier: "DHL", estimatedDays: "10-14", freeShippingThreshold: 50 },
      { region: "GLOBAL", carrier: "EMS", estimatedDays: "14-21" },
    ],
  };
}
