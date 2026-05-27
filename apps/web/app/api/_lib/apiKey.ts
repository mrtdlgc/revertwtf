import { createHash } from "node:crypto";

export function readApiKey(request: Request): string | null {
  const raw = request.headers.get("x-revertwtf-key");
  const key = raw?.trim();
  return key ? key : null;
}

export function isApiKeyValid(key: string | null): boolean {
  const allowed = configuredKeys();
  if (allowed.length === 0) return true;
  return Boolean(key && allowed.includes(key));
}

export function apiKeyIdentity(key: string | null): string | null {
  if (!key) return null;
  return `key:${createHash("sha256").update(key).digest("hex").slice(0, 16)}`;
}

export function requestIdentity(request: Request): string {
  const keyIdentity = apiKeyIdentity(readApiKey(request));
  if (keyIdentity) return keyIdentity;

  const ip = request.headers.get("cf-connecting-ip")
    ?? request.headers.get("x-real-ip")
    ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? null;

  return ip ? `ip:${ip}` : "anon";
}

function configuredKeys(): string[] {
  return (process.env.REVERTWTF_API_KEYS ?? "")
    .split(",")
    .map((key) => key.trim())
    .filter(Boolean);
}
