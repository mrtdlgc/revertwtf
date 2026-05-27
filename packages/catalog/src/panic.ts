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

export function describePanic(code: string): string {
  const normalized = code.toLowerCase().startsWith("0x") ? code.toLowerCase() : `0x${code}`;
  // Pad single-digit hex like 0x1 -> 0x01
  const padded = normalized.length === 3 ? `0x0${normalized.slice(2)}` : normalized;
  return PANIC_CODES[padded] ?? "Unknown panic code";
}
