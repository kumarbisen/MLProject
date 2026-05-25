/**
 * Multi-page static storefront HTML generator (Nalli-inspired minimal layout).
 */

export type StorefrontPalette = {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
};

export type StorefrontPageId = "home" | "shop" | "about" | "contact" | "product";

export type StorefrontPages = Record<StorefrontPageId, string>;

type Ctx = {
  storeName: string;
  niche: string;
  slug: string;
  palette: StorefrontPalette;
  name: string;
  label: string;
  base: string;
};

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildCtx(
  storeName: string,
  niche: string,
  palette: StorefrontPalette,
  slug: string
): Ctx {
  const nicheLabel =
    niche.charAt(0).toUpperCase() + niche.slice(1).toLowerCase();
  return {
    storeName,
    niche,
    slug,
    palette,
    name: esc(storeName),
    label: esc(nicheLabel),
    base: `/stores/${slug}`,
  };
}

function sharedStyles(c: Ctx, extra = ""): string {
  return `
    :root {
      --primary: ${c.palette.primary};
      --secondary: ${c.palette.secondary};
      --accent: ${c.palette.accent};
      --bg: ${c.palette.background};
      --text: #1a1a1a;
      --muted: #6b6560;
      --border: #e8e4df;
      --serif: 'Cormorant Garamond', Georgia, serif;
      --sans: 'DM Sans', system-ui, sans-serif;
      --container: min(1280px, 100% - 2rem);
      --header-h: 4.25rem;
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; -webkit-text-size-adjust: 100%; }
    body { font-family: var(--sans); background: var(--bg); color: var(--text); line-height: 1.5; font-size: 0.9375rem; }
    img { max-width: 100%; height: auto; display: block; }
    a { color: inherit; }
    button { font-family: inherit; cursor: pointer; }
    .announce { background: var(--primary); color: #fff; text-align: center; font-size: 0.6875rem; letter-spacing: 0.14em; text-transform: uppercase; padding: 0.5rem 1rem; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
    .site-header { position: sticky; top: 0; z-index: 200; background: var(--bg); border-bottom: 1px solid var(--border); }
    .header-inner { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; height: var(--header-h); gap: 1rem; padding: 0 clamp(1rem, 3vw, 2rem); max-width: 1280px; margin-inline: auto; }
    .header-left { display: flex; align-items: center; justify-self: start; }
    .menu-btn { display: flex; flex-direction: column; justify-content: center; gap: 5px; width: 2.25rem; height: 2.25rem; padding: 0.4rem; background: none; border: none; }
    .menu-btn span { display: block; height: 1px; background: var(--text); transition: transform 0.25s, opacity 0.25s; }
    .menu-btn[aria-expanded="true"] span:nth-child(1) { transform: translateY(6px) rotate(45deg); }
    .menu-btn[aria-expanded="true"] span:nth-child(2) { opacity: 0; }
    .menu-btn[aria-expanded="true"] span:nth-child(3) { transform: translateY(-6px) rotate(-45deg); }
    .logo { font-family: var(--serif); font-size: clamp(1.35rem, 4vw, 1.75rem); font-weight: 500; letter-spacing: 0.06em; text-decoration: none; color: var(--primary); justify-self: center; text-align: center; line-height: 1.2; }
    .header-right { display: flex; align-items: center; gap: 1.25rem; justify-self: end; }
    .icon-btn { background: none; border: none; padding: 0.25rem; color: var(--text); display: flex; align-items: center; gap: 0.35rem; font-size: 0.75rem; letter-spacing: 0.08em; text-transform: uppercase; }
    .icon-btn svg { width: 1.25rem; height: 1.25rem; stroke: currentColor; fill: none; stroke-width: 1.5; }
    .nav-desktop { display: none; border-top: 1px solid var(--border); background: var(--bg); }
    .nav-desktop ul { list-style: none; display: flex; justify-content: center; flex-wrap: wrap; gap: 0.25rem 2rem; padding: 0.85rem clamp(1rem, 3vw, 2rem); max-width: 1280px; margin-inline: auto; }
    .nav-desktop a { text-decoration: none; font-size: 0.6875rem; letter-spacing: 0.16em; text-transform: uppercase; color: var(--text); transition: color 0.2s; padding-bottom: 2px; border-bottom: 1px solid transparent; }
    .nav-desktop a:hover, .nav-desktop a.nav-active { color: var(--accent); border-bottom-color: var(--accent); }
    .nav-drawer { position: fixed; inset: 0; z-index: 300; pointer-events: none; visibility: hidden; }
    .nav-drawer.open { pointer-events: auto; visibility: visible; }
    .nav-backdrop { position: absolute; inset: 0; background: rgba(0,0,0,0.35); opacity: 0; transition: opacity 0.3s; }
    .nav-drawer.open .nav-backdrop { opacity: 1; }
    .nav-panel { position: absolute; top: 0; left: 0; width: min(320px, 85vw); height: 100%; background: var(--bg); padding: calc(var(--header-h) + 1.5rem) 1.5rem 2rem; transform: translateX(-100%); transition: transform 0.3s ease; overflow-y: auto; border-right: 1px solid var(--border); }
    .nav-drawer.open .nav-panel { transform: translateX(0); }
    .nav-panel ul { list-style: none; }
    .nav-panel li { border-bottom: 1px solid var(--border); }
    .nav-panel a { display: block; padding: 1rem 0; text-decoration: none; font-size: 0.8125rem; letter-spacing: 0.12em; text-transform: uppercase; }
    .nav-panel a.nav-active { color: var(--accent); }
    .hero { padding: clamp(2.5rem, 8vw, 5rem) clamp(1rem, 4vw, 2rem); text-align: center; background: var(--secondary); border-bottom: 1px solid var(--border); }
    .hero h1 { font-family: var(--serif); font-size: clamp(2rem, 6vw, 3.25rem); font-weight: 400; letter-spacing: 0.04em; color: var(--primary); margin-bottom: 0.75rem; }
    .hero p { font-size: clamp(0.875rem, 2vw, 1rem); color: var(--muted); max-width: 36rem; margin: 0 auto 1.75rem; line-height: 1.65; }
    .hero-cta, .btn-text { display: inline-block; font-size: 0.6875rem; letter-spacing: 0.18em; text-transform: uppercase; text-decoration: none; color: var(--text); border-bottom: 1px solid var(--text); padding-bottom: 2px; transition: color 0.2s, border-color 0.2s; background: none; border-top: none; border-left: none; border-right: none; cursor: pointer; }
    .hero-cta:hover, .btn-text:hover { color: var(--accent); border-color: var(--accent); }
    .page-banner { padding: clamp(2rem, 5vw, 3rem) clamp(1rem, 3vw, 2rem); text-align: center; border-bottom: 1px solid var(--border); }
    .page-banner h1 { font-family: var(--serif); font-size: clamp(1.75rem, 4vw, 2.5rem); font-weight: 500; color: var(--primary); }
    .page-banner p { color: var(--muted); font-size: 0.875rem; margin-top: 0.5rem; }
    .section { padding: clamp(2.5rem, 6vw, 4rem) clamp(1rem, 3vw, 2rem); }
    .section-head { text-align: center; margin-bottom: clamp(2rem, 5vw, 3rem); max-width: 40rem; margin-inline: auto; }
    .section-head h2 { font-family: var(--serif); font-size: clamp(1.5rem, 4vw, 2rem); font-weight: 500; margin-bottom: 0.5rem; color: var(--primary); }
    .section-head p { font-size: 0.875rem; color: var(--muted); line-height: 1.6; }
    .section-head-row { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 1rem; max-width: var(--container); margin: 0 auto clamp(1.5rem, 4vw, 2.5rem); padding-bottom: 1rem; border-bottom: 1px solid var(--border); }
    .section-head-row h2 { font-family: var(--serif); font-size: clamp(1.35rem, 3.5vw, 1.75rem); font-weight: 500; }
    .view-all { font-size: 0.6875rem; letter-spacing: 0.14em; text-transform: uppercase; text-decoration: none; border-bottom: 1px solid currentColor; }
    .products-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: clamp(1rem, 3vw, 1.75rem); max-width: var(--container); margin-inline: auto; }
    @media (min-width: 640px) { .products-grid { grid-template-columns: repeat(3, 1fr); } }
    @media (min-width: 1024px) { .products-grid { grid-template-columns: repeat(4, 1fr); } }
    .product-card { display: flex; flex-direction: column; text-decoration: none; color: inherit; }
    .product-media { position: relative; aspect-ratio: 3 / 4; overflow: hidden; background: var(--secondary); margin-bottom: 0.85rem; }
    .product-img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.5s ease; }
    .product-card:hover .product-img { transform: scale(1.03); }
    .product-quick { position: absolute; inset: auto 0 0 0; padding: 0.75rem; opacity: 0; transform: translateY(4px); transition: opacity 0.25s, transform 0.25s; }
    @media (hover: hover) { .product-card:hover .product-quick { opacity: 1; transform: translateY(0); } }
    .add-to-cart { width: 100%; padding: 0.65rem; background: var(--primary); color: #fff; border: none; font-size: 0.6875rem; letter-spacing: 0.14em; text-transform: uppercase; }
    .add-to-cart:hover { background: var(--accent); }
    .product-title { font-family: var(--serif); font-size: clamp(0.95rem, 2.5vw, 1.1rem); font-weight: 500; line-height: 1.35; margin-bottom: 0.35rem; }
    .product-price { font-size: 0.875rem; }
    .products-loading, .products-empty { grid-column: 1 / -1; text-align: center; color: var(--muted); padding: 3rem 1rem; font-size: 0.875rem; }
    .trust-strip { border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); background: var(--secondary); padding: 1.25rem clamp(1rem, 3vw, 2rem); }
    .trust-inner { max-width: var(--container); margin-inline: auto; display: flex; flex-wrap: wrap; justify-content: center; gap: 1.5rem 3rem; text-align: center; }
    .trust-item { font-size: 0.6875rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); }
    .trust-item strong { display: block; color: var(--text); font-weight: 500; margin-bottom: 0.2rem; }
    .content-narrow { max-width: 32rem; margin-inline: auto; text-align: center; color: var(--muted); font-size: 0.875rem; line-height: 1.7; }
    .contact-form { max-width: 28rem; margin: 2rem auto 0; text-align: left; }
    .contact-form label { display: block; font-size: 0.6875rem; letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 0.35rem; color: var(--muted); }
    .contact-form input, .contact-form textarea { width: 100%; padding: 0.75rem; border: 1px solid var(--border); margin-bottom: 1rem; font-family: inherit; font-size: 0.875rem; background: var(--bg); }
    .contact-form button { width: 100%; padding: 0.85rem; background: var(--primary); color: #fff; border: none; font-size: 0.6875rem; letter-spacing: 0.14em; text-transform: uppercase; }
    .breadcrumbs { max-width: var(--container); margin: 0 auto; padding: 1rem clamp(1rem, 3vw, 2rem) 0; font-size: 0.75rem; color: var(--muted); }
    .breadcrumbs a { text-decoration: none; }
    .breadcrumbs a:hover { color: var(--accent); }
    .breadcrumbs span { margin: 0 0.35rem; }
    .product-detail { max-width: var(--container); margin: 0 auto; padding: clamp(1.5rem, 4vw, 3rem) clamp(1rem, 3vw, 2rem); display: grid; gap: 2rem; }
    @media (min-width: 768px) { .product-detail { grid-template-columns: 1fr 1fr; gap: 3rem; align-items: start; } }
    .product-detail-gallery { aspect-ratio: 3 / 4; background: var(--secondary); overflow: hidden; }
    .product-detail-gallery img { width: 100%; height: 100%; object-fit: cover; }
    .product-detail-info h1 { font-family: var(--serif); font-size: clamp(1.5rem, 4vw, 2.25rem); font-weight: 500; margin-bottom: 0.75rem; line-height: 1.25; }
    .product-detail-price { font-size: 1.125rem; margin-bottom: 1.25rem; letter-spacing: 0.02em; }
    .product-detail-desc { color: var(--muted); font-size: 0.875rem; line-height: 1.7; margin-bottom: 1.5rem; }
    .product-detail-meta { font-size: 0.75rem; color: var(--muted); margin-bottom: 1.5rem; }
    .product-detail-actions { display: flex; flex-wrap: wrap; gap: 1rem; align-items: center; }
    .btn-primary { padding: 0.85rem 2rem; background: var(--primary); color: #fff; border: none; font-size: 0.6875rem; letter-spacing: 0.14em; text-transform: uppercase; }
    .btn-primary:hover { background: var(--accent); }
    .product-detail-loading, .product-detail-error { text-align: center; padding: 4rem 1rem; color: var(--muted); grid-column: 1 / -1; }
    footer { border-top: 1px solid var(--border); padding: clamp(2.5rem, 5vw, 4rem) clamp(1rem, 3vw, 2rem) 2rem; background: var(--secondary); margin-top: auto; }
    .footer-grid { display: grid; grid-template-columns: 1fr; gap: 2rem; max-width: var(--container); margin-inline: auto; }
    @media (min-width: 640px) { .footer-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (min-width: 900px) { .footer-grid { grid-template-columns: 2fr 1fr 1fr 1fr; } }
    .footer-brand .logo-footer { font-family: var(--serif); font-size: 1.5rem; color: var(--primary); margin-bottom: 0.75rem; display: block; text-decoration: none; }
    .footer-brand p { font-size: 0.8125rem; color: var(--muted); line-height: 1.6; max-width: 18rem; }
    .footer-col h4 { font-size: 0.6875rem; letter-spacing: 0.14em; text-transform: uppercase; margin-bottom: 1rem; font-weight: 500; }
    .footer-col ul { list-style: none; }
    .footer-col li { margin-bottom: 0.5rem; }
    .footer-col a { text-decoration: none; font-size: 0.8125rem; color: var(--muted); }
    .footer-col a:hover { color: var(--text); }
    .footer-bottom { max-width: var(--container); margin: 2.5rem auto 0; padding-top: 1.5rem; border-top: 1px solid var(--border); text-align: center; font-size: 0.75rem; color: var(--muted); }
    .footer-bottom a { color: var(--accent); }
    .cart-drawer { position: fixed; inset: 0; z-index: 400; pointer-events: none; visibility: hidden; }
    .cart-drawer.open { pointer-events: auto; visibility: visible; }
    .cart-panel { position: absolute; top: 0; right: 0; width: min(400px, 100%); height: 100%; background: var(--bg); transform: translateX(100%); transition: transform 0.3s ease; display: flex; flex-direction: column; border-left: 1px solid var(--border); }
    .cart-drawer.open .cart-panel { transform: translateX(0); }
    .cart-header { display: flex; align-items: center; justify-content: space-between; padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--border); }
    .cart-header h3 { font-family: var(--serif); font-size: 1.25rem; font-weight: 500; }
    .close-btn { background: none; border: none; font-size: 1.5rem; color: var(--muted); }
    .cart-body { flex: 1; overflow-y: auto; padding: 1.5rem; }
    .cart-empty { text-align: center; color: var(--muted); font-size: 0.875rem; padding: 2rem 0; }
    .cart-item { display: flex; justify-content: space-between; gap: 1rem; padding: 0.75rem 0; border-bottom: 1px solid var(--border); font-size: 0.875rem; }
    .cart-footer { padding: 1.25rem 1.5rem; border-top: 1px solid var(--border); }
    .checkout-note { font-size: 0.75rem; color: var(--muted); text-align: center; margin-top: 0.75rem; }
    body { min-height: 100vh; display: flex; flex-direction: column; }
    main { flex: 1; }
    @media (min-width: 900px) { .menu-btn { display: none; } .nav-desktop { display: block; } }
    ${extra}
  `;
}

function navActive(active: StorefrontPageId, page: StorefrontPageId): string {
  return active === page ? "nav-active" : "";
}

function headerHtml(c: Ctx, active: StorefrontPageId): string {
  const homeUrl = `${c.base}/preview`;
  return `
  <div class="announce">Free shipping on orders over $75 · Curated ${c.label.toLowerCase()} collection</div>
  <header class="site-header">
    <div class="header-inner">
      <div class="header-left">
        <button class="menu-btn" id="menu-btn" type="button" aria-label="Open menu" aria-expanded="false">
          <span></span><span></span><span></span>
        </button>
      </div>
      <a href="${homeUrl}" class="logo">${c.name}</a>
      <div class="header-right">
        <button class="icon-btn" type="button" aria-label="Account">
          <svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </button>
        <button class="icon-btn" id="cart-open" type="button" aria-label="Open cart">
          <svg viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
          <span class="cart-count" id="cart-count">0</span>
        </button>
      </div>
    </div>
    <nav class="nav-desktop" aria-label="Main">
      <ul>
        <li><a href="${homeUrl}" class="${navActive(active, "home")}">Home</a></li>
        <li><a href="${c.base}/shop" class="${navActive(active, "shop")}">Shop All</a></li>
        <li><a href="${c.base}/about" class="${navActive(active, "about")}">Our Story</a></li>
        <li><a href="${c.base}/contact" class="${navActive(active, "contact")}">Contact</a></li>
      </ul>
    </nav>
  </header>
  <div class="nav-drawer" id="nav-drawer" aria-hidden="true">
    <div class="nav-backdrop" id="nav-backdrop"></div>
    <nav class="nav-panel" aria-label="Mobile">
      <ul>
        <li><a href="${homeUrl}" class="nav-link ${navActive(active, "home")}">Home</a></li>
        <li><a href="${c.base}/shop" class="nav-link ${navActive(active, "shop")}">Shop All</a></li>
        <li><a href="${c.base}/about" class="nav-link ${navActive(active, "about")}">Our Story</a></li>
        <li><a href="${c.base}/contact" class="nav-link ${navActive(active, "contact")}">Contact</a></li>
      </ul>
    </nav>
  </div>`;
}

function footerHtml(c: Ctx): string {
  const y = new Date().getFullYear();
  return `
  <footer>
    <div class="footer-grid">
      <div class="footer-brand">
        <a href="${c.base}/preview" class="logo-footer">${c.name}</a>
        <p>Premium ${c.label.toLowerCase()} for the modern shopper.</p>
      </div>
      <div class="footer-col">
        <h4>Shop</h4>
        <ul>
          <li><a href="${c.base}/preview">Home</a></li>
          <li><a href="${c.base}/shop">Shop All</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <h4>Help</h4>
        <ul>
          <li><a href="${c.base}/contact">Contact</a></li>
          <li><a href="#">Shipping</a></li>
          <li><a href="#">Returns</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <h4>Company</h4>
        <ul>
          <li><a href="${c.base}/about">Our Story</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <p>&copy; ${y} ${c.name} · Powered by <a href="#">locoai</a></p>
    </div>
  </footer>`;
}

function cartHtml(): string {
  return `
  <div class="cart-drawer" id="cart-drawer" aria-hidden="true">
    <div class="nav-backdrop" id="cart-backdrop"></div>
    <div class="cart-panel">
      <div class="cart-header">
        <h3>Shopping bag</h3>
        <button class="close-btn" id="cart-close" type="button" aria-label="Close cart">&times;</button>
      </div>
      <div class="cart-body" id="cart-items"><p class="cart-empty">Your bag is empty</p></div>
      <div class="cart-footer"><p class="checkout-note">Secure checkout via Locus Pay</p></div>
    </div>
  </div>`;
}

function coreScripts(c: Ctx): string {
  return `
  <script>
  (function () {
    var slug = ${JSON.stringify(c.slug)};
    var CART_KEY = 'locus_cart_' + slug;
    var cart = [];
    try { cart = JSON.parse(localStorage.getItem(CART_KEY) || '[]'); } catch (e) { cart = []; }

    function escHtml(s) {
      return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }
    function escAttr(s) { return escHtml(s).replace(/'/g,'&#39;'); }
    function productUrl(id) {
      return ${JSON.stringify(c.base)} + '/product/' + encodeURIComponent(id);
    }

    function saveCart() { localStorage.setItem(CART_KEY, JSON.stringify(cart)); }
    function updateCartUI() {
      var el = document.getElementById('cart-count');
      if (el) el.textContent = String(cart.length);
      var body = document.getElementById('cart-items');
      if (!body) return;
      if (!cart.length) { body.innerHTML = '<p class="cart-empty">Your bag is empty</p>'; return; }
      body.innerHTML = cart.map(function (item) {
        return '<div class="cart-item"><span>' + escHtml(item.title) + '</span><span>$' + item.price.toFixed(2) + '</span></div>';
      }).join('');
    }
    window.addToCart = function (id, title, price, e) {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      cart.push({ id: id, title: title, price: price });
      saveCart();
      updateCartUI();
      var d = document.getElementById('cart-drawer');
      if (d) { d.classList.add('open'); d.setAttribute('aria-hidden','false'); document.body.style.overflow = 'hidden'; }
    };

    function openDrawer(el) { el.classList.add('open'); el.setAttribute('aria-hidden','false'); document.body.style.overflow = 'hidden'; }
    function closeDrawer(el) { el.classList.remove('open'); el.setAttribute('aria-hidden','true'); document.body.style.overflow = ''; }

    var menuBtn = document.getElementById('menu-btn');
    var navDrawer = document.getElementById('nav-drawer');
    if (menuBtn && navDrawer) {
      menuBtn.addEventListener('click', function () {
        var open = navDrawer.classList.toggle('open');
        menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
        navDrawer.setAttribute('aria-hidden', open ? 'false' : 'true');
        document.body.style.overflow = open ? 'hidden' : '';
      });
      var nb = document.getElementById('nav-backdrop');
      if (nb) nb.addEventListener('click', function () { closeDrawer(navDrawer); menuBtn.setAttribute('aria-expanded','false'); });
      document.querySelectorAll('.nav-link').forEach(function (a) {
        a.addEventListener('click', function () { closeDrawer(navDrawer); menuBtn.setAttribute('aria-expanded','false'); });
      });
    }
    var cartDrawer = document.getElementById('cart-drawer');
    var cartOpen = document.getElementById('cart-open');
    if (cartOpen && cartDrawer) {
      cartOpen.addEventListener('click', function () { openDrawer(cartDrawer); });
      var cc = document.getElementById('cart-close');
      var cb = document.getElementById('cart-backdrop');
      if (cc) cc.addEventListener('click', function () { closeDrawer(cartDrawer); });
      if (cb) cb.addEventListener('click', function () { closeDrawer(cartDrawer); });
    }

    window.renderProductCard = function (p) {
      var img = (p.images && p.images[0]) ? p.images[0] : '';
      var price = Number(p.suggestedRetailPrice) || 0;
      var id = String(p.supplierId || '');
      var title = escHtml(p.title || 'Product');
      var url = productUrl(id);
      return (
        '<a href="' + escAttr(url) + '" class="product-card">' +
          '<div class="product-media">' +
            '<img class="product-img" src="' + escAttr(img) + '" alt="' + title + '" loading="lazy" />' +
            '<div class="product-quick">' +
              '<button type="button" class="add-to-cart" data-id="' + escAttr(id) + '" data-title="' + escAttr(p.title || '') + '" data-price="' + price + '">Add to bag</button>' +
            '</div>' +
          '</div>' +
          '<h3 class="product-title">' + title + '</h3>' +
          '<p class="product-price">$' + price.toFixed(2) + '</p>' +
        '</a>'
      );
    };

    window.bindProductGrid = function (root) {
      if (!root) return;
      root.querySelectorAll('.add-to-cart').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          addToCart(btn.dataset.id, btn.dataset.title, parseFloat(btn.dataset.price), e);
        });
      });
    };

    updateCartUI();
  })();
  </script>`;
}

function shell(
  c: Ctx,
  opts: {
    active: StorefrontPageId;
    title: string;
    description: string;
    main: string;
    extraScripts?: string;
  }
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${opts.title} — ${c.name}</title>
  <meta name="description" content="${opts.description}" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap" rel="stylesheet" />
  <style>${sharedStyles(c)}</style>
</head>
<body>
${headerHtml(c, opts.active)}
<main>${opts.main}</main>
${footerHtml(c)}
${cartHtml()}
${coreScripts(c)}
${opts.extraScripts ?? ""}
</body>
</html>`;
}

function productGridLoader(c: Ctx, limit: number | null): string {
  const slice = limit != null ? `products = products.slice(0, ${limit});` : "";
  return `
  <script>
  document.addEventListener('DOMContentLoaded', async function () {
    var grid = document.getElementById('products-grid');
    if (!grid || typeof renderProductCard !== 'function') return;
    var m = window.location.pathname.match(/\\/stores\\/([^/]+)/);
    var storeSlug = m ? m[1] : ${JSON.stringify(c.slug)};
    try {
      var res = await fetch('/api/stores/' + storeSlug + '/products');
      var data = await res.json();
      var products = data.products || [];
      ${slice}
      if (!products.length) {
        grid.innerHTML = '<p class="products-empty">New arrivals coming soon.</p>';
        return;
      }
      grid.innerHTML = products.map(renderProductCard).join('');
      bindProductGrid(grid);
    } catch (e) {
      grid.innerHTML = '<p class="products-empty">Unable to load products.</p>';
    }
  });
  </script>`;
}

function productDetailLoader(c: Ctx): string {
  return `
  <script>
  document.addEventListener('DOMContentLoaded', async function () {
    var root = document.getElementById('product-detail-root');
    if (!root) return;
    var parts = window.location.pathname.split('/product/');
    var productId = parts.length > 1 ? decodeURIComponent(parts[1].replace(/\\/$/, '')) : '';
    var m = window.location.pathname.match(/\\/stores\\/([^/]+)/);
    var storeSlug = m ? m[1] : ${JSON.stringify(c.slug)};
    if (!productId) {
      root.innerHTML = '<p class="product-detail-error">Product not found.</p>';
      return;
    }
    try {
      var res = await fetch('/api/stores/' + storeSlug + '/products/' + encodeURIComponent(productId));
      if (!res.ok) throw new Error('not found');
      var p = await res.json();
      var img = (p.images && p.images[0]) ? p.images[0] : '';
      var price = Number(p.suggestedRetailPrice) || 0;
      var title = p.title || 'Product';
      var id = String(p.supplierId || productId);
      document.title = title + ' — ${c.name}';
      var crumb = document.getElementById('breadcrumb-current');
      if (crumb) crumb.textContent = title;
      root.innerHTML =
        '<div class="product-detail-gallery"><img src="' + img.replace(/"/g,'&quot;') + '" alt="" id="pd-image" /></div>' +
        '<div class="product-detail-info">' +
          '<h1>' + title.replace(/</g,'&lt;') + '</h1>' +
          '<p class="product-detail-price">$' + price.toFixed(2) + '</p>' +
          '<p class="product-detail-desc">' + (p.description || '').replace(/</g,'&lt;') + '</p>' +
          '<p class="product-detail-meta">Ships in ' + (p.shippingDays || '—') + ' days · ' + (p.category || '') + '</p>' +
          '<div class="product-detail-actions">' +
            '<button type="button" class="btn-primary" id="pd-add">Add to bag</button>' +
            '<a href="${c.base}/shop" class="btn-text">Continue shopping</a>' +
          '</div>' +
        '</div>';
      document.getElementById('pd-add').addEventListener('click', function () {
        addToCart(id, title, price);
      });
    } catch (e) {
      root.innerHTML = '<p class="product-detail-error">Product not found. <a href="${c.base}/shop">Back to shop</a></p>';
    }
  });
  </script>`;
}

function pageHome(c: Ctx): string {
  return shell(c, {
    active: "home",
    title: "Home",
    description: `Discover curated ${c.label.toLowerCase()} at ${c.name}.`,
    main: `
    <section class="hero">
      <h1>${c.name}</h1>
      <p>Fresh picks, added regularly — discover hand-selected ${c.label.toLowerCase()} crafted for you.</p>
      <a href="${c.base}/shop" class="hero-cta">Shop the collection</a>
    </section>
    <section class="section">
      <div class="section-head-row">
        <h2>Featured products</h2>
        <a href="${c.base}/shop" class="view-all">View all</a>
      </div>
      <div class="products-grid" id="products-grid"><p class="products-loading">Loading collection…</p></div>
    </section>
    <div class="trust-strip"><div class="trust-inner">
      <div class="trust-item"><strong>Secure checkout</strong> Locus Pay</div>
      <div class="trust-item"><strong>Free returns</strong> Within 30 days</div>
      <div class="trust-item"><strong>Fast delivery</strong> Tracked shipping</div>
    </div></div>`,
    extraScripts: productGridLoader(c, 4),
  });
}

function pageShop(c: Ctx): string {
  return shell(c, {
    active: "shop",
    title: "Shop All",
    description: `Browse all ${c.label.toLowerCase()} at ${c.name}.`,
    main: `
    <div class="page-banner">
      <h1>Shop All</h1>
      <p>Explore our full collection of ${c.label.toLowerCase()}</p>
    </div>
    <section class="section">
      <div class="products-grid" id="products-grid"><p class="products-loading">Loading collection…</p></div>
    </section>`,
    extraScripts: productGridLoader(c, null),
  });
}

function pageAbout(c: Ctx): string {
  return shell(c, {
    active: "about",
    title: "Our Story",
    description: `Learn about ${c.name}.`,
    main: `
    <div class="page-banner"><h1>Our Story</h1></div>
    <section class="section">
      <div class="section-head">
        <h2>Crafted with care</h2>
        <p class="content-narrow">${c.name} brings together the finest ${c.label.toLowerCase()} — thoughtfully sourced, quality assured, and delivered with care. Every piece is selected to meet our standards for craftsmanship and value.</p>
      </div>
    </section>
    <div class="trust-strip"><div class="trust-inner">
      <div class="trust-item"><strong>Since 2025</strong> Trusted quality</div>
      <div class="trust-item"><strong>Curated</strong> Hand-selected items</div>
    </div></div>`,
  });
}

function pageContact(c: Ctx): string {
  return shell(c, {
    active: "contact",
    title: "Contact",
    description: `Get in touch with ${c.name}.`,
    main: `
    <div class="page-banner"><h1>Contact Us</h1><p>We typically respond within 24 hours</p></div>
    <section class="section">
      <div class="content-narrow">
        <p>Questions about your order, shipping, or our collection? Send us a message.</p>
        <form class="contact-form" onsubmit="event.preventDefault(); alert('Thank you — we will be in touch soon.');">
          <label for="name">Name</label>
          <input id="name" name="name" type="text" required />
          <label for="email">Email</label>
          <input id="email" name="email" type="email" required />
          <label for="message">Message</label>
          <textarea id="message" name="message" rows="4" required></textarea>
          <button type="submit">Send message</button>
        </form>
      </div>
    </section>`,
  });
}

function pageProduct(c: Ctx): string {
  return shell(c, {
    active: "shop",
    title: "Product",
    description: `Product details at ${c.name}.`,
    main: `
    <nav class="breadcrumbs" aria-label="Breadcrumb">
      <a href="${c.base}/preview">Home</a><span>/</span>
      <a href="${c.base}/shop">Shop</a><span>/</span>
      <span id="breadcrumb-current">Product</span>
    </nav>
    <div class="product-detail" id="product-detail-root">
      <p class="product-detail-loading">Loading product…</p>
    </div>`,
    extraScripts: productDetailLoader(c),
  });
}

export function generateAllStorefrontPages(
  storeName: string,
  niche: string,
  palette: StorefrontPalette,
  slug: string
): StorefrontPages {
  const c = buildCtx(storeName, niche, palette, slug);
  return {
    home: pageHome(c),
    shop: pageShop(c),
    about: pageAbout(c),
    contact: pageContact(c),
    product: pageProduct(c),
  };
}

/** @deprecated Use generateAllStorefrontPages().home */
export function generateStorefrontHTML(
  storeName: string,
  niche: string,
  palette: StorefrontPalette,
  slug: string
): string {
  return generateAllStorefrontPages(storeName, niche, palette, slug).home;
}
