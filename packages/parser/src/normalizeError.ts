import type { NormalizedError } from "@revertwtf/core";
import { extractRevertData } from "./extractRevertData.js";
import { extractTraceFailures } from "./extractTraceFailures.js";

const MESSAGE_KEYS = new Set([
  "message",
  "reason",
  "shortmessage",
  "details",
  "detail",
  "description",
  "title",
  "msg",
  "error",
  "errormessage",
  "error_message",
  "statusmessage",
  "status_message",
  "revertreason",
  "revert_reason",
  "failurereason",
  "failure_reason",
  "decodederror",
  "decoded_error",
]);
const CODE_KEYS = new Set(["code", "errorcode", "error_code", "statuscode", "status_code"]);

const MAX_DEPTH = 8;
// Cap any single normalized string value to keep catalog regex matching bounded.
// Real-world error messages are well under this; longer payloads are almost always
// pasted logs or accidental dumps, and the parser only needs the head to classify.
const MAX_MESSAGE_CHARS = 4_000;
// Hard cap on string inputs before JSON.parse / walk. Anything larger is truncated.
// 64 KiB easily covers any real error blob, including trace dumps; bigger pastes
// are almost always accidental log spew and cost serial regex time per catalog entry.
export const MAX_RAW_INPUT_CHARS = 64_000;

function clampMessage(value: string): string {
  return value.length <= MAX_MESSAGE_CHARS ? value : value.slice(0, MAX_MESSAGE_CHARS);
}

export function normalizeError(input: unknown): NormalizedError {
  const messages: NormalizedError["messages"] = [];
  const codes: NormalizedError["codes"] = [];
  let method: string | undefined;
  let action: string | undefined;
  let errorName: string | undefined;

  if (typeof input === "string") {
    const capped = input.length > MAX_RAW_INPUT_CHARS ? input.slice(0, MAX_RAW_INPUT_CHARS) : input;
    messages.push({ value: clampMessage(capped), path: "" });
    const trimmed = capped.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        walk(JSON.parse(trimmed), "<json>", 0);
      } catch {
        // Keep the raw string message only.
      }
    }
  } else {
    walk(input, "", 0);
  }

  function walk(node: unknown, path: string, depth: number): void {
    if (depth > MAX_DEPTH) return;
    if (node === null || node === undefined) return;
    if (typeof node === "string") return;
    if (Array.isArray(node)) {
      node.forEach((v, i) => walk(v, `${path}[${i}]`, depth + 1));
      return;
    }
    if (typeof node !== "object") return;

    for (const [k, v] of Object.entries(node)) {
      const subPath = path === "" ? k : `${path}.${k}`;
      const lower = k.toLowerCase();
      if (MESSAGE_KEYS.has(k) || MESSAGE_KEYS.has(lower)) {
        if (typeof v === "string" && v.length > 0) messages.push({ value: clampMessage(v), path: subPath });
      } else if (CODE_KEYS.has(k) || CODE_KEYS.has(lower)) {
        if (typeof v === "string" || typeof v === "number") codes.push({ value: v, path: subPath });
      }
      if (k === "method" && typeof v === "string") method = v;
      if (k === "payload" && v && typeof v === "object" && "method" in v) {
        const m = (v as Record<string, unknown>).method;
        if (typeof m === "string") method = m;
      }
      if (k === "action" && typeof v === "string") action = v;
      if ((k === "name" || k === "errorName") && typeof v === "string" && !errorName) errorName = v;

      walk(v, subPath, depth + 1);
    }
  }

  return {
    raw: input,
    messages,
    codes,
    method,
    action,
    errorName,
    revertData: extractRevertData(input),
    traceFrames: extractTraceFailures(input),
  };
}
