import type { Hex, SignatureCandidate } from "@revertwtf/core";
import { selectorIndex } from "./data.js";

export { BUILTIN_SELECTORS } from "./data.js";

export function lookupSelector(selector: Hex | string): SignatureCandidate[] {
  const key = selector.toLowerCase();
  const list = selectorIndex().get(key);
  if (!list) return [];
  return list.map((e) => ({
    selector: e.selector,
    signature: e.signature,
    name: e.name,
    source: e.source,
    confidence: e.confidence,
  }));
}

export function isKnownSelector(selector: Hex | string): boolean {
  return selectorIndex().has(selector.toLowerCase());
}
