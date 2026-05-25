const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export type ApiUser = {
  userId: string;
  email: string;
  displayName: string;
  creditsUsd: number;
  limitPercent: number;
};

export type ApiApp = {
  appId: string;
  userId: string;
  storeId?: string;
  title: string;
  description: string;
  qualityGrade: string | null;
  publishUnlocked: boolean;
  previewUrl?: string;
  status?: string;
  productCount?: number;
};

export type ApiMessage = {
  id: string;
  appId: string;
  source: "user" | "bot" | "system" | "telegram";
  content: string;
  isInstruction?: boolean;
  createdAt: string;
};

export type ApiActivity = {
  id: string;
  appId: string;
  kind: string;
  title: string;
  detail?: string;
  createdAt: string;
};

export type ApiAgent = {
  userId: string;
  task: string;
  status: string;
  lastActiveAt: string;
  label?: string;
};

function headers(token?: string | null): HeadersInit {
  const h: HeadersInit = { "Content-Type": "application/json" };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { ...headers(token), ...options.headers },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error ?? res.statusText);
  }
  return data as T;
}

export const api = {
  login: (email: string, password: string) =>
    request<{ token: string; user: ApiUser }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  register: (
    email: string,
    password: string,
    displayName: string
  ) =>
    request<{ token: string; user: ApiUser }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, displayName }),
    }),

  me: (token: string) =>
    request<{ user: ApiUser }>("/api/auth/me", {}, token),

  agent: (token: string) =>
    request<{ agent: ApiAgent }>("/api/customer/agent", {}, token),

  credits: (token: string) =>
    request<{ creditsUsd: number; limitPercent: number }>(
      "/api/customer/credits",
      {},
      token
    ),

  apps: (token: string) =>
    request<{ apps: ApiApp[] }>("/api/customer/apps", {}, token),

  app: (token: string, appId: string) =>
    request<{ app: ApiApp; store: unknown }>(
      `/api/customer/apps/${appId}`,
      {},
      token
    ),

  messages: (token: string, appId: string) =>
    request<{ messages: ApiMessage[] }>(
      `/api/customer/apps/${appId}/messages`,
      {},
      token
    ),

  sendMessage: (token: string, appId: string, content: string) =>
    request<{ message: ApiMessage }>(
      `/api/customer/apps/${appId}/messages`,
      { method: "POST", body: JSON.stringify({ content }) },
      token
    ),

  activity: (token: string, appId: string) =>
    request<{ logs: ApiActivity[]; live: boolean; total: number }>(
      `/api/customer/apps/${appId}/activity`,
      {},
      token
    ),

  clearActivity: (token: string, appId: string) =>
    request<{ cleared: boolean }>(
      `/api/customer/apps/${appId}/activity`,
      { method: "DELETE" },
      token
    ),

  createApp: (
    token: string,
    body: { title?: string; description?: string; nichePrompt: string }
  ) =>
    request<{ app: ApiApp }>(
      "/api/customer/apps",
      { method: "POST", body: JSON.stringify(body) },
      token
    ),

  publish: (token: string, appId: string) =>
    request<{ published: boolean; previewUrl?: string }>(
      `/api/customer/apps/${appId}/publish`,
      { method: "POST" },
      token
    ),

  previewUrl: (appId: string) =>
    `${API_URL}/api/customer/apps/${appId}/preview`,
};

export { API_URL };
