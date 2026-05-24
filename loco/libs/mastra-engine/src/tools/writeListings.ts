/**
 * tools/writeListings.ts
 *
 * Uses Google Gemini (via @ai-sdk/google) to write compelling product
 * listings — titles, descriptions, bullet points, and SEO metadata —
 * for every product in the store.
 */
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import { storeDB } from "../db/inMemoryStore.js";
import type { Product } from "./sourceProducts.js";

// ── Schemas ──────────────────────────────────────────────────────────────────

export const ListingSchema = z.object({
  supplierId: z.string(),
  seoTitle: z.string().max(70),
  metaDescription: z.string().max(160),
  headline: z.string(),
  description: z.string(),
  bulletPoints: z.array(z.string()).length(5),
  callToAction: z.string(),
});

export type Listing = z.infer<typeof ListingSchema>;

// ── Tool ──────────────────────────────────────────────────────────────────────

export const writeListingsTool = createTool({
  id: "write-listings",
  description:
    "Generates SEO-optimized product listings (title, description, " +
    "bullet points, CTA, meta tags) for all products in a store using Gemini Flash.",
  inputSchema: z.object({
    storeId: z.string(),
    products: z.array(
      z.object({
        supplierId: z.string(),
        title: z.string(),
        description: z.string(),
        category: z.string(),
        tags: z.array(z.string()),
        suggestedRetailPrice: z.number(),
      })
    ),
    storeName: z.string(),
    niche: z.string(),
  }),
  outputSchema: z.object({
    listings: z.array(ListingSchema),
    storeId: z.string(),
  }),
  execute: async ({ context: inputData }) => {
    const { storeId, products, storeName, niche } = inputData;
    const listings: Listing[] = [];

    for (const product of products) {
      const listing = await generateListingWithAI(product, storeName, niche);
      listings.push(listing);
    }

    // Persist listings into the store record
    const store = storeDB.stores.get(storeId);
    if (store) {
      store.listings = listings;
      storeDB.stores.set(storeId, store);
    }

    return { listings, storeId };
  },
});

// ── AI Generation ─────────────────────────────────────────────────────────────

async function generateListingWithAI(
  product: Pick<Product, "supplierId" | "title" | "description" | "category" | "tags" | "suggestedRetailPrice">,
  storeName: string,
  niche: string
): Promise<Listing> {
  const prompt = `You are an expert e-commerce copywriter specialising in ${niche}.

Write a product listing for "${storeName}" for the following product:
- Raw title: ${product.title}
- Raw description: ${product.description}
- Category: ${product.category}
- Tags: ${product.tags.join(", ")}
- Price: $${product.suggestedRetailPrice}

Return ONLY valid JSON with these exact keys:
{
  "seoTitle": "<70 chars, keyword-rich>",
  "metaDescription": "<160 chars, compelling>",
  "headline": "<punchy 1-line headline>",
  "description": "<2-3 paragraph product description, benefit-focused>",
  "bulletPoints": ["point1", "point2", "point3", "point4", "point5"],
  "callToAction": "<short CTA text>"
}`;

  try {
    const { text } = await generateText({
      model: google("gemini-2.0-flash"),
      prompt,
      maxTokens: 800,
      temperature: 0.7,
    });

    // Strip markdown code fences if present
    const cleaned = text.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned) as Omit<Listing, "supplierId">;

    return {
      supplierId: product.supplierId,
      ...parsed,
    };
  } catch (err) {
    // Fallback listing if AI call fails
    console.error("[writeListings] AI error:", err);
    return {
      supplierId: product.supplierId,
      seoTitle: product.title.slice(0, 70),
      metaDescription: product.description.slice(0, 160),
      headline: product.title,
      description: product.description,
      bulletPoints: [
        "Premium quality materials",
        "Fast worldwide shipping",
        "30-day money-back guarantee",
        "Thousands of happy customers",
        "Secure checkout via Locus Pay",
      ],
      callToAction: "Add to Cart",
    };
  }
}
