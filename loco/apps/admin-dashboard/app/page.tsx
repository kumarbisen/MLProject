/**
 * app/page.tsx — LocusFounder Admin Dashboard
 *
 * Shows all stores, their status, and allows triggering new builds.
 */
"use client";

import { useState, useEffect } from "react";
import styles from "./page.module.css";

interface StoreRecord {
  storeId: string;
  storeName: string;
  slug: string;
  niche: string;
  status: string;
  productCount: number;
  listingCount: number;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  building: "#f59e0b",
  products_sourced: "#3b82f6",
  listings_written: "#8b5cf6",
  checkout_integrated: "#06b6d4",
  payouts_configured: "#10b981",
  live: "#22c55e",
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export default function Dashboard() {
  const [stores, setStores] = useState<StoreRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [building, setBuilding] = useState(false);
  const [nichePrompt, setNichePrompt] = useState("");
  const [ownerTelegramId, setOwnerTelegramId] = useState("");
  const [buildMessage, setBuildMessage] = useState("");

  useEffect(() => {
    fetchStores();
    const interval = setInterval(fetchStores, 5000); // poll every 5s
    return () => clearInterval(interval);
  }, []);

  async function fetchStores() {
    try {
      const res = await fetch(`${API_URL}/api/stores`);
      const data = await res.json();
      setStores(data.stores ?? []);
    } catch {
      // API not running yet
    } finally {
      setLoading(false);
    }
  }

  async function handleBuild(e: React.FormEvent) {
    e.preventDefault();
    if (!nichePrompt.trim() || !ownerTelegramId.trim()) return;

    setBuilding(true);
    setBuildMessage("");

    try {
      const res = await fetch(`${API_URL}/api/build`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nichePrompt: nichePrompt.trim(),
          ownerTelegramId: ownerTelegramId.trim(),
          productLimit: 5,
          platformFeePercent: 10,
          payoutSchedule: "weekly",
        }),
      });
      const data = await res.json();
      setBuildMessage(`✅ Workflow started for "${nichePrompt}"`);
      setNichePrompt("");
      setTimeout(fetchStores, 2000);
    } catch {
      setBuildMessage("❌ Failed to connect to API server. Is it running?");
    } finally {
      setBuilding(false);
    }
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.logo}>
            <span className={styles.logoIcon}>🏗️</span>
            <div>
              <h1 className={styles.logoTitle}>LocusFounder</h1>
              <p className={styles.logoSub}>Autonomous Storefront Builder</p>
            </div>
          </div>
          <div className={styles.headerStats}>
            <div className={styles.stat}>
              <span className={styles.statValue}>{stores.length}</span>
              <span className={styles.statLabel}>Total Stores</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>
                {stores.filter((s) => s.status === "live").length}
              </span>
              <span className={styles.statLabel}>Live</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>
                {stores.reduce((sum, s) => sum + (s.productCount ?? 0), 0)}
              </span>
              <span className={styles.statLabel}>Products</span>
            </div>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        {/* Build Form */}
        <section className={styles.buildSection}>
          <div className={styles.buildCard}>
            <h2 className={styles.buildTitle}>🚀 Launch New Store</h2>
            <p className={styles.buildDesc}>
              Enter a niche and we'll build a complete dropshipping store — fully automated.
            </p>
            <form onSubmit={handleBuild} className={styles.buildForm}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Niche Prompt</label>
                  <input
                    id="niche-input"
                    className={styles.input}
                    type="text"
                    placeholder='e.g. "pet accessory dropshipping store"'
                    value={nichePrompt}
                    onChange={(e) => setNichePrompt(e.target.value)}
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Owner Telegram ID</label>
                  <input
                    id="telegram-id-input"
                    className={styles.input}
                    type="text"
                    placeholder="e.g. 123456789"
                    value={ownerTelegramId}
                    onChange={(e) => setOwnerTelegramId(e.target.value)}
                    required
                  />
                </div>
                <button
                  id="build-btn"
                  type="submit"
                  className={styles.buildBtn}
                  disabled={building}
                >
                  {building ? "⏳ Building..." : "Build Store →"}
                </button>
              </div>
              {buildMessage && (
                <p className={styles.buildMessage}>{buildMessage}</p>
              )}
            </form>
          </div>
        </section>

        {/* Stores Grid */}
        <section className={styles.storesSection}>
          <h2 className={styles.sectionTitle}>Your Stores</h2>

          {loading ? (
            <div className={styles.loading}>Loading stores...</div>
          ) : stores.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No stores yet. Build your first one above! 👆</p>
            </div>
          ) : (
            <div className={styles.storesGrid}>
              {stores.map((store) => (
                <div key={store.storeId} className={styles.storeCard}>
                  <div className={styles.storeCardHeader}>
                    <h3 className={styles.storeName}>{store.storeName}</h3>
                    <span
                      className={styles.statusBadge}
                      style={{
                        background: STATUS_COLORS[store.status] + "22",
                        color: STATUS_COLORS[store.status] ?? "#888",
                        borderColor: STATUS_COLORS[store.status] ?? "#888",
                      }}
                    >
                      {store.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className={styles.storeNiche}>📌 {store.niche}</p>
                  <div className={styles.storeStats}>
                    <span>🛍️ {store.productCount} products</span>
                    <span>📝 {store.listingCount} listings</span>
                  </div>
                  <div className={styles.storeActions}>
                    <a
                      href={`${API_URL}/stores/${store.slug}/preview`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.previewBtn}
                    >
                      Preview →
                    </a>
                    <span className={styles.storeDate}>
                      {new Date(store.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Workflow Diagram */}
        <section className={styles.workflowSection}>
          <h2 className={styles.sectionTitle}>How It Works</h2>
          <div className={styles.workflowSteps}>
            {[
              { icon: "🔍", title: "Source Products", desc: "AliExpress supplier API" },
              { icon: "🏗️", title: "Build Storefront", desc: "HTML + brand identity" },
              { icon: "✍️", title: "Write Listings", desc: "Gemini AI copywriting" },
              { icon: "🛒", title: "Locus Checkout", desc: "Order management" },
              { icon: "💸", title: "Route Payouts", desc: "Stripe Connect split" },
              { icon: "📱", title: "Notify Owner", desc: "Telegram summary" },
            ].map((step, i) => (
              <div key={i} className={styles.workflowStep}>
                {i > 0 && <div className={styles.stepArrow}>→</div>}
                <div className={styles.stepCard}>
                  <span className={styles.stepIcon}>{step.icon}</span>
                  <span className={styles.stepTitle}>{step.title}</span>
                  <span className={styles.stepDesc}>{step.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
