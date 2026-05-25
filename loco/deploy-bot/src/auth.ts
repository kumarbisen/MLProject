import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const SECRET =
  process.env.JWT_SECRET ?? "locus-dev-secret-change-in-production";

export function signToken(userId: string, ttlHours = 168): string {
  const exp = Date.now() + ttlHours * 3600 * 1000;
  const payload = Buffer.from(JSON.stringify({ userId, exp })).toString(
    "base64url"
  );
  const sig = createHmac("sha256", SECRET).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyToken(
  token: string | undefined
): { userId: string } | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;

  const expected = createHmac("sha256", SECRET)
    .update(payload)
    .digest("base64url");

  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }

  try {
    const data = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    ) as { userId: string; exp: number };
    if (!data.userId || Date.now() > data.exp) return null;
    return { userId: data.userId };
  } catch {
    return null;
  }
}

export function authHeader(req: {
  headers: { authorization?: string };
}): string | undefined {
  const raw = req.headers.authorization;
  if (!raw?.startsWith("Bearer ")) return undefined;
  return raw.slice(7);
}

export function newUserId(): string {
  return `user_${randomBytes(8).toString("hex")}`;
}

export function newAppId(): string {
  return `app_${randomBytes(8).toString("hex")}`;
}
