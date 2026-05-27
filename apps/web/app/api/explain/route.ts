import { explain } from "@revertwtf/parser/explain";
import { corsPreflight, errorResponse, jsonResponse, parsePastedInput, readJsonBody, readStringField } from "../_lib/http";
import { withRateLimit } from "../_lib/rateLimit";

export const runtime = "nodejs";

async function handlePost(request: Request): Promise<Response> {
  const body = await readJsonBody(request);
  const raw = readStringField(body, "raw");
  if (raw === null) return errorResponse("raw must be a string");
  if (!raw.trim()) return jsonResponse(null);

  try {
    return jsonResponse(explain(parsePastedInput(raw)));
  } catch (err) {
    return errorResponse((err as Error).message, 500);
  }
}

export const POST = withRateLimit("explain", handlePost);

export function OPTIONS(): Response {
  return corsPreflight();
}
