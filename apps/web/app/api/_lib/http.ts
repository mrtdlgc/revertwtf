export const MAX_API_INPUT_CHARS = 64_000;

export const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type, x-revertwtf-key",
  "access-control-expose-headers":
    "retry-after, x-ratelimit-limit-minute, x-ratelimit-limit-hour, x-ratelimit-remaining-minute, x-ratelimit-remaining-hour",
  "access-control-max-age": "86400",
};

export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export function corsPreflight(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export function jsonResponse(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data, jsonReplacer), {
    status,
    headers: {
      ...CORS_HEADERS,
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...headers,
    },
  });
}

export function errorResponse(message: string, status = 400, headers: Record<string, string> = {}): Response {
  return jsonResponse({ error: message }, status, headers);
}

export function readStringField(body: unknown, field: string): string | null {
  if (!body || typeof body !== "object") return null;
  const value = (body as Record<string, unknown>)[field];
  return typeof value === "string" ? value : null;
}

export function capInput(value: string): string {
  return value.length > MAX_API_INPUT_CHARS ? value.slice(0, MAX_API_INPUT_CHARS) : value;
}

export function parsePastedInput(raw: string): unknown {
  const trimmed = capInput(raw).trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("0x") && /^0x[0-9a-fA-F]+$/.test(trimmed)) {
    return { data: trimmed };
  }
  try {
    return JSON.parse(trimmed);
  } catch {
    return trimmed;
  }
}

function jsonReplacer(_key: string, value: unknown): unknown {
  return typeof value === "bigint" ? value.toString() : value;
}
