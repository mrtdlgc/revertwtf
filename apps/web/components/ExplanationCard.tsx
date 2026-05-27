import type { Explanation } from "@revertwtf/core";

const LAYER_COLOR: Record<string, string> = {
  evm: "bg-acid text-ink",
  rpc: "bg-cyan text-ink",
  provider: "bg-amber text-ink",
  wallet: "bg-paper text-ink",
  library: "bg-bone text-ink",
  account_abstraction: "bg-violet text-paper",
  protocol: "bg-acid text-ink",
  unknown: "bg-blood text-paper",
};

const CONFIDENCE_COLOR: Record<string, string> = {
  high: "bg-acid text-ink",
  medium: "bg-amber text-ink",
  low: "bg-blood text-paper",
};

export function ExplanationCard({ explanation, index }: { explanation: Explanation; index: number }) {
  const e = explanation;

  return (
    <article className="brutal-card bg-chalk text-ink overflow-hidden">
      <div className="grid lg:grid-cols-[112px_1fr]">
        <aside className="bg-ink text-paper p-4 flex lg:block items-center justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-wide2 text-paper/50">rank</p>
            <p className="font-display text-7xl leading-none text-acid">
              {String(index + 1).padStart(2, "0")}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-1" aria-hidden>
            {Array.from({ length: 12 }).map((_, i) => (
              <span
                key={i}
                className={`h-3 w-3 border border-paper/20 ${
                  i % 5 === 0 ? "bg-blood" : i < 5 ? "bg-acid" : "bg-paper/10"
                }`}
              />
            ))}
          </div>
        </aside>

        <div className="text-ink">
          <header className="border-b-2 border-ink p-4 md:p-5 paper-texture">
            <div className="flex flex-wrap gap-1.5 mb-4">
              <span className={`brutal-tag ${LAYER_COLOR[e.layer] ?? "bg-bone"}`}>{e.layer.replace(/_/g, " ")}</span>
              <span className="brutal-tag bg-paper">{e.category.replace(/_/g, " ")}</span>
              <span className={`brutal-tag ${CONFIDENCE_COLOR[e.confidence]}`}>conf: {e.confidence}</span>
            </div>
            <h3 className="font-extrabold text-2xl leading-tight">{e.title}</h3>
            {e.id && <p className="mt-2 font-mono text-[11px] text-ink/55 break-all">{e.id}</p>}
          </header>

          <div className="p-4 md:p-5 space-y-5 text-ink">
            <p className="text-sm leading-relaxed text-ink/80 border-l-4 border-blood pl-3">{e.summary}</p>

            <div className="grid md:grid-cols-2 gap-4">
              <Section title="likely causes" tone="bg-paper">
                <ul className="space-y-2">
                  {e.likelyCauses.map((cause, i) => (
                    <li key={i} className="grid grid-cols-[18px_1fr] gap-2">
                      <span className="mt-1 h-3 w-3 bg-blood border border-ink" aria-hidden />
                      <span>{cause}</span>
                    </li>
                  ))}
                </ul>
              </Section>

              <Section title="next steps" tone="bg-acid/30">
                <ol className="space-y-2">
                  {e.nextSteps.map((step, i) => (
                    <li key={i} className="grid grid-cols-[24px_1fr] gap-2">
                      <span className="font-display text-2xl leading-none text-blood">{i + 1}</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </Section>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <Badge label="retry" value={e.retryHelpful} />
              <Badge label="gas" value={e.increasingGasHelpful} />
              <Badge label="root" value={e.rootCauseKnown ? "known" : "unknown"} />
            </div>

            {e.evidence.length > 0 && (
              <details className="border-2 border-ink bg-ink text-paper">
                <summary className="cursor-pointer px-3 py-2 bg-ink font-extrabold text-xs uppercase tracking-wide2 border-b border-paper/20">
                  evidence ({e.evidence.length})
                </summary>
                <ul className="p-3 space-y-2 text-xs font-mono">
                  {e.evidence.map((ev, i) => (
                    <li key={i} className="break-all border-l-4 border-acid bg-paper/5 pl-2 py-1">
                      <span className="brutal-tag bg-acid mr-2">{ev.type}</span>
                      <span>{ev.value}</span>
                      {ev.path && <span className="text-paper/50"> @ {ev.path}</span>}
                    </li>
                  ))}
                </ul>
              </details>
            )}

            {e.references && e.references.length > 0 && (
              <div>
                <p className="brutal-tag mb-2 bg-paper">references</p>
                <ul className="flex flex-wrap gap-2 text-sm">
                  {e.references.map((r, i) => (
                    <li key={i}>
                      <a className="brutal-button-ghost slab-link" href={r.url} target="_blank" rel="noreferrer">
                        {r.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function Section({ title, tone, children }: { title: string; tone: string; children: React.ReactNode }) {
  return (
    <div className={`border-2 border-ink ${tone} p-3`}>
      <p className="text-xs font-extrabold uppercase tracking-wide2 text-ink/60 mb-2">{title}</p>
      <div className="text-sm leading-relaxed text-ink/85">{children}</div>
    </div>
  );
}

function Badge({ label, value }: { label: string; value: string | boolean }) {
  const v = String(value);
  const color =
    v === "yes" || v === "known" ? "bg-acid text-ink" :
    v === "no" ? "bg-blood text-paper" :
    "bg-amber text-ink";
  return (
    <span className={`brutal-tag ${color}`}>
      {label}: {v}
    </span>
  );
}
