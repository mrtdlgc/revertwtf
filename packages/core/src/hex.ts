import type { Hex } from "./types.js";

const HEX_RE = /^0x[0-9a-fA-F]*$/;

export function isHex(value: unknown): value is Hex {
  return typeof value === "string" && HEX_RE.test(value);
}

export function normalizeHex(value: string): Hex | null {
  if (!HEX_RE.test(value)) return null;
  return `0x${value.slice(2).toLowerCase()}` as Hex;
}

export function hexLength(value: Hex): number {
  return (value.length - 2) / 2;
}

export function selectorOf(value: Hex): Hex | null {
  if (value.length < 10) return null;
  return value.slice(0, 10).toLowerCase() as Hex;
}

export function bodyAfterSelector(value: Hex): Hex {
  if (value.length < 10) return "0x" as Hex;
  return `0x${value.slice(10)}` as Hex;
}
