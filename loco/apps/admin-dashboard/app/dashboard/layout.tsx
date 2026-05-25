"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, type ApiAgent, type ApiUser } from "../../lib/api";
import { clearSession, getStoredUser, getToken } from "../../lib/auth";
import styles from "./dashboard.module.css";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<ApiUser | null>(null);
  const [agent, setAgent] = useState<ApiAgent | null>(null);
  const [credits, setCredits] = useState({ creditsUsd: 0, limitPercent: 0 });

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    setUser(getStoredUser());
    api.me(token).then(({ user: u }) => setUser(u)).catch(() => {
      clearSession();
      router.replace("/login");
    });
    api.agent(token).then(({ agent: a }) => setAgent(a)).catch(() => {});
    api.credits(token).then(setCredits).catch(() => {});
    const t = setInterval(() => {
      api.agent(token).then(({ agent: a }) => setAgent(a)).catch(() => {});
    }, 15000);
    return () => clearInterval(t);
  }, [router]);

  function logout() {
    clearSession();
    router.replace("/login");
  }

  const nav = (href: string, label: string) => {
    const active = pathname === href || pathname.startsWith(href + "/");
    return (
      <Link
        href={href}
        className={`${styles.navLink} ${active ? styles.navLinkActive : ""}`}
      >
        {label}
      </Link>
    );
  };

  return (
    <div className={styles.shell}>
      <header className={styles.topNav}>
        <Link href="/dashboard/build" className={styles.logo}>
          LOCUS
        </Link>

        <div className={styles.agentPill}>
          <span className={styles.agentLabel}>AGENT</span>
          <span className={styles.agentTask}>
            {agent?.task ?? "Waiting for your next task"}
          </span>
          <span className={styles.agentStatus}>
            {agent?.label ?? "Idle"}
          </span>
        </div>

        <div className={styles.topRight}>
          <div className={styles.metric}>
            <span className={styles.dotRed} />
            <span>LIMIT</span>
            <span className={styles.metricValue}>
              {credits.limitPercent}%
            </span>
          </div>
          <div className={styles.metric}>
            <span>CREDITS</span>
            <span className={styles.metricValue}>
              ${credits.creditsUsd.toFixed(2)}
            </span>
          </div>
          <button type="button" className={styles.userBtn} onClick={logout}>
            {user?.displayName ?? "Account"} ▾
          </button>
        </div>
      </header>

      <div className={styles.body}>
        <aside className={styles.sidebar}>
          <div className={styles.navSection}>
            <p className={styles.navHeading}>WORKSPACE</p>
            {nav("/dashboard/build", "Dashboard")}
            {nav("/dashboard/build", "Chat")}
          </div>
          <div className={styles.navSection}>
            <p className={styles.navHeading}>CREATE</p>
            {nav("/dashboard/build", "Build")}
            {nav("/dashboard/build", "Products")}
            {nav("/dashboard/build", "Branding")}
            {nav("/dashboard/build", "Ad Studio")}
          </div>
          <div className={styles.navSection}>
            <p className={styles.navHeading}>OPERATE</p>
            {nav("/dashboard/build", "Live Sites")}
            {nav("/dashboard/build", "Email")}
          </div>

          <div className={styles.launchStep}>
            <p className={styles.launchLabel}>LAUNCH STEP</p>
            <p className={styles.launchTitle}>Product sourced</p>
            <div className={styles.launchActions}>
              <button type="button" className={styles.btnPrimary}>
                Show me
              </button>
              <button type="button" className={styles.btnOutline}>
                Text Locus
              </button>
            </div>
          </div>
        </aside>

        <div className={styles.main}>{children}</div>
      </div>
    </div>
  );
}
