/**
 * tools/buildStorefront.ts
 *
 * Generates a complete, production-ready HTML/CSS storefront for
 * a given niche. Writes the store into the database / in-memory store
 * and returns a store ID + preview URL so the workflow can proceed.
 */
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import slugify from "slugify";
import { storeDB } from "../db/inMemoryStore.js";

// ── Tool ──────────────────────────────────────────────────────────────────────

export const buildStorefrontTool = createTool({
  id: "build-storefront",
  description:
    "Creates a complete storefront for the niche: generates a store name, " +
    "colour palette, navigation structure, homepage hero, and product grid layout. " +
    "Persists the store record and returns a storeId and previewUrl.",
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

    // 1. Generate brand identity
    const cleanNiche = niche.replace(/(dropshipping|store|shop)/gi, "").trim();
    const storeName = generateStoreName(cleanNiche);
    const slug = slugify(storeName, { lower: true, strict: true });
    const palette = generatePalette(cleanNiche);

    // 2. Persist to in-memory store (swap for Prisma / Supabase in prod)
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

    // 3. Generate static HTML storefront
    const html = generateStorefrontHTML(storeName, cleanNiche, palette, slug);
    storeDB.storefrontHTML.set(storeId, html);

    const previewUrl = `http://localhost:3001/stores/${slug}/preview`;

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
  // Simple niche → colour heuristic
  if (niche.toLowerCase().includes("pet")) {
    return {
      primary: "#FF6B35",
      secondary: "#FFF3E0",
      accent: "#4CAF50",
      background: "#FAFAFA",
    };
  }
  return {
    primary: "#6C63FF",
    secondary: "#F3F0FF",
    accent: "#FF6584",
    background: "#FFFFFF",
  };
}

function generateStorefrontHTML(
  storeName: string,
  niche: string,
  palette: ReturnType<typeof generatePalette>,
  slug: string
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${storeName} — Premium ${niche} Products</title>
  <meta name="description" content="Shop the best ${niche} products at ${storeName}. Free shipping, curated selection, and fast delivery." />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap" rel="stylesheet" />
  <style>
    :root {
      --primary: ${palette.primary};
      --secondary: ${palette.secondary};
      --accent: ${palette.accent};
      --bg: ${palette.background};
      --text: #1a1a2e;
      --muted: #6b7280;
      --radius: 12px;
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', sans-serif; background: var(--bg); color: var(--text); }

    /* NAV */
    nav {
      display: flex; align-items: center; justify-content: space-between;
      padding: 1rem 2rem; background: #fff; box-shadow: 0 2px 12px rgba(0,0,0,.06);
      position: sticky; top: 0; z-index: 100;
    }
    .logo { font-size: 1.4rem; font-weight: 900; color: var(--primary); }
    .nav-links { display: flex; gap: 2rem; list-style: none; }
    .nav-links a { text-decoration: none; color: var(--text); font-weight: 600; transition: color .2s; }
    .nav-links a:hover { color: var(--primary); }
    .cart-btn {
      background: var(--primary); color: #fff; border: none; padding: .6rem 1.4rem;
      border-radius: 50px; font-weight: 700; cursor: pointer; transition: transform .15s;
    }
    .cart-btn:hover { transform: scale(1.05); }

    /* HERO */
    .hero {
      background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
      color: #fff; padding: 5rem 2rem; text-align: center;
    }
    .hero h1 { font-size: clamp(2rem, 5vw, 4rem); font-weight: 900; margin-bottom: 1rem; }
    .hero p { font-size: 1.2rem; opacity: .9; max-width: 600px; margin: 0 auto 2rem; }
    .hero-cta {
      background: #fff; color: var(--primary); padding: .9rem 2.5rem;
      border-radius: 50px; font-weight: 700; font-size: 1.1rem; text-decoration: none;
      display: inline-block; transition: transform .2s;
    }
    .hero-cta:hover { transform: translateY(-3px); }

    /* PRODUCTS */
    .section { padding: 4rem 2rem; max-width: 1200px; margin: 0 auto; }
    .section-title { font-size: 2rem; font-weight: 800; text-align: center; margin-bottom: .5rem; }
    .section-subtitle { text-align: center; color: var(--muted); margin-bottom: 3rem; }
    .products-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 2rem;
    }
    .product-card {
      background: #fff; border-radius: var(--radius); overflow: hidden;
      box-shadow: 0 4px 20px rgba(0,0,0,.08); transition: transform .2s, box-shadow .2s;
    }
    .product-card:hover { transform: translateY(-6px); box-shadow: 0 12px 32px rgba(0,0,0,.14); }
    .product-img { width: 100%; height: 220px; object-fit: cover; background: var(--secondary); }
    .product-body { padding: 1.2rem; }
    .product-title { font-weight: 700; margin-bottom: .4rem; }
    .product-desc { font-size: .875rem; color: var(--muted); margin-bottom: 1rem; line-height: 1.5; }
    .product-footer { display: flex; align-items: center; justify-content: space-between; }
    .product-price { font-size: 1.3rem; font-weight: 900; color: var(--primary); }
    .add-to-cart {
      background: var(--primary); color: #fff; border: none; padding: .5rem 1.2rem;
      border-radius: 50px; cursor: pointer; font-weight: 600; transition: transform .15s;
    }
    .add-to-cart:hover { transform: scale(1.05); }

    /* CHECKOUT BANNER */
    .checkout-banner {
      background: var(--secondary); border-left: 5px solid var(--primary);
      padding: 1.5rem 2rem; border-radius: var(--radius); margin: 2rem auto;
      max-width: 1200px; display: flex; align-items: center; gap: 1rem;
    }
    .checkout-icon { font-size: 2rem; }
    .checkout-text h3 { font-weight: 700; margin-bottom: .25rem; }
    .checkout-text p { color: var(--muted); font-size: .9rem; }

    /* FOOTER */
    footer {
      background: var(--text); color: #fff; text-align: center;
      padding: 2rem; margin-top: 4rem;
    }
    footer a { color: var(--accent); text-decoration: none; }
  </style>
</head>
<body>

  <!-- Navigation -->
  <nav>
    <div class="logo">🐾 ${storeName}</div>
    <ul class="nav-links">
      <li><a href="#products">Products</a></li>
      <li><a href="#about">About</a></li>
      <li><a href="#contact">Contact</a></li>
    </ul>
    <button class="cart-btn" id="cart-btn">🛒 Cart (0)</button>
  </nav>

  <!-- Hero -->
  <section class="hero">
    <h1>Premium ${niche.charAt(0).toUpperCase() + niche.slice(1)} — Delivered Fast</h1>
    <p>Curated, high-quality products with free worldwide shipping. Your one-stop shop for everything ${niche}.</p>
    <a href="#products" class="hero-cta">Shop Now →</a>
  </section>

  <!-- Products -->
  <section class="section" id="products">
    <h2 class="section-title">Featured Products</h2>
    <p class="section-subtitle">Hand-picked bestsellers, updated weekly</p>
    <div class="products-grid" id="products-grid">
      <!-- Injected by JS from /api/stores/${slug}/products -->
    </div>
  </section>

  <!-- Locus Checkout Banner -->
  <div class="checkout-banner">
    <div class="checkout-icon">🔒</div>
    <div class="checkout-text">
      <h3>Secure Checkout via Locus Pay</h3>
      <p>All payments are processed securely. Lightning-fast delivery tracked in real-time.</p>
    </div>
  </div>

  <!-- Footer -->
  <footer>
    <p>© 2025 ${storeName} · Powered by <a href="#">LocusFounder</a></p>
  </footer>

  <script>
    // ── Fetch & Render Products ──────────────────────────────────────────────
    async function loadProducts() {
      const grid = document.getElementById('products-grid');
      try {
        const res = await fetch('/api/stores/${slug}/products');
        const data = await res.json();
        grid.innerHTML = data.products.map(p => \`
          <div class="product-card">
            <img class="product-img" src="\${p.images[0]}" alt="\${p.title}" />
            <div class="product-body">
              <div class="product-title">\${p.title}</div>
              <div class="product-desc">\${p.description}</div>
              <div class="product-footer">
                <div class="product-price">$\${p.suggestedRetailPrice.toFixed(2)}</div>
                <button class="add-to-cart" onclick="addToCart('\${p.supplierId}', '\${p.title}', \${p.suggestedRetailPrice})">
                  Add to Cart
                </button>
              </div>
            </div>
          </div>
        \`).join('');
      } catch (e) {
        grid.innerHTML = '<p style="color:#999;text-align:center;grid-column:1/-1">Products loading…</p>';
      }
    }

    // ── Cart ────────────────────────────────────────────────────────────────
    let cart = [];
    function addToCart(id, title, price) {
      cart.push({ id, title, price });
      document.getElementById('cart-btn').textContent = \`🛒 Cart (\${cart.length})\`;
    }

    loadProducts();
  </script>
</body>
</html>`;
}
