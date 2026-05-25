import type { Express, Request, Response } from "express";
import {
  customerStore,
  hashPassword,
  logBuildFinished,
  logBuildStarted,
  logCommandFinished,
  logStoreStatusChange,
  seedCustomerDemo,
  runStorefrontBuild,
  storeDB,
  syncStoreToDashboard,
  verifyPassword,
} from "@locusfounder/mastra-engine";
import {
  authHeader,
  newAppId,
  newUserId,
  signToken,
  verifyToken,
} from "./auth.js";

function requireAuth(req: Request, res: Response): string | null {
  const userId = verifyToken(authHeader(req))?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return userId;
}

const lastLoggedStatus = new Map<string, string>();

async function watchStoreBuild(
  appId: string,
  userId: string,
  nichePrompt: string
): Promise<void> {
  logBuildStarted(appId, nichePrompt);
  const user = customerStore.findUserById(userId);
  const ownerTelegramId = user?.telegramId ?? userId;

  let seenStoreId: string | undefined;

  const poll = setInterval(() => {
    const stores = storeDB.findByUserId(userId);
    const store = seenStoreId
      ? storeDB.stores.get(seenStoreId)
      : stores.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )[0];

    if (!store) return;
    seenStoreId = store.storeId;

    const app = customerStore.apps.get(appId);
    if (app && !app.storeId) {
      customerStore.apps.set(appId, { ...app, storeId: store.storeId });
    }

    const key = `${appId}:${store.storeId}`;
    const prev = lastLoggedStatus.get(key);
    if (prev !== store.status) {
      lastLoggedStatus.set(key, store.status);
      logStoreStatusChange(appId, store.storeId, store.status);
      logCommandFinished(appId, `Pipeline step → ${store.status}`);
      syncStoreToDashboard(appId, store.storeId);
    }
  }, 2500);

  try {
    const runResult = await runStorefrontBuild({
      nichePrompt,
      ownerTelegramId,
      productLimit: 5,
      platformFeePercent: 10,
      payoutSchedule: "weekly",
    });

    const output =
      runResult.status === "success"
        ? runResult.result
        : storeDB.findByUserId(userId).sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )[0];

    const storeId =
      output && "storeId" in output
        ? output.storeId
        : (output as { storeId?: string })?.storeId;

    if (!storeId) return;

    const store = storeDB.stores.get(storeId);
    if (store) {
      store.ownerUserId = userId;
      storeDB.stores.set(storeId, store);
    }

    const app = customerStore.apps.get(appId);
    if (app) {
      const storeName =
        "storeName" in (output ?? {})
          ? (output as { storeName: string }).storeName
          : store?.storeName;
      customerStore.apps.set(appId, {
        ...app,
        storeId,
        title: storeName ?? app.title,
        publishUnlocked: true,
      });
    }

    logBuildFinished(appId);
    logStoreStatusChange(appId, storeId, "live");
    syncStoreToDashboard(appId, storeId);
    customerStore.setAgent(userId, { status: "idle" });
  } catch (err) {
    console.error("[customerApi] build error:", err);
    customerStore.appendMessage(appId, {
      source: "system",
      content: `Build failed: ${err instanceof Error ? err.message : "Unknown error"}`,
    });
    customerStore.setAgent(userId, { status: "error" });
  } finally {
    clearInterval(poll);
  }
}

export function registerCustomerApi(app: Express): void {
  seedCustomerDemo();

  app.post("/api/auth/register", (req, res) => {
    const { email, password, displayName, telegramId } = req.body ?? {};
    if (!email || !password || !displayName) {
      return res
        .status(400)
        .json({ error: "email, password, and displayName are required" });
    }
    if (customerStore.findUserByEmail(email)) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const userId = newUserId();
    const user = {
      userId,
      email: email.trim().toLowerCase(),
      passwordHash: hashPassword(password),
      displayName: displayName.trim(),
      telegramId: telegramId?.toString(),
      creditsUsd: 50,
      limitPercent: 0,
      createdAt: new Date().toISOString(),
    };
    customerStore.users.set(userId, user);

    const token = signToken(userId);
    res.status(201).json({
      token,
      user: {
        userId,
        email: user.email,
        displayName: user.displayName,
        creditsUsd: user.creditsUsd,
        limitPercent: user.limitPercent,
      },
    });
  });

  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body ?? {};
    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }

    const user = customerStore.findUserByEmail(email);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    res.json({
      token: signToken(user.userId),
      user: {
        userId: user.userId,
        email: user.email,
        displayName: user.displayName,
        creditsUsd: user.creditsUsd,
        limitPercent: user.limitPercent,
      },
    });
  });

  app.get("/api/auth/me", (req, res) => {
    const userId = requireAuth(req, res);
    if (!userId) return;
    const user = customerStore.findUserById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({
      user: {
        userId: user.userId,
        email: user.email,
        displayName: user.displayName,
        creditsUsd: user.creditsUsd,
        limitPercent: user.limitPercent,
      },
    });
  });

  app.get("/api/customer/agent", (req, res) => {
    const userId = requireAuth(req, res);
    if (!userId) return;
    const agent = customerStore.getAgent(userId);
    const idleMs = Date.now() - new Date(agent.lastActiveAt).getTime();
    const idleMin = Math.max(1, Math.round(idleMs / 60000));
    res.json({
      agent: {
        ...agent,
        label:
          agent.status === "busy"
            ? "Working"
            : `Idle · last ${idleMin}m`,
      },
    });
  });

  app.get("/api/customer/credits", (req, res) => {
    const userId = requireAuth(req, res);
    if (!userId) return;
    const user = customerStore.findUserById(userId)!;
    res.json({
      creditsUsd: user.creditsUsd,
      limitPercent: user.limitPercent,
    });
  });

  app.get("/api/customer/apps", (req, res) => {
    const userId = requireAuth(req, res);
    if (!userId) return;

    const apps = customerStore.listAppsForUser(userId).map((a) => {
      if (a.storeId) syncStoreToDashboard(a.appId, a.storeId);
      const synced = customerStore.apps.get(a.appId)!;
      const store = synced.storeId
        ? storeDB.stores.get(synced.storeId)
        : undefined;
      return {
        ...synced,
        status: store?.status ?? "draft",
        productCount: store?.products.length ?? 0,
      };
    });

    res.json({ apps });
  });

  app.post("/api/customer/apps", (req, res) => {
    const userId = requireAuth(req, res);
    if (!userId) return;

    const { title, description, nichePrompt } = req.body ?? {};
    if (!nichePrompt?.trim()) {
      return res.status(400).json({ error: "nichePrompt is required" });
    }

    const appId = newAppId();
    const app = {
      appId,
      userId,
      title: title?.trim() || "New App",
      description:
        description?.trim() ||
        `Build chat for ${nichePrompt.trim()}`,
      qualityGrade: null,
      publishUnlocked: false,
    };
    customerStore.apps.set(appId, app);

    res.status(201).json({ app });

    watchStoreBuild(appId, userId, nichePrompt.trim()).catch(console.error);
  });

  app.get("/api/customer/apps/:appId", (req, res) => {
    const userId = requireAuth(req, res);
    if (!userId) return;

    const app = customerStore.apps.get(req.params.appId);
    if (!app || app.userId !== userId) {
      return res.status(404).json({ error: "App not found" });
    }
    if (app.storeId) syncStoreToDashboard(app.appId, app.storeId);
    const synced = customerStore.apps.get(app.appId)!;
    const store = synced.storeId
      ? storeDB.stores.get(synced.storeId)
      : undefined;

    res.json({
      app: synced,
      store: store
        ? {
            storeId: store.storeId,
            slug: store.slug,
            status: store.status,
            productCount: store.products.length,
          }
        : null,
    });
  });

  app.get("/api/customer/apps/:appId/messages", (req, res) => {
    const userId = requireAuth(req, res);
    if (!userId) return;
    const app = customerStore.apps.get(req.params.appId);
    if (!app || app.userId !== userId) {
      return res.status(404).json({ error: "App not found" });
    }
    res.json({ messages: customerStore.getMessages(app.appId) });
  });

  app.post("/api/customer/apps/:appId/messages", (req, res) => {
    const userId = requireAuth(req, res);
    if (!userId) return;
    const app = customerStore.apps.get(req.params.appId);
    if (!app || app.userId !== userId) {
      return res.status(404).json({ error: "App not found" });
    }

    const { content } = req.body ?? {};
    if (!content?.trim()) {
      return res.status(400).json({ error: "content is required" });
    }

    const message = customerStore.appendMessage(app.appId, {
      source: "user",
      content: content.trim(),
    });

    customerStore.setAgent(userId, {
      status: "busy",
      task: content.trim().slice(0, 80),
    });

    setTimeout(() => {
      customerStore.appendMessage(app.appId, {
        source: "bot",
        content:
          "Got it — I'm on it. You'll see updates in Activity as steps complete.",
      });
      customerStore.setAgent(userId, { status: "idle" });
    }, 1200);

    res.status(201).json({ message });
  });

  app.get("/api/customer/apps/:appId/activity", (req, res) => {
    const userId = requireAuth(req, res);
    if (!userId) return;
    const app = customerStore.apps.get(req.params.appId);
    if (!app || app.userId !== userId) {
      return res.status(404).json({ error: "App not found" });
    }
    res.json({
      logs: customerStore.getActivities(app.appId),
      live: true,
      total: customerStore.getActivities(app.appId).length,
    });
  });

  app.delete("/api/customer/apps/:appId/activity", (req, res) => {
    const userId = requireAuth(req, res);
    if (!userId) return;
    const app = customerStore.apps.get(req.params.appId);
    if (!app || app.userId !== userId) {
      return res.status(404).json({ error: "App not found" });
    }
    customerStore.clearActivities(app.appId);
    res.json({ cleared: true });
  });

  app.post("/api/customer/apps/:appId/publish", (req, res) => {
    const userId = requireAuth(req, res);
    if (!userId) return;
    const app = customerStore.apps.get(req.params.appId);
    if (!app || app.userId !== userId) {
      return res.status(404).json({ error: "App not found" });
    }
    if (!app.publishUnlocked) {
      return res
        .status(403)
        .json({ error: "Publish locked until build completes successfully" });
    }

    if (app.storeId) {
      const store = storeDB.stores.get(app.storeId);
      if (store) {
        store.status = "live";
        storeDB.stores.set(app.storeId, store);
      }
    }

    customerStore.apps.set(app.appId, {
      ...app,
      qualityGrade: "A",
    });

    customerStore.appendMessage(app.appId, {
      source: "system",
      content: "Published — your storefront is now live.",
    });

    res.json({
      published: true,
      previewUrl: app.previewUrl,
    });
  });

  app.get("/api/customer/apps/:appId/preview", (req, res) => {
    const token =
      authHeader(req) ??
      (typeof req.query.token === "string" ? req.query.token : undefined);
    const userId = verifyToken(token)?.userId;
    if (!userId) return res.status(401).send("Unauthorized");
    const app = customerStore.apps.get(req.params.appId);
    if (!app || app.userId !== userId) {
      return res.status(404).json({ error: "App not found" });
    }
    if (!app.storeId) {
      return res.status(404).json({ error: "No storefront yet" });
    }
    const html =
      storeDB.getStorefrontPage(app.storeId, "home") ??
      storeDB.storefrontHTML.get(app.storeId);
    if (!html) return res.status(404).send("Preview not ready");
    res.setHeader("Content-Type", "text/html");
    res.send(html);
  });

  app.get("/api/customer/apps/:appId/code", (req, res) => {
    const userId = requireAuth(req, res);
    if (!userId) return;
    const app = customerStore.apps.get(req.params.appId);
    if (!app || app.userId !== userId) {
      return res.status(404).json({ error: "App not found" });
    }
    if (!app.storeId) {
      return res.json({ code: "// No build yet — start a new app to generate code." });
    }
    const pages = storeDB.storefrontPages.get(app.storeId);
    const html = pages
      ? Object.entries(pages)
          .map(([page, content]) => `<!-- ${page} -->\n${content}`)
          .join("\n\n")
      : (storeDB.storefrontHTML.get(app.storeId) ?? "");
    res.json({
      code: html.slice(0, 50000),
      language: "html",
    });
  });

  /** SSE stream for live activity + messages */
  app.get("/api/customer/apps/:appId/stream", (req, res) => {
    const token =
      authHeader(req) ??
      (typeof req.query.token === "string" ? req.query.token : undefined);
    const userId = verifyToken(token)?.userId;
    if (!userId) return res.status(401).end();

    const app = customerStore.apps.get(req.params.appId);
    if (!app || app.userId !== userId) {
      return res.status(404).end();
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    let lastMsg = 0;
    let lastAct = 0;

    const push = () => {
      const messages = customerStore.getMessages(app.appId);
      const logs = customerStore.getActivities(app.appId);
      const msgCount = messages.length;
      const actCount = logs.length;

      if (msgCount !== lastMsg) {
        lastMsg = msgCount;
        res.write(
          `event: messages\ndata: ${JSON.stringify({ messages })}\n\n`
        );
      }
      if (actCount !== lastAct) {
        lastAct = actCount;
        res.write(`event: activity\ndata: ${JSON.stringify({ logs })}\n\n`);
      }
    };

    push();
    const interval = setInterval(push, 2000);
    req.on("close", () => clearInterval(interval));
  });
}
