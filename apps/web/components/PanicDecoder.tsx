"use client";

import { useMemo, useState } from "react";
import { describePanic, PANIC_CODES } from "@revertwtf/catalog/panic";

export function PanicDecoder() {
  const [code, setCode] = useState("0x11");
  const meaning = useMemo(() => describePanic(code.trim()), [code]);

  return (
    <div className="grid lg:grid-cols-[0.75fr_1.25fr] gap-6">
      <div className="space-y-4">
        <label className="block terminal-panel p-4">
          <span className="brutal-tag bg-acid text-ink mb-3">panic code</span>
          <input
            className="terminal-input w-full p-4 text-lg"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            spellCheck={false}
          />
        </label>
        <div className="brutal-card bg-acid p-5">
          <p className="brutal-tag bg-paper mb-2">{code}</p>
          <p className="font-display text-4xl leading-[0.92] break-words sm:text-5xl">{meaning}</p>
        </div>
      </div>

      <div>
        <p className="brutal-tag mb-3 bg-paper">all known codes</p>
        <ul className="grid sm:grid-cols-2 gap-2">
          {Object.entries(PANIC_CODES).map(([k, v]) => (
            <li key={k} className="brutal-card-flat bg-chalk p-3">
              <span className="brutal-tag bg-cyan mr-2">{k}</span>
              <span className="text-sm break-words">{v}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
