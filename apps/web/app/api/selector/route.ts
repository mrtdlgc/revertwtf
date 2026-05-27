import { lookupSelector } from "@revertwtf/selectors";
import { corsPreflight, errorResponse, jsonResponse, readJsonBody, readStringField } from "../_lib/http";
import { withRateLimit } from "../_lib/rateLimit";

export const runtime = "nodejs";

async function handlePost(request: Request): Promise<Response> {
  const body = await readJsonBody(request);
  const selector = readStringField(body, "selector");
  if (selector === null) return errorResponse("selector must be a string");
  if (!selector.trim()) return jsonResponse([]);

  try {
    return jsonResponse(lookupSelector(selector.trim()), 200, { "cache-control": "public, max-age=60" });
  } catch (err) {
    return errorResponse((err as Error).message, 500);
  }
}

export const POST = withRateLimit("selector", handlePost);

export function OPTIONS(): Response {
  return corsPreflight();
}
