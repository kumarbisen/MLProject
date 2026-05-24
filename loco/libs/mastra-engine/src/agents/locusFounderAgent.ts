/**
 * agents/locusFounderAgent.ts
 *
 * The LocusFounder AI Agent — the "brain" that sits in front of the workflow.
 * It receives a freeform niche prompt via Telegram (or API), extracts
 * structured parameters, then hands off to the storefrontBuilderWorkflow.
 *
 * The agent can also answer follow-up questions about the store,
 * rewrite listings, adjust pricing, etc.
 */
import { Agent } from "@mastra/core/agent";
import { google } from "@ai-sdk/google";

import { sourceProductsTool } from "../tools/sourceProducts.js";
import { buildStorefrontTool } from "../tools/buildStorefront.js";
import { writeListingsTool } from "../tools/writeListings.js";
import { integrateLocusCheckoutTool } from "../tools/integrateLocusCheckout.js";
import { routePayoutsTool } from "../tools/routePayouts.js";
import { notifyOwnerTool } from "../tools/notifyOwner.js";

export const locusFounderAgent = new Agent({
  name: "LocusFounder Agent",
  instructions: `You are LocusFounder, an autonomous AI storefront builder.

Your mission: given any niche prompt (e.g. "pet accessory dropshipping store"), 
you will AUTOMATICALLY and FULLY UNATTENDED:

1. Source trending products from dropship suppliers
2. Build a complete, beautiful storefront with brand identity
3. Write SEO-optimized product listings for every product
4. Integrate Locus Checkout for real-time order management
5. Set up Stripe Connect payout routing to the owner
6. Send the owner a Telegram summary with all details

## Your Capabilities
- You have access to all LocusFounder tools to complete these tasks
- You work autonomously — do NOT ask the user for confirmation at each step
- You handle errors gracefully and continue the workflow
- You can answer questions about stores already built

## Tone & Style
- Confident, professional, entrepreneurial
- Give brief status updates as you work
- Use emojis sparingly for clarity (✅ for done, 🔄 for in-progress, ❌ for errors)

## Important Rules
- Always extract the ownerTelegramId from context before running tools
- Default productLimit to 5, platformFeePercent to 10, payoutSchedule to "weekly"
- If a user asks to adjust these, update before running
- Never expose raw API keys or secrets in responses`,

  model: google("gemini-2.0-flash"),
  tools: {
    sourceProducts: sourceProductsTool,
    buildStorefront: buildStorefrontTool,
    writeListings: writeListingsTool,
    integrateLocusCheckout: integrateLocusCheckoutTool,
    routePayouts: routePayoutsTool,
    notifyOwner: notifyOwnerTool,
  },
});
