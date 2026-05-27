"use client";

import { useRef, useState } from "react";
import type { SignatureCandidate } from "@revertwtf/core";

type SelectorState =
  | { status: "idle"; results: SignatureCandidate[] }
  | { status: "loading"; results: SignatureCandidate[] }
  | { status: "ready"; results: SignatureCandidate[] }
  | { status: "error"; error: string; results: SignatureCandidate[] };

export function SelectorResolver({ selectorCount }: { selectorCount: number }) {
  const [sel, setSel] = useState("");
  const [state, setState] = useState<SelectorState>({ status: "idle", results: [] });
  const selectorRef = useRef("");

  function updateSelector(next: string) {
    selectorRef.current = next;
    setSel(next);
    if (!next.trim()) setState({ status: "idle", results: [] });
  }

  async function resolve() {
    const requestSelector = selectorRef.current;
    if (!requestSelector.trim()) {
      setState({ status: "idle", results: [] });
      return;
    }

    setState((current) => ({ status: "loading", results: current.results }));
    try {
      const response = await fetch("/api/selector", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ selector: requestSelector }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error ?? "Unable to resolve selector");
      if (selectorRef.current !== requestSelector) return;
      setState({ status: "ready", results: payload as SignatureCandidate[] });
    } catch (err) {
      if (selectorRef.current === requestSelector) {
        setState((current) => ({ status: "error", error: (err as Error).message, results: current.results }));
      }
    }
  }

  const results = state.results;

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-[0.8fr_1.2fr] gap-5">
        <label className="block terminal-panel p-4">
          <span className="brutal-tag bg-acid text-ink mb-3">4-byte selector</span>
          <input
            className="terminal-input w-full p-4 text-lg"
            placeholder="0x08c379a0"
            value={sel}
            onChange={(e) => updateSelector(e.target.value)}
            spellCheck={false}
          />
          <button
            type="button"
            className="brutal-button bg-acid text-ink mt-3"
            onClick={resolve}
            disabled={!sel.trim() || state.status === "loading"}
          >
            resolve
          </button>
        </label>

        <div className="brutal-card bg-chalk p-4 min-h-[150px]">
          <p className="brutal-tag bg-cyan mb-3">matches</p>
          {state.status === "loading" && <p className="text-sm text-ink/65">Resolving...</p>}
          {state.status === "error" && <p className="border-2 border-ink bg-blood p-3 text-paper">{state.error}</p>}
          {state.status !== "loading" && results.length > 0 ? (
            <ul className="grid gap-2">
              {results.map((r, i) => (
                <li key={i} className="border-2 border-ink bg-paper p-3">
                  <p className="brutal-tag bg-acid mb-2">{r.confidence}</p>
                  <p className="font-mono break-all">{r.signature}</p>
                  <p className="text-xs text-ink/70 mt-1">source: {r.source}</p>
                </li>
              ))}
            </ul>
          ) : state.status === "ready" && sel.trim() ? (
            <p className="border-2 border-ink bg-bone p-3">no built-in match</p>
          ) : state.status === "idle" ? (
            <p className="text-sm text-ink/65">Enter a selector, then resolve.</p>
          ) : null}
        </div>
      </div>

      <details className="brutal-card-flat bg-chalk">
        <summary className="cursor-pointer px-4 py-3 bg-ink text-paper border-b-2 border-ink font-extrabold uppercase tracking-wide2 text-xs">
          built-in selectors ({selectorCount.toLocaleString()})
        </summary>
        <div className="p-4 text-sm text-ink/70">
          Selector lookup runs on the server so the browser does not download the full table.
        </div>
      </details>
    </div>
  );
}
