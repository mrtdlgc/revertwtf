import { AA_CODES, lookupAACode, type AACodeInfo } from "./codes.js";

const AA_RE = /\bAA(\d{2})\b([^,)"]*)?/;

export function parseAACode(input: string): AACodeInfo | null {
  const m = AA_RE.exec(input);
  if (!m) return null;
  const code = `AA${m[1]}`;
  const found = lookupAACode(code);
  if (found) return found;
  return { code, message: (m[2] ?? "").trim() || "unknown AA code", category: "unknown" };
}

export function listKnownAACodes(): AACodeInfo[] {
  return Object.values(AA_CODES);
}
