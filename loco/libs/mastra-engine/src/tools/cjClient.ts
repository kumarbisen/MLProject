/**
 * cjClient.ts
 *
 * Lightweight CJ Dropshipping helper. Attempts a best-effort product search
 * against a configured CJ API. Returns an array of normalized product objects
 * or an empty array when CJ is not configured or the request fails.
 */
import axios from "axios";

// Provide a lightweight declaration for `process.env` so this file
// compiles even if the consuming tsconfig doesn't include Node types.
declare const process: { env: Record<string, string | undefined> };

export type CJProduct = {
  supplierId: string;
  title: string;
  description: string;
  costPrice: number;
  images: string[];
  category?: string;
  tags?: string[];
  moq?: number;
  shippingDays?: number;
  rating?: number;
  reviewCount?: number;
};

export async function searchCJProducts(niche: string, limit: number): Promise<CJProduct[]> {
  const key = process.env.CJ_API_KEY;
  if (!key) return [];

  const base = process.env.CJ_API_BASE_URL || "https://developers.cjdropshipping.com/api2.0";

  try {
    const res = await axios.get(`${base}/products/search`, {
      params: { keyword: niche, page: 1, pageSize: limit },
      headers: { Authorization: `Bearer ${key}` },
      timeout: 5000,
    });

    const items = res.data?.data || res.data?.items || res.data?.products || [];
    if (!Array.isArray(items)) return [];

    return items.map((it: any) => ({
      supplierId:
        it.sku || (it.productId && String(it.productId)) || it.id || (it.productNumber && String(it.productNumber)) || "",
      title: it.title || it.name || it.productName || "",
      description: it.description || it.introduction || it.introduce || "",
      costPrice: parseFloat(String(it.skuPrice || it.price || it.supplierPrice || it.cost || 0)) || 0,
      images: Array.isArray(it.images) ? it.images : it.imgList || it.imageList || (it.picUrl ? [it.picUrl] : []),
      category: it.categoryName || it.category || undefined,
      tags: it.tags || [],
      moq: it.moq || it.minOrder || 1,
      shippingDays: it.shipDays || it.deliveryTime || undefined,
      rating: it.rating ? parseFloat(String(it.rating)) : undefined,
      reviewCount: it.reviewCount ?? undefined,
    }));
  } catch (err) {
    return [];
  }
}
