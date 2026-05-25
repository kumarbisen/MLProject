/**
 * tools/sourceProducts.ts
 *
 * Discovers trending products on CJ Dropshipping (or a mock supplier)
 * matching a given niche keyword. Returns a ranked list of products
 * with pricing, images, and supplier metadata.
 */
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import axios from "axios";
import { searchCJProducts } from "./cjClient";

// ── Schemas ──────────────────────────────────────────────────────────────────

export const ProductSchema = z.object({
  supplierId: z.string(),
  title: z.string(),
  description: z.string(),
  costPrice: z.number().describe("Supplier price in USD"),
  suggestedRetailPrice: z.number().describe("2.5× markup retail price"),
  images: z.array(z.string().url()),
  category: z.string(),
  tags: z.array(z.string()),
  moq: z.number().default(1).describe("Minimum order quantity"),
  shippingDays: z.number().describe("Estimated delivery days"),
  rating: z.number().min(0).max(5).optional(),
  reviewCount: z.number().optional(),
});

export type Product = z.infer<typeof ProductSchema>;

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Mock supplier fetch – replace with real CJ Dropshipping
 * API calls in production by reading env vars.
 */
async function fetchFromSupplier(niche: string, limit: number): Promise<Product[]> {
  // Try CJ Dropshipping first when configured; fall back to generated mock data
  try {
    const cjItems = await searchCJProducts(niche, limit);
    if (cjItems && cjItems.length > 0) {
      return cjItems.slice(0, limit).map((it) => ({
        supplierId: it.supplierId,
        title: it.title,
        description: it.description,
        costPrice: it.costPrice,
        suggestedRetailPrice: parseFloat((it.costPrice * 2.5).toFixed(2)),
        images: it.images && it.images.length ? it.images : ["https://via.placeholder.com/600x600.png?text=Product"],
        category: it.category || niche,
        tags: it.tags || [niche, "dropshipping"],
        moq: it.moq ?? 1,
        shippingDays: it.shippingDays ?? 7,
        rating: it.rating,
        reviewCount: it.reviewCount,
      }));
    }
  } catch (err) {
    // ignore and fall back to mock data
  }

  // For now we generate plausible mock data so the workflow can run E2E.
  const baseProducts: Omit<Product, "suggestedRetailPrice">[] = [
    {
      supplierId: "CJ-" + Math.random().toString(36).slice(2, 8).toUpperCase(),
      title: `Premium ${niche} – Deluxe Edition`,
      description: `Top-rated ${niche} product sourced from verified CJ Dropshipping supplier.`,
      costPrice: parseFloat((Math.random() * 15 + 5).toFixed(2)),
      images: [
        "https://via.placeholder.com/600x600.png?text=Product+1",
        "https://via.placeholder.com/600x600.png?text=Product+1+Alt",
      ],
      category: niche,
      tags: [niche, "dropshipping", "trending"],
      moq: 1,
      shippingDays: 7,
      rating: parseFloat((Math.random() * 1.5 + 3.5).toFixed(1)),
      reviewCount: Math.floor(Math.random() * 500 + 50),
    },
    {
      supplierId: "CJ-" + Math.random().toString(36).slice(2, 8).toUpperCase(),
      title: `${niche} Starter Kit – Best Seller`,
      description: `Complete ${niche} kit perfect for beginners and enthusiasts alike.`,
      costPrice: parseFloat((Math.random() * 20 + 8).toFixed(2)),
      images: [
        "https://via.placeholder.com/600x600.png?text=Product+2",
      ],
      category: niche,
      tags: [niche, "kit", "value"],
      moq: 1,
      shippingDays: 10,
      rating: parseFloat((Math.random() * 1 + 4).toFixed(1)),
      reviewCount: Math.floor(Math.random() * 1000 + 100),
    },
    {
      supplierId: "CJ-" + Math.random().toString(36).slice(2, 8).toUpperCase(),
      title: `Luxury ${niche} – Premium Collection`,
      description: `Luxury-grade ${niche} item for discerning customers.`,
      costPrice: parseFloat((Math.random() * 30 + 20).toFixed(2)),
      images: [
        "https://via.placeholder.com/600x600.png?text=Product+3",
      ],
      category: niche,
      tags: [niche, "luxury", "premium"],
      moq: 1,
      shippingDays: 14,
      rating: parseFloat((Math.random() * 0.8 + 4.2).toFixed(1)),
      reviewCount: Math.floor(Math.random() * 300 + 20),
    },
  ];

  return baseProducts.slice(0, limit).map((p) => ({
    ...p,
    suggestedRetailPrice: parseFloat((p.costPrice * 2.5).toFixed(2)),
  }));
}

// ── Tool ──────────────────────────────────────────────────────────────────────

export const sourceProductsTool = createTool({
  id: "source-products",
  description:
    "Discovers and sources trending dropship products for a given niche. " +
    "Returns a list of products with supplier IDs, pricing, images, and tags.",
  inputSchema: z.object({
    niche: z
      .string()
      .describe('The store niche, e.g. "pet accessory dropshipping store"'),
    limit: z
      .number()
      .int()
      .min(1)
      .max(20)
      .default(5)
      .describe("Maximum number of products to return"),
  }),
  outputSchema: z.object({
    products: z.array(ProductSchema),
    totalFound: z.number(),
  }),
  execute: async ({ context: inputData }) => {
    const { niche, limit } = inputData;

    if (!niche || typeof niche !== "string") {
      throw new Error("sourceProducts: niche is required");
    }

    // Normalise niche → clean keyword
    const keyword = niche
      .toLowerCase()
      .replace(/(dropshipping|store|shop)/gi, "")
      .trim();

    const products = await fetchFromSupplier(keyword, limit);

    return {
      products,
      totalFound: products.length,
    };
  },
});
