"use client";

import { useRef, useState } from "react";
import type { DecodedRevert, Explanation } from "@revertwtf/core";
import { ExplanationCard } from "./ExplanationCard";

const MAX_PASTE_CHARS = 64_000;

interface KnownAACode {
  code: string;
  message: string;
  category: string;
}

interface DecodedEntryPointError {
  kind: "FailedOp" | "FailedOpWithRevert" | "SignatureValidationFailed" | "unknown";
  opIndex?: string;
  reason?: string;
  aaCode?: KnownAACode | null;
  inner?: string;
  innerDecoded?: DecodedRevert;
  aggregator?: string;
  raw: string;
}

interface AADecodeResult {
  explanations: Explanation[];
  decoded: DecodedEntryPointError | null;
}

type DecodeState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; result: AADecodeResult }
  | { status: "error"; error: string };

export function AADecoder({ knownCodes }: { knownCodes: KnownAACode[] }) {
  const [raw, setRaw] = useState("");
  const [state, setState] = useState<DecodeState>({ status: "idle" });
  const rawRef = useRef("");

  function updateRaw(next: string) {
    rawRef.current = next;
    setRaw(next);
    if (state.status !== "idle") setState({ status: "idle" });
  }

  async function decode() {
    const requestRaw = rawRef.current;
    if (!requestRaw.trim()) {
      setState({ status: "idle" });
      return;
    }

    setState({ status: "loading" });
    try {
      const response = await fetch("/api/aa-decode", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ raw: requestRaw.slice(0, MAX_PASTE_CHARS) }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error ?? "Unable to decode AA error");
      if (rawRef.current !== requestRaw) return;
      if (payload === null) setState({ status: "idle" });
      else setState({ status: "ready", result: payload as AADecodeResult });
    } catch (err) {
      if (rawRef.current === requestRaw) setState({ status: "error", error: (err as Error).message });
    }
  }

  return (
    <div className="space-y-6">
      <label className="block terminal-panel p-4">
        <span className="brutal-tag bg-acid text-ink mb-3">AAxx / FailedOp / EntryPoint bytes</span>
        <textarea
          className="terminal-input w-full min-h-[150px] p-4 resize-y"
          placeholder='AA23 reverted or OOG'
          value={raw}
          onChange={(e) => updateRaw(e.target.value)}
          spellCheck={false}
        />
      </label>

      <button
        type="button"
        className="brutal-button bg-acid text-ink"
        onClick={decode}
        disabled={!raw.trim() || state.status === "loading"}
      >
        decode
      </button>

      {state.status === "loading" && (
        <div className="brutal-card-flat p-4 bg-ink text-acid">
          <p className="font-extrabold">decoding...</p>
        </div>
      )}

      {state.status === "error" && (
        <div className="brutal-card-flat p-4 bg-blood text-paper">
          <p className="font-extrabold">decode error: {state.error}</p>
        </div>
      )}

      {state.status === "ready" && state.result.decoded && state.result.decoded.kind !== "unknown" && (
        <div className="brutal-card-flat p-4 bg-bone">
          <p className="brutal-tag bg-cyan mb-2">EntryPoint decoded</p>
          <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
{JSON.stringify(state.result.decoded, null, 2)}
          </pre>
        </div>
      )}

      <div className="grid gap-5">
        {state.status === "ready" && state.result.explanations.map((e, i) => (
          <ExplanationCard key={i} explanation={e} index={i} />
        ))}
      </div>

      <details className="brutal-card-flat bg-chalk">
        <summary className="cursor-pointer px-4 py-3 bg-ink text-paper border-b-2 border-ink font-extrabold uppercase tracking-wide2 text-xs">
          known AA codes ({knownCodes.length})
        </summary>
        <ul className="p-4 grid sm:grid-cols-2 gap-2 text-sm">
          {knownCodes.map((c) => (
            <li key={c.code} className="border-2 border-ink bg-paper p-3">
              <span className="brutal-tag bg-acid mr-2">{c.code}</span>
              <span>{c.message}</span>
              <span className="block text-ink/55 text-xs mt-1">{c.category}</span>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
