"use client";

import { useRef, useState } from "react";
import type { DecodedRevert, Explanation, NormalizedError } from "@revertwtf/core";
import { REPO_ERROR_REPORT_URL } from "@/lib/site";
import { ExplanationCard } from "./ExplanationCard";

const EXAMPLES: { label: string; payload: string }[] = [
  {
    label: "trace frame",
    payload: JSON.stringify(
      {
        trace: [
          {
            type: "CALL",
            contractName: "USDC",
            functionName: "transferFrom",
            error: "execution reverted",
            output:
              "0x08c379a00000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000002645524332303a207472616e7366657220616d6f756e7420657863656564732062616c616e63650000000000000000000000000000000000000000000000000000",
          },
        ],
      },
      null,
      2,
    ),
  },
  {
    label: "-32603 nested",
    payload: JSON.stringify(
      {
        code: -32603,
        message: "Internal JSON-RPC error",
        data: {
          code: 3,
          data:
            "0x08c379a00000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000002645524332303a207472616e7366657220616d6f756e7420657863656564732062616c616e63650000000000000000000000000000000000000000000000000000",
        },
      },
      null,
      2,
    ),
  },
  {
    label: "Panic(0x11)",
    payload:
      "0x4e487b710000000000000000000000000000000000000000000000000000000000000011",
  },
  {
    label: "AA23",
    payload: 'FailedOp(0, "AA23 reverted or OOG")',
  },
  {
    label: "4001",
    payload: JSON.stringify({ code: 4001, message: "User rejected the request" }, null, 2),
  },
  {
    label: "x402",
    payload: JSON.stringify(
      {
        isValid: false,
        invalidReason: "invalid_exact_evm_payload_signature",
        invalidMessage: "EVM signature verification failed",
      },
      null,
      2,
    ),
  },
  {
    label: "Ownable",
    payload: "execution reverted: Ownable: caller is not the owner",
  },
];

const MAX_PASTE_CHARS = 64_000;

interface ExplainApiResult {
  normalized: NormalizedError;
  decoded: { data: string; path: string; result: DecodedRevert }[];
  explanations: Explanation[];
}

type DecodeState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; result: ExplainApiResult }
  | { status: "error"; error: string };

export function ErrorPasteBox({ compact = false }: { compact?: boolean }) {
  const [raw, setRaw] = useState("");
  const [state, setState] = useState<DecodeState>({ status: "idle" });
  const rawRef = useRef("");

  const truncated = raw.length > MAX_PASTE_CHARS;

  function updateRaw(next: string) {
    rawRef.current = next;
    setRaw(next);
    if (state.status !== "idle") setState({ status: "idle" });
  }

  function clearRaw() {
    updateRaw("");
  }

  async function parseRaw() {
    const requestRaw = rawRef.current;
    if (!requestRaw.trim()) {
      setState({ status: "idle" });
      return;
    }

    setState({ status: "loading" });
    try {
      const response = await fetch("/api/explain", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ raw: requestRaw.slice(0, MAX_PASTE_CHARS) }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error ?? "Unable to parse error");
      if (rawRef.current !== requestRaw) return;
      if (payload === null) setState({ status: "idle" });
      else setState({ status: "ready", result: payload as ExplainApiResult });
    } catch (err) {
      if (rawRef.current === requestRaw) setState({ status: "error", error: (err as Error).message });
    }
  }

  return (
    <div className={compact ? "space-y-4" : "space-y-6"}>
      <div className="terminal-panel overflow-hidden">
        <div className="grid grid-cols-[30px_minmax(0,1fr)] items-stretch border-b border-paper/20 bg-ink text-paper sm:grid-cols-[38px_minmax(0,1fr)_auto]">
          <div className="evidence-rail" aria-hidden />
          <div className="min-w-0 px-3 py-3 sm:px-4">
            <p className="text-[10px] uppercase tracking-wide2 text-paper/50">intake://raw-failure</p>
            <p className="font-display text-4xl leading-none text-acid">black box</p>
          </div>
          <div className="hidden items-center gap-2 p-3 sm:flex">
            <button
              type="button"
              className="brutal-button bg-acid text-ink"
              onClick={parseRaw}
              disabled={!raw.trim() || state.status === "loading"}
            >
              parse
            </button>
            <button type="button" className="brutal-button-ghost bg-paper text-ink" onClick={clearRaw}>
              clear
            </button>
          </div>
        </div>

        <div className="grid grid-cols-[30px_minmax(0,1fr)] sm:grid-cols-[38px_minmax(0,1fr)]">
          <div className="intake-gutter border-r border-paper/15 px-2 py-4 text-right font-mono text-[10px] leading-7 text-acid/60 select-none" aria-hidden>
            01<br />02<br />03<br />04<br />05<br />06<br />07<br />08
          </div>
          <div className="p-4">
            <textarea
              className={`terminal-input w-full resize-y p-4 text-sm leading-relaxed ${compact ? "min-h-[310px]" : "min-h-[220px]"}`}
              placeholder='{"code":-32603,"message":"Internal JSON-RPC error","data":{...}}'
              value={raw}
              onChange={(e) => updateRaw(e.target.value)}
              spellCheck={false}
            />
          </div>
        </div>

        <div className="border-t border-paper/15 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-bone/70">
            <span className="min-w-0 break-words">
              {raw.trim() ? `${raw.length.toLocaleString()} chars` : "paste raw JSON, hex, string, or trace payload"}
              {truncated && ` - truncated to ${MAX_PASTE_CHARS.toLocaleString()} for parsing`}
            </span>
            <span className="flex items-center gap-2">
              <button
                type="button"
                className="brutal-button bg-acid text-ink sm:hidden"
                onClick={parseRaw}
                disabled={!raw.trim() || state.status === "loading"}
              >
                parse
              </button>
              <button type="button" className="brutal-button-ghost bg-paper text-ink sm:hidden" onClick={clearRaw}>
                clear
              </button>
              <span>API parse on request, not stored</span>
            </span>
          </div>
        </div>
      </div>

      <div>
        <p className="brutal-tag mb-2 bg-acid">specimens</p>
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex.label}
              type="button"
              className="brutal-button-ghost slab-link"
              onClick={() => updateRaw(ex.payload)}
            >
              {ex.label}
            </button>
          ))}
        </div>
      </div>

      {state.status === "loading" && (
        <div className="brutal-card-flat p-4 bg-ink text-acid">
          <p className="font-extrabold">parsing...</p>
        </div>
      )}

      {state.status === "error" && (
        <div className="brutal-card-flat p-4 bg-blood text-paper">
          <p className="font-extrabold">parse error: {state.error}</p>
        </div>
      )}

      {state.status === "ready" && (
        <ResultPanel
          rawInput={raw}
          normalized={state.result.normalized}
          decoded={state.result.decoded}
          explanations={state.result.explanations}
        />
      )}
    </div>
  );
}

function ResultPanel({
  rawInput,
  normalized,
  decoded,
  explanations,
}: {
  rawInput: string;
  normalized: NormalizedError;
  decoded: { data: string; path: string; result: DecodedRevert }[];
  explanations: Explanation[];
}) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const primary = explanations[0];
  const issueHref = reportIssueHref(primary);

  async function copyReportJson() {
    const report = buildReportPayload({ rawInput, normalized, decoded, explanations });
    try {
      await copyText(JSON.stringify(report, null, 2));
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  }

  return (
    <section className="space-y-5">
      <header className="brutal-card-flat bg-ink p-4 text-paper overflow-hidden">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-wide2 text-paper/50">triage stack</p>
            <p className="font-display text-4xl leading-none text-acid sm:text-5xl">
              {explanations.length} match{explanations.length === 1 ? "" : "es"}
            </p>
          </div>
          <div className="flex flex-wrap justify-start gap-2 sm:justify-end">
            <button type="button" className="brutal-button bg-acid text-ink" onClick={copyReportJson}>
              {copyState === "copied" ? "report copied" : copyState === "failed" ? "copy failed" : "copy report JSON"}
            </button>
            <a href={issueHref} target="_blank" rel="noreferrer" className="brutal-button-ghost bg-paper text-ink">
              report this error
            </a>
          </div>
          <div className="grid grid-cols-6 gap-1" aria-hidden>
            {Array.from({ length: 18 }).map((_, i) => (
              <span key={i} className={`h-3 w-3 border border-paper/25 ${i < explanations.length ? "bg-acid" : "bg-paper/10"}`} />
            ))}
          </div>
        </div>
      </header>

      <div className="grid gap-5">
        {explanations.map((e, i) => (
          <ExplanationCard key={`${e.id ?? i}-${i}`} explanation={e} index={i} />
        ))}
      </div>

      {decoded.length > 0 && (
        <details className="brutal-card-flat bg-chalk">
          <summary className="cursor-pointer px-4 py-3 bg-ink text-paper font-extrabold uppercase tracking-wide2 text-xs border-b-2 border-ink">
            decoded revert candidates ({decoded.length})
          </summary>
          <ul className="p-4 space-y-3 text-xs">
            {decoded.map((d, i) => (
              <li key={i} className="break-all border-l-4 border-blood pl-3">
                <p className="brutal-tag mb-1">@ {d.path || "root"}</p>
                <p className="font-mono">{d.data}</p>
                <p className="mt-2 text-ink/75">
                  <span className="brutal-tag bg-acid">{d.result.kind}</span>{" "}
                  {d.result.reason && <span>reason: "{d.result.reason}"</span>}
                  {d.result.panicCode && <span>panic: {d.result.panicCode} ({d.result.panicMeaning})</span>}
                  {d.result.name && <span>name: {d.result.name}</span>}
                </p>
              </li>
            ))}
          </ul>
        </details>
      )}

      <details className="brutal-card-flat bg-chalk">
        <summary className="cursor-pointer px-4 py-3 bg-bone font-extrabold uppercase tracking-wide2 text-xs border-b-2 border-ink">
          normalized evidence
        </summary>
        <pre className="p-4 text-xs overflow-x-auto whitespace-pre-wrap">
{JSON.stringify(
  {
    messages: normalized.messages,
    codes: normalized.codes,
    method: normalized.method,
    action: normalized.action,
    errorName: normalized.errorName,
    revertData: normalized.revertData,
    traceFrames: normalized.traceFrames,
  },
  null,
  2,
)}
        </pre>
      </details>
    </section>
  );
}

function reportIssueHref(primary: Explanation | undefined): string {
  const url = new URL(REPO_ERROR_REPORT_URL);
  const id = primary?.id ?? "unknown";
  url.searchParams.set("title", `[error-report]: ${id}`);
  return url.toString();
}

function buildReportPayload({
  rawInput,
  normalized,
  decoded,
  explanations,
}: {
  rawInput: string;
  normalized: NormalizedError;
  decoded: { data: string; path: string; result: DecodedRevert }[];
  explanations: Explanation[];
}) {
  return {
    schemaVersion: 1,
    source: "revert.wtf web",
    createdAt: new Date().toISOString(),
    reportContext: {
      chain: "",
      rpcClientOrExplorer: "",
      wallet: "",
      libraryAndVersion: "",
      txHash: "",
      failurePhase: "",
      contractVerified: "",
      contractAddress: "",
      functionOrCalldataContext: "",
      notes: "",
    },
    redactionChecklist: [
      "Remove private keys, API keys, signatures, customer data, and private calldata before posting publicly.",
    ],
    rawInput: rawInput.slice(0, MAX_PASTE_CHARS),
    rawInputTruncated: rawInput.length > MAX_PASTE_CHARS,
    revertWtfResult: {
      explanations: explanations.map((e) => ({
        id: e.id,
        title: e.title,
        layer: e.layer,
        category: e.category,
        confidence: e.confidence,
        rootCauseKnown: e.rootCauseKnown,
        retryHelpful: e.retryHelpful,
        increasingGasHelpful: e.increasingGasHelpful,
        evidence: e.evidence.slice(0, 12),
      })),
      decoded: decoded.map((d) => ({
        path: d.path,
        data: d.data,
        result: d.result,
      })),
      normalized: {
        messages: normalized.messages,
        codes: normalized.codes,
        method: normalized.method,
        action: normalized.action,
        errorName: normalized.errorName,
        revertData: normalized.revertData,
        traceFrames: normalized.traceFrames,
      },
    },
  };
}

async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.setAttribute("readonly", "true");
  textArea.style.position = "fixed";
  textArea.style.left = "-9999px";
  document.body.appendChild(textArea);
  textArea.select();
  const copied = document.execCommand("copy");
  document.body.removeChild(textArea);
  if (!copied) throw new Error("Unable to copy report JSON");
}
