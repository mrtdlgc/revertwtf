"use client";

import { useRef, useState } from "react";
import type { DecodedRevert } from "@revertwtf/core";

const MAX_PASTE_CHARS = 64_000;

type DecodeState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; result: DecodedRevert }
  | { status: "error"; error: string };

export function RevertDecoder() {
  const [data, setData] = useState("");
  const [abiText, setAbiText] = useState("");
  const [state, setState] = useState<DecodeState>({ status: "idle" });
  const dataRef = useRef("");
  const abiRef = useRef("");

  function updateData(next: string) {
    dataRef.current = next;
    setData(next);
    if (state.status !== "idle") setState({ status: "idle" });
  }

  function updateAbi(next: string) {
    abiRef.current = next;
    setAbiText(next);
    if (state.status !== "idle") setState({ status: "idle" });
  }

  async function decode() {
    const requestData = dataRef.current;
    const requestAbi = abiRef.current;
    if (!requestData.trim()) {
      setState({ status: "idle" });
      return;
    }

    setState({ status: "loading" });
    try {
      const response = await fetch("/api/revert-decode", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          data: requestData.slice(0, MAX_PASTE_CHARS),
          abiText: requestAbi.slice(0, MAX_PASTE_CHARS),
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error ?? "Unable to decode revert data");
      if (dataRef.current !== requestData || abiRef.current !== requestAbi) return;
      if (payload === null) setState({ status: "idle" });
      else setState({ status: "ready", result: payload as DecodedRevert });
    } catch (err) {
      if (dataRef.current === requestData && abiRef.current === requestAbi) {
        setState({ status: "error", error: (err as Error).message });
      }
    }
  }

  return (
    <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-6">
      <div className="space-y-4">
        <label className="block terminal-panel p-4">
          <span className="brutal-tag bg-acid text-ink mb-3">revert bytes</span>
          <textarea
            className="terminal-input w-full min-h-[170px] p-4 resize-y"
            placeholder="0x08c379a0..."
            value={data}
            onChange={(e) => updateData(e.target.value)}
            spellCheck={false}
          />
        </label>

        <label className="block brutal-card-flat bg-chalk p-4">
          <span className="brutal-tag mb-3">optional ABI</span>
          <textarea
            className="brutal-input font-mono min-h-[130px] resize-y"
            placeholder='[{"type":"error","name":"InsufficientBalance","inputs":[{"type":"uint256"},{"type":"uint256"}]}]'
            value={abiText}
            onChange={(e) => updateAbi(e.target.value)}
            spellCheck={false}
          />
        </label>

        <button
          type="button"
          className="brutal-button bg-acid text-ink"
          onClick={decode}
          disabled={!data.trim() || state.status === "loading"}
        >
          decode
        </button>
      </div>

      <div className="brutal-card bg-paper p-5 min-h-[260px]">
        <p className="brutal-tag bg-cyan mb-3">decoded</p>
        {state.status === "loading" && <p className="text-sm text-ink/65">Decoding...</p>}
        {state.status === "error" && (
          <p className="border-3 border-ink bg-blood p-3 font-extrabold text-paper">{state.error}</p>
        )}
        {state.status === "ready" && (
          <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
{JSON.stringify(state.result, null, 2)}
          </pre>
        )}
        {state.status === "idle" && <p className="text-sm text-ink/65">Paste bytes, then decode.</p>}
      </div>
    </div>
  );
}
