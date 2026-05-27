import { decodeEntryPointError } from "@revertwtf/aa/decode-entrypoint";
import { explainAAError } from "@revertwtf/aa/explain";
import { capInput, corsPreflight, errorResponse, jsonResponse, readJsonBody, readStringField } from "../_lib/http";
import { withRateLimit } from "../_lib/rateLimit";

export const runtime = "nodejs";

async function handlePost(request: Request): Promise<Response> {
  const body = await readJsonBody(request);
  const raw = readStringField(body, "raw");
  if (raw === null) return errorResponse("raw must be a string");
  if (!raw.trim()) return jsonResponse(null);

  const bounded = capInput(raw).trim();
  try {
    return jsonResponse({
      explanations: explainAAError(bounded),
      decoded: /^0x[0-9a-fA-F]+$/.test(bounded) ? decodeEntryPointError(bounded) : null,
    });
  } catch (err) {
    return errorResponse((err as Error).message, 500);
  }
}

export const POST = withRateLimit("aa-decode", handlePost);

export function OPTIONS(): Response {
  return corsPreflight();
}
