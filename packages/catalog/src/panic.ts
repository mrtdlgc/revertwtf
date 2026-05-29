export const PANIC_CODES: Record<string, string> = {
  "0x00": "Generic compiler-inserted panic",
  "0x01": "assert(false) was called",
  "0x11": "Arithmetic overflow or underflow",
  "0x12": "Division or modulo by zero",
  "0x21": "Invalid enum conversion (value out of range)",
  "0x22": "Incorrectly encoded storage byte array",
  "0x31": ".pop() called on an empty array",
  "0x32": "Array index out of bounds",
  "0x41": "Memory allocation overflow / too much memory or array too large",
  "0x51": "Call to an uninitialized internal function variable",
};

export const INVALID_PANIC_CODE = "Invalid panic code: expected 0x-prefixed hex, for example 0x11";

const PANIC_CODE_RE = /^0x[0-9a-fA-F]+$/i;

export function normalizePanicCode(code: unknown): string | null {
  if (typeof code !== "string") return null;

  const trimmed = code.trim();
  if (!PANIC_CODE_RE.test(trimmed)) return null;

  const digits = trimmed.slice(2).replace(/^0+(?=[0-9a-fA-F])/, "").toLowerCase();
  const padded = digits.length % 2 === 1 ? `0${digits}` : digits;
  return `0x${padded}`;
}

export function describePanic(code: unknown): string {
  const normalized = normalizePanicCode(code);
  if (!normalized) return INVALID_PANIC_CODE;

  return PANIC_CODES[normalized] ?? "Unknown panic code";
}
