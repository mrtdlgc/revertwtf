import type { Hex, TraceFrameSummary } from "@revertwtf/core";
import { isHex } from "@revertwtf/core";

const MAX_DEPTH = 10;
const MAX_FRAMES = 25;

const ERROR_KEYS = [
  "error",
  "errorMessage",
  "error_message",
  "message",
  "reason",
  "revertReason",
  "revert_reason",
  "decodedError",
  "decoded_error",
  "failureReason",
  "failure_reason",
];

const NAME_KEYS = ["functionName", "function_name", "method", "name"];
const CONTRACT_KEYS = ["contractName", "contract_name", "contract"];
const OUTPUT_KEYS = ["output", "returnData", "return_data", "revertData", "revert_data", "data"];

export function extractTraceFailures(input: unknown): TraceFrameSummary[] {
  const frames: TraceFrameSummary[] = [];
  const seen = new Set<unknown>();

  function walk(node: unknown, path: string, depth: number): void {
    if (depth > MAX_DEPTH || frames.length >= MAX_FRAMES) return;
    if (node === null || node === undefined) return;

    if (typeof node === "string") {
      const trimmed = node.trim();
      if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        try {
          walk(JSON.parse(trimmed), path ? `${path}<json>` : "<json>", depth + 1);
        } catch {
          // Ignore non-JSON strings.
        }
      }
      return;
    }

    if (Array.isArray(node)) {
      node.forEach((value, index) => walk(value, `${path}[${index}]`, depth + 1));
      return;
    }

    if (typeof node !== "object") return;
    if (seen.has(node)) return;
    seen.add(node);

    const record = node as Record<string, unknown>;
    if (isTraceContext(path, record) && isFailedFrame(record)) {
      frames.push(summarizeFrame(record, path || "$"));
    }

    for (const [key, value] of Object.entries(record)) {
      const subPath = path === "" ? key : `${path}.${key}`;
      walk(value, subPath, depth + 1);
    }
  }

  walk(input, "", 0);

  return dedupeFrames(frames);
}

function isTraceContext(path: string, record: Record<string, unknown>): boolean {
  if (/(^|[.\[\]])(?:trace|traces|calls|callTrace|call_trace|stack|frames|structLogs)(?:$|[.\[\]])/i.test(path)) return true;
  if (hasOwnString(record, ["functionName", "function_name", "contractName", "contract_name", "opcode", "op"])) return true;
  return Boolean((record.from || record.to) && (record.output || record.gasUsed || record.gas_used || record.type));
}

function isFailedFrame(record: Record<string, unknown>): boolean {
  if (record.success === false || record.failed === true || record.status === false) return true;
  if (typeof record.status === "number" && record.status === 0) return true;
  if (typeof record.status === "string" && /fail|revert|error/i.test(record.status)) return true;

  for (const key of ["type", "op", "opcode"]) {
    const value = record[key];
    if (typeof value === "string" && /^(REVERT|INVALID|SELFDESTRUCT)$/i.test(value.trim())) return true;
  }

  return ERROR_KEYS.some((key) => {
    const value = record[key];
    return typeof value === "string" && /revert|error|fail|out of gas|invalid opcode/i.test(value);
  });
}

function hasOwnString(record: Record<string, unknown>, keys: string[]): boolean {
  return keys.some((key) => typeof record[key] === "string" && record[key].trim().length > 0);
}

function summarizeFrame(record: Record<string, unknown>, path: string): TraceFrameSummary {
  return {
    path,
    type: stringValue(record.type),
    opcode: stringValue(record.opcode) ?? stringValue(record.op),
    from: stringValue(record.from),
    to: stringValue(record.to),
    contractName: firstString(record, CONTRACT_KEYS),
    functionName: findFunctionName(record),
    error: firstString(record, ERROR_KEYS),
    revertReason: firstString(record, ["revertReason", "revert_reason", "reason", "decodedError", "decoded_error"]),
    output: findOutput(record),
    gasUsed: stringValue(record.gasUsed) ?? stringValue(record.gas_used) ?? numberValue(record.gasUsed) ?? numberValue(record.gas_used),
  };
}

function findFunctionName(record: Record<string, unknown>): string | undefined {
  const direct = firstString(record, NAME_KEYS);
  if (direct && !/^(REVERT|CALL|DELEGATECALL|STATICCALL|CREATE|CREATE2)$/i.test(direct)) return direct;

  for (const key of ["decodedInput", "decoded_input", "input", "method"]) {
    const value = record[key];
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const nested = value as Record<string, unknown>;
      const name = firstString(nested, NAME_KEYS);
      if (name) return name;
    }
  }

  return direct;
}

function findOutput(record: Record<string, unknown>): Hex | undefined {
  for (const key of OUTPUT_KEYS) {
    const value = record[key];
    if (typeof value === "string" && isHex(value) && value.length >= 10) return value.toLowerCase() as Hex;
  }
  return undefined;
}

function firstString(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return undefined;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

function dedupeFrames(frames: TraceFrameSummary[]): TraceFrameSummary[] {
  const seen = new Set<string>();
  const out: TraceFrameSummary[] = [];
  for (const frame of frames) {
    const key = `${frame.path}|${frame.error ?? ""}|${frame.revertReason ?? ""}|${frame.output ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(frame);
  }
  return out;
}
