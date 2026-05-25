/**
 * Customer-facing dashboard data: users, chat, activity logs, agent state.
 * Swap for Postgres/Supabase in production.
 */

export interface CustomerUser {
  userId: string;
  email: string;
  passwordHash: string;
  displayName: string;
  telegramId?: string;
  creditsUsd: number;
  limitPercent: number;
  createdAt: string;
}

export type MessageSource = "user" | "bot" | "system" | "telegram";

export interface ChatMessage {
  id: string;
  appId: string;
  source: MessageSource;
  content: string;
  isInstruction?: boolean;
  createdAt: string;
}

export type ActivityKind =
  | "command"
  | "build"
  | "plan"
  | "turn"
  | "success"
  | "error"
  | "info";

export interface ActivityLog {
  id: string;
  appId: string;
  kind: ActivityKind;
  title: string;
  detail?: string;
  createdAt: string;
}

export interface AgentState {
  userId: string;
  task: string;
  status: "idle" | "busy" | "error";
  lastActiveAt: string;
}

export interface AppMeta {
  appId: string;
  userId: string;
  storeId?: string;
  title: string;
  description: string;
  qualityGrade: string | null;
  publishUnlocked: boolean;
  previewUrl?: string;
}

class CustomerStore {
  users = new Map<string, CustomerUser>();
  apps = new Map<string, AppMeta>();
  messages = new Map<string, ChatMessage[]>();
  activities = new Map<string, ActivityLog[]>();
  agents = new Map<string, AgentState>();
  sessions = new Map<string, string>();

  findUserByEmail(email: string): CustomerUser | undefined {
    const normalized = email.trim().toLowerCase();
    return Array.from(this.users.values()).find(
      (u) => u.email.toLowerCase() === normalized
    );
  }

  findUserById(userId: string): CustomerUser | undefined {
    return this.users.get(userId);
  }

  listAppsForUser(userId: string): AppMeta[] {
    return Array.from(this.apps.values())
      .filter((a) => a.userId === userId)
      .sort(
        (a, b) =>
          new Date(b.appId).getTime() - new Date(a.appId).getTime()
      );
  }

  getMessages(appId: string): ChatMessage[] {
    return [...(this.messages.get(appId) ?? [])].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }

  getActivities(appId: string): ActivityLog[] {
    return [...(this.activities.get(appId) ?? [])].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  appendMessage(
    appId: string,
    msg: Omit<ChatMessage, "id" | "appId" | "createdAt"> & {
      id?: string;
      createdAt?: string;
    }
  ): ChatMessage {
    const entry: ChatMessage = {
      id: msg.id ?? `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      appId,
      source: msg.source,
      content: msg.content,
      isInstruction: msg.isInstruction,
      createdAt: msg.createdAt ?? new Date().toISOString(),
    };
    const list = this.messages.get(appId) ?? [];
    list.push(entry);
    this.messages.set(appId, list);
    return entry;
  }

  appendActivity(
    appId: string,
    log: Omit<ActivityLog, "id" | "appId" | "createdAt"> & {
      id?: string;
      createdAt?: string;
    }
  ): ActivityLog {
    const entry: ActivityLog = {
      id: log.id ?? `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      appId,
      kind: log.kind,
      title: log.title,
      detail: log.detail,
      createdAt: log.createdAt ?? new Date().toISOString(),
    };
    const list = this.activities.get(appId) ?? [];
    list.unshift(entry);
    this.activities.set(appId, list);
    return entry;
  }

  clearActivities(appId: string): void {
    this.activities.set(appId, []);
  }

  setAgent(userId: string, patch: Partial<AgentState> & { task?: string }): AgentState {
    const existing = this.agents.get(userId);
    const next: AgentState = {
      userId,
      task: patch.task ?? existing?.task ?? "Waiting for your next build",
      status: patch.status ?? existing?.status ?? "idle",
      lastActiveAt: patch.lastActiveAt ?? new Date().toISOString(),
    };
    this.agents.set(userId, next);
    return next;
  }

  getAgent(userId: string): AgentState {
    return (
      this.agents.get(userId) ?? {
        userId,
        task: "Identify zero-cost outreach channels for Late Night...",
        status: "idle",
        lastActiveAt: new Date(Date.now() - 22 * 60 * 1000).toISOString(),
      }
    );
  }
}

export const customerStore = new CustomerStore();
