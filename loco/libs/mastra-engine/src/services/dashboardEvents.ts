/**
 * Bridge workflow/store updates → customer dashboard chat + activity feed.
 */
import { customerStore } from "../db/customerStore.js";
import { storeDB } from "../db/inMemoryStore.js";

const STATUS_LABELS: Record<string, string> = {
  building: "Building your storefront",
  products_sourced: "Products sourced",
  listings_written: "Listings written",
  checkout_integrated: "Checkout integrated",
  payouts_configured: "Payouts configured",
  live: "Store is live",
};

export function syncStoreToDashboard(appId: string, storeId: string): void {
  const store = storeDB.stores.get(storeId);
  const app = customerStore.apps.get(appId);
  if (!store || !app) return;

  const previewBase =
    process.env.PUBLIC_API_URL ?? process.env.API_URL ?? "http://localhost:3001";
  const previewUrl = `${previewBase}/stores/${store.slug}/preview`;

  customerStore.apps.set(appId, {
    ...app,
    title: store.storeName,
    description: `A full Next.js storefront for ${store.niche}`,
    previewUrl,
    publishUnlocked:
      store.status === "live" ||
      store.status === "payouts_configured" ||
      store.status === "checkout_integrated",
    qualityGrade: store.status === "live" ? "A" : app.qualityGrade,
  });
}

export function logBuildStarted(
  appId: string,
  nichePrompt: string
): void {
  customerStore.setAgent(
    customerStore.apps.get(appId)?.userId ?? "",
    { status: "busy", task: nichePrompt, lastActiveAt: new Date().toISOString() }
  );

  customerStore.appendActivity(appId, {
    kind: "plan",
    title: "Planning the build",
    detail: `Niche: ${nichePrompt}`,
  });

  customerStore.appendMessage(appId, {
    source: "bot",
    isInstruction: true,
    content: `Build goals:\n1. Source products for "${nichePrompt}"\n2. Generate storefront HTML\n3. Write AI listings\n4. Confirm dist/index.html exists\n5. Start the dev server and verify preview`,
  });
}

export function logStoreStatusChange(
  appId: string,
  storeId: string,
  status: string
): void {
  const label = STATUS_LABELS[status] ?? status;
  customerStore.appendActivity(appId, {
    kind: status === "live" ? "success" : "build",
    title: label,
    detail: `Store ${storeId} → ${status}`,
  });

  customerStore.appendMessage(appId, {
    source: "telegram",
    content: `${label}. Status: ${status.replace(/_/g, " ")}.`,
  });

  syncStoreToDashboard(appId, storeId);

  if (
    status === "checkout_integrated" ||
    status === "payouts_configured" ||
    status === "live"
  ) {
    const app = customerStore.apps.get(appId);
    const preview = app?.previewUrl ?? "";
    customerStore.appendMessage(appId, {
      source: "telegram",
      content: `Clean production build completed. Preview: ${preview}\n\nThe Publish button should now be unlocked.`,
    });
  }

  const userId = customerStore.apps.get(appId)?.userId;
  if (userId) {
    customerStore.setAgent(userId, {
      status: status === "building" ? "busy" : "idle",
      lastActiveAt: new Date().toISOString(),
    });
  }
}

export function logCommandFinished(appId: string, detail: string): void {
  customerStore.appendActivity(appId, {
    kind: "command",
    title: "Finished running a command",
    detail,
  });
}

export function logBuildFinished(appId: string): void {
  customerStore.appendActivity(appId, {
    kind: "success",
    title: "Build finished",
    detail: "All pipeline steps completed",
  });
  customerStore.appendActivity(appId, {
    kind: "turn",
    title: "Turn finished",
    detail: "Agent turn complete",
  });
}
