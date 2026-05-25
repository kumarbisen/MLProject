/**
 * db/inMemoryStore.ts
 *
 * Simple in-memory data store for development.
 * In production, swap this for Prisma + PostgreSQL or Supabase.
 */
import type { Product } from "../tools/sourceProducts.js";
import type { Listing } from "../tools/writeListings.js";
import type { StorefrontPageId, StorefrontPages } from "../storefront/pages.js";

export interface StoreRecord {
  storeId: string;
  storeName: string;
  slug: string;
  niche: string;
  ownerTelegramId: string;
  ownerUserId?: string;
  colorPalette: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
  };
  products: Product[];
  listings: Listing[];
  locusConfig?: {
    locusClientId: string;
    checkoutWebhookUrl: string;
    trackingPageUrl: string;
    checkoutEmbedSnippet: string;
    shippingZones: Array<{
      region: string;
      carrier: string;
      estimatedDays: string;
      freeShippingThreshold?: number;
    }>;
  };
  payoutConfig?: {
    ownerStripeAccountId: string;
    platformFeePercent: number;
    ownerSharePercent: number;
    payoutSchedule: string;
    currency: string;
    minimumPayoutUsd: number;
    webhookEndpoint: string;
  };
  createdAt: string;
  status:
    | "building"
    | "products_sourced"
    | "listings_written"
    | "checkout_integrated"
    | "payouts_configured"
    | "live";
}

class InMemoryStore {
  stores: Map<string, StoreRecord> = new Map();
  /** @deprecated Use storefrontPages — kept for backward compatibility (home page). */
  storefrontHTML: Map<string, string> = new Map();
  storefrontPages: Map<string, StorefrontPages> = new Map();

  setStorefrontPages(storeId: string, pages: StorefrontPages): void {
    this.storefrontPages.set(storeId, pages);
    this.storefrontHTML.set(storeId, pages.home);
  }

  getStorefrontPage(
    storeId: string,
    page: StorefrontPageId
  ): string | undefined {
    return this.storefrontPages.get(storeId)?.[page];
  }

  /** Returns all stores as an array, newest first */
  listStores(): StoreRecord[] {
    return Array.from(this.stores.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /** Find a store by its slug */
  findBySlug(slug: string): StoreRecord | undefined {
    return Array.from(this.stores.values()).find((s) => s.slug === slug);
  }

  /** Find a store by owner Telegram ID */
  findByOwner(telegramId: string): StoreRecord[] {
    return Array.from(this.stores.values()).filter(
      (s) => s.ownerTelegramId === telegramId
    );
  }

  /** Find stores linked to a dashboard user */
  findByUserId(userId: string): StoreRecord[] {
    return Array.from(this.stores.values()).filter(
      (s) => s.ownerUserId === userId
    );
  }
}

// Singleton instance shared across the process
export const storeDB = new InMemoryStore();
