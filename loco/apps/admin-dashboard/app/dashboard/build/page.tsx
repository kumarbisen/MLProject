"use client";

import { useCallback, useEffect, useState } from "react";
import {
  api,
  type ApiActivity,
  type ApiApp,
  type ApiMessage,
} from "../../../lib/api";
import {
  formatClock,
  formatRelativeTime,
  getToken,
} from "../../../lib/auth";
import styles from "../dashboard.module.css";

type Tab = "preview" | "code" | "activity";

function renderContent(text: string) {
  const urlMatch = text.match(/(https?:\/\/[^\s]+)/);
  if (!urlMatch) return text;
  const [before, after] = text.split(urlMatch[0]);
  return (
    <>
      {before}
      <a href={urlMatch[0]} target="_blank" rel="noopener noreferrer">
        {urlMatch[0]}
      </a>
      {after}
    </>
  );
}

function logBarClass(kind: string): string {
  if (kind === "success" || kind === "build") return styles.logBarGreen;
  if (kind === "plan") return styles.logBarPurple;
  return styles.logBarGrey;
}

function logIcon(kind: string): string {
  if (kind === "success" || kind === "build") return "✓";
  if (kind === "plan") return "◆";
  return "○";
}

export default function BuildPage() {
  const token = getToken();
  const [apps, setApps] = useState<ApiApp[]>([]);
  const [appId, setAppId] = useState<string>("");
  const [messages, setMessages] = useState<ApiMessage[]>([]);
  const [logs, setLogs] = useState<ApiActivity[]>([]);
  const [tab, setTab] = useState<Tab>("activity");
  const [input, setInput] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [showNewApp, setShowNewApp] = useState(false);
  const [nichePrompt, setNichePrompt] = useState("");
  const [publishing, setPublishing] = useState(false);

  const activeApp = apps.find((a) => a.appId === appId);

  const loadAppData = useCallback(
    async (id: string) => {
      if (!token || !id) return;
      const [msgRes, actRes] = await Promise.all([
        api.messages(token, id),
        api.activity(token, id),
      ]);
      setMessages(msgRes.messages);
      setLogs(actRes.logs);
      if (tab === "code") {
        const codeRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}/api/customer/apps/${id}/code`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await codeRes.json();
        setCode(data.code ?? "");
      }
    },
    [token, tab]
  );

  const refreshApps = useCallback(async () => {
    if (!token) return;
    const { apps: list } = await api.apps(token);
    setApps(list);
    if (!appId && list.length > 0) {
      setAppId(list[0].appId);
    }
    return list;
  }, [token, appId]);

  useEffect(() => {
    if (!token) return;
    refreshApps()
      .then((list) => {
        if (list?.[0]) loadAppData(list[0].appId);
      })
      .finally(() => setLoading(false));
  }, [token, refreshApps, loadAppData]);

  useEffect(() => {
    if (!appId || !token) return;
    loadAppData(appId);
    const interval = setInterval(() => loadAppData(appId), 4000);
    return () => clearInterval(interval);
  }, [appId, token, loadAppData]);

  useEffect(() => {
    if (!token || !appId) return;
    const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
    const es = new EventSource(
      `${base}/api/customer/apps/${appId}/stream?token=${encodeURIComponent(token)}`
    );
    return () => es.close();
  }, [appId, token]);

  async function sendMessage() {
    if (!token || !appId || !input.trim()) return;
    await api.sendMessage(token, appId, input.trim());
    setInput("");
    loadAppData(appId);
  }

  async function handlePublish() {
    if (!token || !appId || !activeApp?.publishUnlocked) return;
    setPublishing(true);
    try {
      await api.publish(token, appId);
      await refreshApps();
      loadAppData(appId);
    } finally {
      setPublishing(false);
    }
  }

  async function handleClearLogs() {
    if (!token || !appId) return;
    await api.clearActivity(token, appId);
    setLogs([]);
  }

  async function handleNewApp(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !nichePrompt.trim()) return;
    const { app } = await api.createApp(token, {
      title: "New App",
      nichePrompt: nichePrompt.trim(),
      description: `Build chat for ${nichePrompt.trim()}`,
    });
    setShowNewApp(false);
    setNichePrompt("");
    await refreshApps();
    setAppId(app.appId);
    loadAppData(app.appId);
  }

  if (loading) {
    return <p className={styles.loading}>Loading your workspace…</p>;
  }

  const qualityLabel = activeApp?.qualityGrade
    ? `QUALITY: ${activeApp.qualityGrade}`
    : "QUALITY: NOT GRADED YET";

  return (
    <>
      <div className={styles.subHeader}>
        <div className={styles.subLeft}>
          <div className={styles.appSelectWrap}>
            <span className={styles.appTag}>APP</span>
            <select
              className={styles.appSelect}
              value={appId}
              onChange={(e) => setAppId(e.target.value)}
            >
              {apps.length === 0 && (
                <option value="">No apps yet</option>
              )}
              {apps.map((a) => (
                <option key={a.appId} value={a.appId}>
                  {a.description || a.title}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className={styles.newAppBtn}
            onClick={() => setShowNewApp(true)}
          >
            + NEW APP
          </button>
        </div>
        <div className={styles.subRight}>
          <button type="button" className={styles.moreBtn}>
            MORE ▾
          </button>
          <span className={styles.quality}>{qualityLabel}</span>
          <button
            type="button"
            className={styles.publishBtn}
            disabled={!activeApp?.publishUnlocked || publishing}
            onClick={handlePublish}
          >
            PUBLISH
          </button>
        </div>
      </div>

      <div className={styles.content}>
        <section className={styles.panel}>
          <div className={styles.chatHeader}>
            <h2 className={styles.chatTitle}>
              {activeApp?.title ?? "Your project"}
            </h2>
            <p className={styles.chatDesc}>
              {activeApp?.description ?? "Start a new app to begin building."}
            </p>
          </div>

          <div className={styles.messages}>
            {messages.map((m) =>
              m.isInstruction ? (
                <div key={m.id} className={styles.bubbleInstruction}>
                  {renderContent(m.content)}
                  <div className={styles.bubbleMeta}>
                    <span className={styles.tagTelegram}>TELEGRAM</span>
                    <span>
                      {formatRelativeTime(m.createdAt)} ·{" "}
                      {formatClock(m.createdAt)}
                    </span>
                  </div>
                </div>
              ) : (
                <div key={m.id} className={styles.bubble}>
                  {renderContent(m.content)}
                  <div className={styles.bubbleMeta}>
                    {m.source === "telegram" && (
                      <span className={styles.tagTelegram}>TELEGRAM</span>
                    )}
                    <span>
                      {formatRelativeTime(m.createdAt)} ·{" "}
                      {formatClock(m.createdAt)}
                    </span>
                  </div>
                </div>
              )
            )}
          </div>

          <div className={styles.chatInputRow}>
            <input
              className={styles.chatInput}
              placeholder="Message your agent…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <button
              type="button"
              className={styles.sendBtn}
              onClick={sendMessage}
              aria-label="Send"
            >
              ➤
            </button>
          </div>
        </section>

        <section className={styles.rightPanel}>
          <div className={styles.tabs}>
            {(["preview", "code", "activity"] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                className={`${styles.tab} ${tab === t ? styles.tabActive : ""}`}
                onClick={() => setTab(t)}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {tab === "activity" && (
            <>
              <div className={styles.activityHeader}>
                <span className={styles.liveBadge}>
                  <span className={styles.liveDot} />
                  Live {logs.length} logs
                </span>
                <button
                  type="button"
                  className={styles.clearBtn}
                  onClick={handleClearLogs}
                >
                  Clear
                </button>
              </div>
              <div className={styles.activityList}>
                {logs.map((log) => (
                  <div key={log.id} className={styles.logRow}>
                    <div
                      className={`${styles.logBar} ${logBarClass(log.kind)}`}
                    />
                    <span className={styles.logIcon}>
                      {logIcon(log.kind)}
                    </span>
                    <div>
                      <p className={styles.logTitle}>{log.title}</p>
                      {log.detail && (
                        <p className={styles.logDetail}>{log.detail}</p>
                      )}
                    </div>
                    <span className={styles.logTime}>
                      {formatRelativeTime(log.createdAt)} ·{" "}
                      {formatClock(log.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          {tab === "preview" && activeApp?.storeId && token && (
            <iframe
              className={styles.previewFrame}
              title="Preview"
              src={`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}/api/customer/apps/${appId}/preview?token=${encodeURIComponent(token)}`}
              sandbox="allow-scripts allow-same-origin"
            />
          )}
          {tab === "preview" && !activeApp?.storeId && (
            <p className={styles.loading}>Preview will appear after build starts.</p>
          )}

          {tab === "code" && (
            <pre className={styles.codeView}>
              {code || "// Loading code…"}
            </pre>
          )}
        </section>
      </div>

      {showNewApp && (
        <div className={styles.modalOverlay}>
          <form className={styles.modal} onSubmit={handleNewApp}>
            <h3>New app</h3>
            <label className={styles.label}>What should we build?</label>
            <input
              placeholder='e.g. "late night rides merch storefront"'
              value={nichePrompt}
              onChange={(e) => setNichePrompt(e.target.value)}
              required
            />
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.btnOutline}
                onClick={() => setShowNewApp(false)}
              >
                Cancel
              </button>
              <button type="submit" className={styles.btnPrimary}>
                Start build
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
