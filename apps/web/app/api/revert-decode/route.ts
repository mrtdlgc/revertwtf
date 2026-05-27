import { decodeRevertData } from "@revertwtf/parser/decode";
import type { DecodeOptions } from "@revertwtf/parser/decode";
import { capInput, corsPreflight, errorResponse, jsonResponse, readJsonBody, readStringField } from "../_lib/http";
import { withRateLimit } from "../_lib/rateLimit";

export const runtime = "nodejs";

async function handlePost(request: Request): Promise<Response> {
  const body = await readJsonBody(request);
  const data = readStringField(body, "data");
  if (data === null) return errorResponse("data must be a string");
  if (!data.trim()) return jsonResponse(null);

  const abiText = readStringField(body, "abiText");
  let abi: DecodeOptions["abi"] | undefined;
  if (abiText?.trim()) {
    try {
      abi = JSON.parse(capInput(abiText)) as DecodeOptions["abi"];
    } catch {
      return errorResponse("ABI is not valid JSON");
    }
  }

  try {
    return jsonResponse(decodeRevertData(capInput(data).trim(), abi ? { abi } : undefined));
  } catch (err) {
    return errorResponse((err as Error).message, 500);
  }
}

export const POST = withRateLimit("revert-decode", handlePost);

export function OPTIONS(): Response {
  return corsPreflight();
}
