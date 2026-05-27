import { listEntrySummaries } from "@revertwtf/search";
import { corsPreflight, errorResponse, jsonResponse, readJsonBody, readStringField } from "../_lib/http";
import { withRateLimit } from "../_lib/rateLimit";

export const runtime = "nodejs";

async function handlePost(request: Request): Promise<Response> {
  const body = await readJsonBody(request);
  const query = readStringField(body, "query") ?? "";
  const source = readStringField(body, "source") ?? undefined;
  const layer = readStringField(body, "layer") ?? undefined;
  const category = readStringField(body, "category") ?? undefined;
  const shardId = readStringField(body, "shardId") ?? undefined;
  const limit = readNumberField(body, "limit") ?? 20;
  const offset = readNumberField(body, "offset") ?? 0;

  try {
    return jsonResponse(listEntrySummaries({ query, source, layer, category, shardId, limit, offset }));
  } catch (err) {
    return errorResponse((err as Error).message, 500);
  }
}

export const POST = withRateLimit("search", handlePost);

export function OPTIONS(): Response {
  return corsPreflight();
}

function readNumberField(body: unknown, field: string): number | undefined {
  if (!body || typeof body !== "object") return undefined;
  const value = (body as Record<string, unknown>)[field];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}
