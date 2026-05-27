import type { Evidence, NormalizedError } from "@revertwtf/core";
import { getCatalog, type CatalogEntry, type CatalogPattern } from "@revertwtf/catalog";

export interface CatalogMatch {
  entry: CatalogEntry;
  evidence: Evidence[];
}

interface CatalogPatternRef {
  entry: CatalogEntry;
  pattern: CatalogPattern;
  needle?: string;
  regex?: RegExp;
}

interface CatalogIndex {
  selectors: Map<string, CatalogPatternRef[]>;
  exactReasons: Map<string, CatalogPatternRef[]>;
  jsonCode: Map<string, CatalogPatternRef[]>;
  otherJsonPaths: CatalogPatternRef[];
  substrings: CatalogPatternRef[];
  aaCodes: CatalogPatternRef[];
  regexFallback: CatalogPatternRef[];
}

interface PatternMatchContext {
  lowerMessages: NormalizedError["messages"];
  upperMessages: NormalizedError["messages"];
  lowerErrorName?: string;
}

let catalogIndex: CatalogIndex | undefined;

export function matchCatalog(normalized: NormalizedError): CatalogMatch[] {
  const index = getCatalogIndex();
  const context = createPatternMatchContext(normalized);
  const candidates = new Set<CatalogEntry>();

  const considerRef = (ref: CatalogPatternRef | undefined): void => {
    if (ref && testPattern(ref.pattern, normalized, context, ref)) candidates.add(ref.entry);
  };

  const considerRefs = (refs: CatalogPatternRef[] | undefined): void => {
    for (const ref of refs ?? []) {
      considerRef(ref);
    }
  };

  for (const rd of normalized.revertData) {
    considerRefs(index.selectors.get(rd.data.slice(0, 10).toLowerCase()));
  }

  for (const code of normalized.codes) {
    considerRefs(index.jsonCode.get(String(code.value)));
  }

  for (const reason of messageReasonCandidates(normalized)) {
    considerRefs(index.exactReasons.get(reason));
  }

  for (const ref of index.substrings) considerRef(ref);
  for (const ref of index.aaCodes) considerRef(ref);
  for (const ref of index.otherJsonPaths) considerRef(ref);
  for (const ref of index.regexFallback) considerRef(ref);

  const matches: CatalogMatch[] = [];
  for (const entry of candidates) {
    const match = evaluateEntry(entry, normalized, context);
    if (match) matches.push(match);
  }

  return matches.sort(compareMatches);
}

function evaluateEntry(
  entry: CatalogEntry,
  normalized: NormalizedError,
  context: PatternMatchContext,
): CatalogMatch | null {
  const patternEvidence: Evidence[] = [];
  const requirementEvidence: Evidence[] = [];
  let requirementsSatisfied = true;

  for (const pattern of entry.patterns) {
    const ev = testPattern(pattern, normalized, context);
    if (ev) patternEvidence.push(ev);
  }

  for (const pattern of entry.requires ?? []) {
    const ev = testPattern(pattern, normalized, context);
    if (!ev) {
      requirementsSatisfied = false;
      break;
    }
    requirementEvidence.push(ev);
  }

  if (requirementsSatisfied && patternEvidence.length > 0) {
    const evidence = [...patternEvidence, ...requirementEvidence];
    evidence.push({
      type: "catalog_entry",
      value: entry.id,
      source: "@revertwtf/catalog",
    });
    return { entry, evidence };
  }

  return null;
}

function getCatalogIndex(): CatalogIndex {
  if (catalogIndex) return catalogIndex;

  const index: CatalogIndex = {
    selectors: new Map(),
    exactReasons: new Map(),
    jsonCode: new Map(),
    otherJsonPaths: [],
    substrings: [],
    aaCodes: [],
    regexFallback: [],
  };

  for (const entry of getCatalog()) {
    for (const pattern of entry.patterns) {
      const ref = createPatternRef(entry, pattern);
      switch (pattern.type) {
        case "selector":
          addRef(index.selectors, pattern.value.toLowerCase(), ref);
          break;
        case "json_path":
          if (pattern.path.toLowerCase() === "code") addRef(index.jsonCode, String(pattern.equals), ref);
          else index.otherJsonPaths.push(ref);
          break;
        case "aa_code":
          index.aaCodes.push(ref);
          break;
        case "substring":
          index.substrings.push(ref);
          break;
        case "regex": {
          const exactReason = exactReasonForPattern(entry, pattern);
          if (exactReason) addRef(index.exactReasons, reasonKey(exactReason), ref);
          else index.regexFallback.push(ref);
          break;
        }
      }
    }
  }

  catalogIndex = index;
  return index;
}

function createPatternRef(entry: CatalogEntry, pattern: CatalogPattern): CatalogPatternRef {
  return {
    entry,
    pattern,
    needle: pattern.type === "substring" && !pattern.caseSensitive ? pattern.value.toLowerCase() : undefined,
    regex: pattern.type === "regex" ? new RegExp(pattern.value, pattern.flags) : undefined,
  };
}

function createPatternMatchContext(normalized: NormalizedError): PatternMatchContext {
  return {
    lowerMessages: normalized.messages.map((m) => ({ value: m.value.toLowerCase(), path: m.path })),
    upperMessages: normalized.messages.map((m) => ({ value: m.value.toUpperCase(), path: m.path })),
    lowerErrorName: normalized.errorName?.toLowerCase(),
  };
}

function addRef(map: Map<string, CatalogPatternRef[]>, key: string, ref: CatalogPatternRef): void {
  const refs = map.get(key) ?? [];
  refs.push(ref);
  map.set(key, refs);
}

function exactReasonForPattern(entry: CatalogEntry, pattern: CatalogPattern): string | null {
  if (pattern.type !== "regex") return null;

  const example = entry.examples?.find((value) => /^execution reverted:/i.test(value));
  if (example) return example.replace(/^execution reverted:\s*/i, "");

  const summary = entry.summary.match(/revert reason string:\s*(.*)\.$/i);
  return summary?.[1] ?? null;
}

function messageReasonCandidates(normalized: NormalizedError): string[] {
  const candidates = new Set<string>();
  for (const message of normalized.messages) {
    const trimmed = trimReason(message.value);
    if (trimmed) candidates.add(reasonKey(trimmed));

    const match = message.value.match(
      /(?:execution reverted(?: with reason string)?|reverted with reason string|revert(?:ed)?)\s*:?\s*['"]?([\s\S]*?)['"]?\s*$/i,
    );
    const reason = trimReason(match?.[1] ?? "");
    if (reason) candidates.add(reasonKey(reason));
  }
  if (normalized.errorName) candidates.add(reasonKey(normalized.errorName));
  return [...candidates];
}

function trimReason(value: string): string {
  let next = value.trim();
  while (
    (next.startsWith("\"") && next.endsWith("\"")) ||
    (next.startsWith("'") && next.endsWith("'"))
  ) {
    next = next.slice(1, -1).trim();
  }
  return next;
}

function reasonKey(value: string): string {
  return trimReason(value).toLowerCase();
}

function testPattern(
  pattern: CatalogPattern,
  n: NormalizedError,
  context: PatternMatchContext,
  ref?: CatalogPatternRef,
): Evidence | null {
  switch (pattern.type) {
    case "substring": {
      const needle = pattern.caseSensitive ? pattern.value : (ref?.needle ?? pattern.value.toLowerCase());
      const messages = pattern.caseSensitive ? n.messages : context.lowerMessages;
      for (const m of messages) {
        if (m.value.includes(needle)) {
          return {
            type: "matched_pattern",
            value: `substring: "${pattern.value}"`,
            path: m.path,
          };
        }
      }
      // Also check errorName
      if (n.errorName) {
        const hay = pattern.caseSensitive ? n.errorName : (context.lowerErrorName ?? "");
        if (hay.includes(needle)) return { type: "matched_pattern", value: `substring: "${pattern.value}"`, path: "errorName" };
      }
      return null;
    }
    case "regex": {
      const re = ref?.regex ?? new RegExp(pattern.value, pattern.flags);
      for (const m of n.messages) {
        re.lastIndex = 0;
        if (re.test(m.value)) {
          return { type: "matched_pattern", value: `regex: ${pattern.value}`, path: m.path };
        }
      }
      return null;
    }
    case "json_path": {
      const value = readPath(n.raw, pattern.path);
      if (value !== undefined && value === pattern.equals) {
        return {
          type: pattern.path.toLowerCase().includes("code") ? "json_rpc_code" : "matched_pattern",
          value: `${pattern.path} == ${String(pattern.equals)}`,
          path: pattern.path,
        };
      }
      // Also try codes recursively
      if (pattern.path.toLowerCase() === "code") {
        for (const c of n.codes) {
          if (c.value === pattern.equals) {
            return { type: "json_rpc_code", value: `code == ${String(pattern.equals)}`, path: c.path };
          }
        }
      }
      return null;
    }
    case "selector": {
      for (const rd of n.revertData) {
        if (rd.data.toLowerCase().startsWith(pattern.value.toLowerCase())) {
          return { type: "revert_selector", value: pattern.value, path: rd.path };
        }
      }
      return null;
    }
    case "aa_code": {
      const code = pattern.value.toUpperCase();
      for (const m of context.upperMessages) {
        if (m.value.includes(code)) {
          return { type: "aa_code", value: code, path: m.path };
        }
      }
      return null;
    }
  }
}

function readPath(obj: unknown, path: string): unknown {
  if (!path) return undefined;
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur === null || cur === undefined || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

function compareMatches(a: CatalogMatch, b: CatalogMatch): number {
  return matchScore(b) - matchScore(a);
}

function matchScore(match: CatalogMatch): number {
  return match.evidence.reduce((score, ev) => score + evidenceWeight(ev.type) + evidenceSpecificity(ev), entryPriority(match.entry));
}

function evidenceWeight(type: Evidence["type"]): number {
  switch (type) {
    case "decoded_error":
    case "panic_code":
    case "revert_selector":
    case "aa_code":
    case "abi":
      return 100;
    case "matched_pattern":
    case "message_heuristic":
      return 80;
    case "library_code":
      return 60;
    case "json_rpc_code":
      return 20;
    case "trace":
      return 40;
    case "catalog_entry":
      return 0;
  }
}

function evidenceSpecificity(ev: Evidence): number {
  if (ev.type !== "matched_pattern") return 0;
  return Math.min(ev.value.length, 200) / 1000;
}

function entryPriority(entry: CatalogEntry): number {
  if (entry.source === "ethereum-protocol" && entry.category !== "revert") return 25;
  return 0;
}
