/**
 * tools/buildStorefront.ts
 *
 * Generates a multi-page storefront (home, shop, about, contact, product)
 * and persists HTML per page for preview serving.
 */
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import slugify from "slugify";
import { storeDB } from "../db/inMemoryStore.js";
import { generateAllStorefrontPages } from "../storefront/pages.js";

// ── Tool ──────────────────────────────────────────────────────────────────────

export const buildStorefrontTool = createTool({
  id: "build-storefront",
  description:
    "Creates a complete multi-page storefront for the niche: home, shop, about, " +
    "contact, and dynamic product detail pages. Persists HTML and returns preview URL.",
  inputSchema: z.object({
    niche: z.string().describe("The dropshipping niche"),
    ownerTelegramId: z
      .string()
      .describe("Telegram user ID of the store owner"),
  }),
  outputSchema: z.object({
    storeId: z.string(),
    storeName: z.string(),
    slug: z.string(),
    previewUrl: z.string(),
    colorPalette: z.object({
      primary: z.string(),
      secondary: z.string(),
      accent: z.string(),
      background: z.string(),
    }),
  }),
  execute: async ({ context: inputData }) => {
    const { niche, ownerTelegramId } = inputData;

    const cleanNiche = niche.replace(/(dropshipping|store|shop)/gi, "").trim();
    const storeName = generateStoreName(cleanNiche);
    const slug = slugify(storeName, { lower: true, strict: true });
    const palette = generatePalette(cleanNiche);

    const storeId = `store_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    storeDB.stores.set(storeId, {
      storeId,
      storeName,
      slug,
      niche: cleanNiche,
      ownerTelegramId,
      colorPalette: palette,
      products: [],
      listings: [],
      createdAt: new Date().toISOString(),
      status: "building",
    });

    const pages = generateAllStorefrontPages(storeName, cleanNiche, palette, slug);
    storeDB.setStorefrontPages(storeId, pages);

    const baseUrl = process.env["PUBLIC_API_URL"] ?? process.env["NEXT_PUBLIC_API_URL"] ?? "https://locusfounder-bot-viv.azurewebsites.net";
    const previewUrl = `${baseUrl}/stores/${slug}/preview`;

    return {
      storeId,
      storeName,
      slug,
      previewUrl,
      colorPalette: palette,
    };
  },
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateStoreName(niche: string): string {
  const adjectives = [
    "Paws & Claws",
    "Happy Tails",
    "Furever",
    "Trendy Paws",
    "The Pet Vault",
    "PetPrime",
    "Cozy Critters",
    "Urban Paws",
    "Snuggle Spot",
    "Pawsome",
  ];
  const nicheWords = niche.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1));
  const prefix = adjectives[Math.floor(Math.random() * adjectives.length)];
  if (niche.toLowerCase().includes("pet")) return prefix + " Store";
  return prefix + " " + nicheWords.join(" ") + " Shop";
}

function generatePalette(niche: string): {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
} {
  const n = niche.toLowerCase();
  if (n.includes("pet")) {
    return {
      primary: "#2C2416",
      secondary: "#F7F4EF",
      accent: "#8B6914",
      background: "#FFFFFF",
    };
  }
  if (n.includes("fashion") || n.includes("cloth") || n.includes("silk")) {
    return {
      primary: "#6B1D3A",
      secondary: "#F8F6F3",
      accent: "#B8860B",
      background: "#FFFFFF",
    };
  }
  return {
    primary: "#1A1A1A",
    secondary: "#F5F3F0",
    accent: "#8B7355",
    background: "#FFFFFF",
  };
}
