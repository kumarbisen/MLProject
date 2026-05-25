import { randomBytes, scryptSync } from "node:crypto";
import { customerStore } from "./customerStore.js";
import { storeDB } from "./inMemoryStore.js";

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const attempt = scryptSync(password, salt, 64).toString("hex");
  return attempt === hash;
}

export function seedCustomerDemo(): void {
  if (customerStore.findUserByEmail("sunil@locus.app")) return;

  const userId = "user_sunil_demo";
  customerStore.users.set(userId, {
    userId,
    email: "sunil@locus.app",
    passwordHash: hashPassword("locus2026"),
    displayName: "Sunil",
    telegramId: process.env.DEMO_TELEGRAM_ID,
    creditsUsd: 37.88,
    limitPercent: 0,
    createdAt: new Date().toISOString(),
  });

  customerStore.setAgent(userId, {
    task: "Identify zero-cost outreach channels for Late Night...",
    status: "idle",
    lastActiveAt: new Date(Date.now() - 22 * 60 * 1000).toISOString(),
  });

  const appId = "app_late_night_rides";
  customerStore.apps.set(appId, {
    appId,
    userId,
    storeId: "store_late_night_demo",
    title: "Late Night Rides",
    description:
      "a full Next.js storefront for MyMiniEpic — premium late-night ride merch.",
    qualityGrade: null,
    publishUnlocked: true,
    previewUrl: `${process.env.PUBLIC_API_URL ?? "http://localhost:3001"}/stores/late-night-rides/preview`,
    colorPalette: {
      primary: "#1A1A1A",
      secondary: "#F5F3F0",
      accent: "#8B7355",
      background: "#FFFFFF",
    },
    products: [],
    listings: [],
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    status: "published",
  });

  // Seed demo chat log
  storeDB.chatLogs.set("demo-session-123", [
    {
      role: "user",
      content: "I want to build a store for jdm car parts",
      timestamp: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      role: "assistant",
      content:
        `I have created a draft store for you called Late Night Rides.\n\n` +
        `The Publish button should now be unlocked. Preview: ` +
        `${process.env.PUBLIC_ADMIN_URL ?? "http://localhost:3000"}/dashboard/build`,
      offset: -2 * 3600000,
    },
  ]);

  const now = Date.now();
  const msgs = [
    {
      source: "bot" as const,
      isInstruction: true,
      content:
        "4. Confirm dist/index.html exists and assets resolve.\n5. Start the dev server on the assigned port.\n6. Reply with the preview URL when ready.",
      offset: -3 * 3600000,
    },
    {
      source: "telegram" as const,
      content:
        "Clean production build — Vite bundled all 38 modules in 2 seconds. dist/index.html exists.",
      offset: -2.5 * 3600000,
    },
    {
      source: "telegram" as const,
      content:
        "The Publish button should now be unlocked. Preview: http://localhost:3000/dashboard/build",
      offset: -2 * 3600000,
    },
  ];

  for (const m of msgs) {
    customerStore.appendMessage(appId, {
      ...m,
      createdAt: new Date(now + m.offset).toISOString(),
    });
  }

  const activities = [
    { kind: "command" as const, title: "Finished running a command", detail: "npm run build", hours: 1.1 },
    { kind: "success" as const, title: "Build finished", detail: "Production bundle ready", hours: 1.05 },
    { kind: "turn" as const, title: "Turn finished", detail: "Agent completed turn", hours: 1.0 },
    { kind: "plan" as const, title: "Planning the build", detail: "Scaffolding Next.js storefront", hours: 0.95 },
  ];

  for (const a of activities) {
    customerStore.appendActivity(appId, {
      ...a,
      createdAt: new Date(now - a.hours * 3600000).toISOString(),
    });
  }

  const demoStoreId = "store_late_night_demo";
  if (!storeDB.stores.has(demoStoreId)) {
    storeDB.stores.set(demoStoreId, {
      storeId: demoStoreId,
      storeName: "Late Night Rides",
      slug: "late-night-rides",
      niche: "late night rides merch storefront",
      ownerTelegramId: process.env.DEMO_TELEGRAM_ID ?? "demo_owner",
      ownerUserId: userId,
      colorPalette: {
        primary: "#7C3AED",
        secondary: "#5B21B6",
        accent: "#A78BFA",
        background: "#FAFAFA",
      },
      products: [],
      listings: [],
      createdAt: new Date().toISOString(),
      status: "checkout_integrated",
    });
    storeDB.storefrontHTML.set(
      demoStoreId,
      "<!DOCTYPE html><html><body style='font-family:sans-serif;padding:2rem'><h1>Late Night Rides</h1><p>Demo preview — connect a real build to replace this.</p></body></html>"
    );
  }
}

export { hashPassword };
