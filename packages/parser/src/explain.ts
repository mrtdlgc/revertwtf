import type { DecodedRevert, Evidence, Explanation, NormalizedError } from "@revertwtf/core";
import type { Abi } from "viem";
import { MAX_RAW_INPUT_CHARS, normalizeError } from "./normalizeError.js";
import { decodeRevertData } from "./decodeRevertData.js";
import { matchCatalog } from "./matchCatalog.js";

export interface ExplainOptions {
  abi?: Abi;
}

export interface ExplainResult {
  normalized: NormalizedError;
  decoded: { data: string; path: string; result: DecodedRevert }[];
  explanations: Explanation[];
}

export function explain(input: unknown, options: ExplainOptions = {}): ExplainResult {
  const capped = typeof input === "string" && input.length > MAX_RAW_INPUT_CHARS
    ? input.slice(0, MAX_RAW_INPUT_CHARS)
    : input;
  const normalized = normalizeError(capped);

  const decoded = normalized.revertData.map((rd) => ({
    data: rd.data,
    path: rd.path,
    result: decodeRevertData(rd.data, { abi: options.abi }),
  }));

  const explanations: Explanation[] = [];

  const traceFrame = normalized.traceFrames.at(-1);
  if (traceFrame) {
    const where = traceFrame.functionName ?? traceFrame.contractName ?? traceFrame.to ?? "call frame";
    const reason = traceFrame.revertReason ?? traceFrame.error;
    const evidence: Evidence[] = [
      { type: "trace", value: `failed frame: ${where}`, path: traceFrame.path },
    ];
    if (reason) evidence.push({ type: "message_heuristic", value: reason, path: traceFrame.path });
    if (traceFrame.output) evidence.push({ type: "revert_selector", value: traceFrame.output.slice(0, 10), path: traceFrame.path });

    explanations.push({
      id: "trace-failed-call",
      title: `Failed trace frame: ${where}`,
      layer: "evm",
      category: "trace",
      summary: reason
        ? `A simulation/debug trace reports a failed call at ${traceFrame.path}: ${reason}.`
        : `A simulation/debug trace reports a failed call at ${traceFrame.path}.`,
      rootCauseKnown: Boolean(reason || traceFrame.output),
      likelyCauses: [
        "The outer transaction failed because this inner call frame reverted or hit an EVM error.",
        "The failing frame is usually closer to the real cause than the top-level JSON-RPC wrapper.",
      ],
      nextSteps: [
        "Inspect the failing frame's decoded function inputs and caller/receiver addresses.",
        "If revert bytes are present, decode them and map the selector or reason to the contract source.",
        "Check balances, approvals, deadlines, paused state, ownership, and slippage for that exact call.",
      ],
      retryHelpful: "no",
      increasingGasHelpful: reason && /out of gas/i.test(reason) ? "sometimes" : "no",
      confidence: "high",
      evidence,
    });
  }

  // 1. Add explanations from decoded standard reverts (Error(string), Panic)
  for (const d of decoded) {
    if (d.result.kind === "error_string") {
      const errEvidence: Evidence[] = [
        { type: "decoded_error", value: `Error("${d.result.reason ?? ""}")`, path: d.path, source: "standard-solidity" },
        { type: "revert_selector", value: "0x08c379a0", path: d.path },
      ];
      explanations.push({
        id: "decoded-error-string",
        title: `Error: ${d.result.reason ?? "(empty)"}`,
        layer: "evm",
        category: "revert",
        summary: `Solidity revert reason: \"${d.result.reason ?? ""}\".`,
        rootCauseKnown: true,
        likelyCauses: [`A require() or revert() with this exact message was hit on-chain.`],
        nextSteps: [
          "Search the contract source for this string to find the failing require.",
          "Verify the precondition (allowance, balance, paused, owner, deadline) that the require enforces.",
        ],
        retryHelpful: "no",
        increasingGasHelpful: "no",
        confidence: "high",
        evidence: errEvidence,
        decoded: d.result,
      });
    } else if (d.result.kind === "panic") {
      explanations.push({
        id: "decoded-panic",
        title: `Panic ${d.result.panicCode}: ${d.result.panicMeaning ?? "unknown panic"}`,
        layer: "evm",
        category: "panic",
        summary: `Solidity Panic(${d.result.panicCode}) - ${d.result.panicMeaning ?? "unknown"}.`,
        rootCauseKnown: true,
        likelyCauses: [d.result.panicMeaning ?? "Unknown panic"],
        nextSteps: [
          "Look at the operation that triggered the panic (arithmetic, array index, etc.) and guard it.",
        ],
        retryHelpful: "no",
        increasingGasHelpful: "no",
        confidence: "high",
        evidence: [
          { type: "panic_code", value: d.result.panicCode ?? "?", path: d.path, source: "standard-solidity" },
        ],
        decoded: d.result,
      });
    } else if (d.result.kind === "custom_error" && d.result.source === "provided-abi") {
      explanations.push({
        id: "decoded-custom-error",
        title: `${d.result.name ?? "Custom error"}`,
        layer: "evm",
        category: "revert",
        summary: `Custom error decoded with provided ABI: ${d.result.signature}.`,
        rootCauseKnown: true,
        likelyCauses: [`The contract reverted with ${d.result.name}(...).`],
        nextSteps: ["Inspect the decoded args; look up the custom error in the contract source."],
        retryHelpful: "no",
        increasingGasHelpful: "no",
        confidence: "high",
        evidence: [
          { type: "abi", value: d.result.signature ?? "custom_error", path: d.path, source: "provided-abi" },
        ],
        decoded: d.result,
      });
    } else if (d.result.kind === "custom_error" && d.result.source === "selector-catalog") {
      const sources = Array.from(new Set(d.result.candidates?.map((candidate) => candidate.source) ?? [])).slice(0, 4);
      explanations.push({
        id: "selector-catalog-match",
        title: d.result.name ?? d.result.signature ?? "Known custom error",
        layer: "evm",
        category: "revert",
        summary: sources.length > 0
          ? `Selector matched a known signature: ${d.result.signature} (${sources.join(", ")}).`
          : `Selector matched a known signature: ${d.result.signature}.`,
        rootCauseKnown: true,
        likelyCauses: ["The contract reverted with a known custom error selector."],
        nextSteps: [
          "Cross-reference the source/library shown in the selector candidate.",
          "Decode the custom error arguments with the contract ABI when argument values matter.",
        ],
        retryHelpful: "no",
        increasingGasHelpful: "no",
        confidence: "high",
        evidence: [
          { type: "revert_selector", value: d.result.selector ?? "", path: d.path },
          { type: "abi", value: d.result.signature ?? "", path: d.path, source: "selector-catalog" },
        ],
        decoded: d.result,
      });
    }
  }

  // 2. Catalog matches
  const matches = matchCatalog(normalized);
  for (const m of matches) {
    explanations.push({
      id: m.entry.id,
      title: m.entry.title,
      layer: m.entry.layer,
      category: m.entry.category,
      summary: m.entry.summary,
      rootCauseKnown: m.entry.rootCauseKnown,
      likelyCauses: m.entry.likelyCauses,
      nextSteps: m.entry.nextSteps,
      retryHelpful: m.entry.retryHelpful,
      increasingGasHelpful: m.entry.increasingGasHelpful,
      confidence: m.entry.confidence,
      evidence: m.evidence,
      related: m.entry.related,
      references: m.entry.references,
    });
  }

  if (explanations.length === 0) {
    explanations.push({
      id: "unknown",
      title: "Unknown error",
      layer: "unknown",
      category: "unmatched",
      summary:
        "No catalog entry matched and no standard revert data was decoded. The error shape is unrecognized.",
      rootCauseKnown: false,
      likelyCauses: [
        "Provider returned an unusual error shape.",
        "Revert bytes are absent or nested in an unsupported path.",
        "The error is genuinely novel - please open a catalog PR.",
      ],
      nextSteps: [
        "Try posting the raw error to the project's issue tracker.",
        "If you have revert bytes, run them through /tools/revert-decoder.",
      ],
      retryHelpful: "unknown",
      increasingGasHelpful: "unknown",
      confidence: "low",
      evidence: collectFallbackEvidence(normalized),
    });
  }

  return { normalized, decoded, explanations };
}

function collectFallbackEvidence(n: NormalizedError): Evidence[] {
  const ev: Evidence[] = [];
  for (const m of n.messages.slice(0, 3)) {
    ev.push({ type: "message_heuristic", value: m.value, path: m.path });
  }
  for (const c of n.codes.slice(0, 3)) {
    ev.push({ type: "json_rpc_code", value: String(c.value), path: c.path });
  }
  return ev;
}
