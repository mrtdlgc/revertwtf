import type { Hex, RevertDataCandidate } from "@revertwtf/core";
import { isHex } from "@revertwtf/core";

// Paths likely to contain revert bytes, in priority order.
const CANDIDATE_KEYS = [
  "data",
  "errorData",
  "revertData",
  "revert_data",
  "reasonData",
  "reason_data",
  "returnData",
  "return_data",
  "originalError",
  "error",
  "info",
  "cause",
  "payload",
  "body",
  "result",
  "receipt",
  "revertReason",
  "revert_reason",
];

const FAILED_OUTPUT_KEYS = new Set(["output", "returnvalue", "return_value"]);

// Keys we should NEVER treat as revert bytes even if hex-shaped (calldata, tx input, etc.).
const FORBIDDEN_KEYS = new Set(["input", "calldata", "txdata", "transaction", "hash", "blockhash"]);

const MAX_DEPTH = 8;

export function extractRevertData(input: unknown): RevertDataCandidate[] {
  const out: RevertDataCandidate[] = [];
  const seen = new Set<unknown>();
  if (typeof input === "string") {
    const trimmed = input.trim();
    if (isHex(trimmed) && trimmed.length >= 10) {
      push(out, trimmed as Hex, "");
    }
  }

  function walk(node: unknown, path: string, depth: number, allowed: boolean, failedContext = false): void {
    if (depth > MAX_DEPTH) return;
    if (node === null || node === undefined) return;
    if (typeof node === "object") {
      if (seen.has(node)) return;
      seen.add(node);
    }

    if (typeof node === "string") {
      // String JSON in `body`-like fields
      const trimmed = node.trim();
      if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        try {
          walk(JSON.parse(trimmed), `${path}<json>`, depth + 1, allowed, failedContext);
        } catch {
          // ignore
        }
        return;
      }
      if (allowed && isHex(node) && node.length >= 10) {
        push(out, node as Hex, path);
      }
      return;
    }

    if (Array.isArray(node)) {
      node.forEach((v, i) => walk(v, `${path}[${i}]`, depth + 1, allowed, failedContext));
      return;
    }

    if (typeof node === "object") {
      const localFailedContext = failedContext || hasFailureSignal(node as Record<string, unknown>);
      for (const [k, v] of Object.entries(node)) {
        const subPath = path === "" ? k : `${path}.${k}`;
        const lower = k.toLowerCase();
        if (FORBIDDEN_KEYS.has(lower)) continue;

        const isCandidateKey = CANDIDATE_KEYS.some((c) => lower === c || lower.endsWith(c.toLowerCase()));
        const isFailedOutputKey = localFailedContext && FAILED_OUTPUT_KEYS.has(lower);
        // Allowed propagates: once we descend through a candidate key, all deeper string hex is fair game.
        walk(v, subPath, depth + 1, allowed || isCandidateKey || isFailedOutputKey, localFailedContext);
      }
    }
  }

  walk(input, "", 0, false);

  // De-dup by data + keep shortest path first
  const dedup = new Map<string, RevertDataCandidate>();
  for (const c of out) {
    const existing = dedup.get(c.data);
    if (!existing || c.path.length < existing.path.length) dedup.set(c.data, c);
  }
  return Array.from(dedup.values());
}

function push(arr: RevertDataCandidate[], data: Hex, path: string): void {
  arr.push({ data: data.toLowerCase() as Hex, path });
}

function hasFailureSignal(record: Record<string, unknown>): boolean {
  if (record.success === false || record.failed === true || record.status === false) return true;
  if (typeof record.status === "number" && record.status === 0) return true;
  if (typeof record.status === "string" && /fail|revert|error/i.test(record.status)) return true;
  for (const key of ["type", "op", "opcode"]) {
    const value = record[key];
    if (typeof value === "string" && /^(REVERT|INVALID)$/i.test(value.trim())) return true;
  }
  for (const key of ["error", "message", "reason", "revertReason", "revert_reason"]) {
    const value = record[key];
    if (typeof value === "string" && /revert|error|fail|out of gas|invalid opcode/i.test(value)) return true;
  }
  return false;
}
