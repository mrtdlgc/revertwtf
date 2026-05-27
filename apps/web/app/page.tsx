import Link from "next/link";
import { ErrorPasteBox } from "@/components/ErrorPasteBox";
import { JsonLd } from "@/components/JsonLd";
import { stats } from "@/lib/catalog";
import { REPO_URL } from "@/lib/site";
import { BUILTIN_SELECTORS } from "@revertwtf/selectors/data";

const HOT_SURFACES = [
  "simulation traces",
  "JSON-RPC -32000",
  "custom errors",
  "AAxx failures",
  "wallet prompts",
  "x402 payments",
  "provider limits",
  "Blockscout chains",
];

const BYTE_GRID = [
  "08c3",
  "79a0",
  "4e48",
  "7b71",
  "aa23",
  "3200",
  "6093",
  "x402",
  "4337",
  "3668",
  "1474",
  "1193",
  "7702",
  "4844",
  "panic",
  "trace",
];

export default function HomePage() {
  const s = stats();
  const selectorCount = BUILTIN_SELECTORS.length;
  const protocolCount = s.byLayer.protocol ?? 0;
  const providerCount = s.byLayer.provider ?? 0;

  return (
    <>
      <JsonLd data={homeJsonLd(s.total, selectorCount)} />
      <section className="relative overflow-hidden border-b-2 border-paper/20 bg-ink text-paper topology-bg">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-8 pb-12 lg:pt-10 lg:pb-16 grid xl:grid-cols-[0.78fr_1.22fr] gap-8 xl:gap-12 items-start">
          <div className="min-w-0">
            <div className="inline-grid max-w-full grid-cols-1 overflow-hidden border border-paper/25 bg-paper/5 sm:grid-cols-[auto_1fr]">
              <span className="bg-acid px-3 py-2 text-xs font-black uppercase tracking-wide2 text-ink">live</span>
              <span className="min-w-0 px-3 py-2 text-xs uppercase tracking-wide2 text-paper/60">EVM error explanations</span>
            </div>

            <h1 className="mt-5 font-display text-5xl leading-[0.78] text-paper sm:text-6xl md:text-7xl lg:text-8xl">
              revert<span className="text-acid">.</span>wtf
            </h1>

            <p className="mt-5 max-w-xl text-base leading-relaxed text-paper/75">
              EVM errors do not have to stay vague. Paste a revert, RPC/provider
              error, wallet failure, trace, AA error, or x402 payload and get the
              likely meaning, supporting evidence, and actions to take next.
            </p>

            <div className="mt-7 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Metric value={formatMetric(s.total)} title={s.total.toLocaleString()} label="entries" loud />
              <Metric value={formatMetric(selectorCount)} title={selectorCount.toLocaleString()} label="selectors" />
              <Metric value={formatMetric(protocolCount)} title={protocolCount.toLocaleString()} label="protocol" />
              <Metric value={formatMetric(providerCount)} title={providerCount.toLocaleString()} label="provider" />
            </div>

            <SpecimenPlate total={s.total} selectors={selectorCount} />
          </div>

          <div className="relative min-w-0 pt-4 md:pt-0">
            <ErrorPasteBox compact />
          </div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pb-8">
          <div className="grid grid-cols-2 overflow-hidden border border-paper/20 bg-paper/5 md:grid-cols-4 lg:grid-cols-8">
            {HOT_SURFACES.map((item, i) => (
              <div key={item} className="min-w-0 border-r border-t border-paper/10 px-3 py-3 text-xs uppercase tracking-wide2 text-paper/70 break-words">
                <span className="text-acid">{String(i + 1).padStart(2, "0")}</span> {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b-2 border-ink bg-paper text-ink paper-texture">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 grid lg:grid-cols-[0.7fr_1.3fr] gap-8 items-start">
          <div>
            <p className="brutal-tag bg-blood text-paper">method</p>
            <h2 className="mt-4 font-display text-5xl leading-[0.86] sm:text-6xl md:text-7xl">
              errors with explanations and next steps.
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <Pillar n="01" title="identify the error" body="Read selectors, revert bytes, JSON-RPC codes, wallet prompts, AA codes, traces, panic bytes, and x402 responses." />
            <Pillar n="02" title="surface the action" body="Explain likely causes and practical checks instead of leaving users with wrappers like -32000 or execution reverted." />
            <Pillar n="03" title="integrate the catalog" body="Use the catalog in apps, support consoles, protocol docs, CLI workflows, MCP servers, and agent skill files." />
          </div>
        </div>
      </section>

      <section className="border-b-2 border-ink bg-chalk text-ink">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 grid lg:grid-cols-[0.74fr_1.26fr] gap-10">
          <div>
            <p className="brutal-tag bg-acid">workbench</p>
            <h2 className="mt-3 font-display text-5xl leading-none sm:text-6xl">decoders</h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-ink/75">
              Focused surfaces for when the evidence type is already known.
            </p>
          </div>
          <ul className="grid sm:grid-cols-2 gap-3">
            <ToolLink href="/tools/revert-decoder" name="revert decoder" subtitle="raw bytes to Error, Panic, or custom error" accent="bg-acid" />
            <ToolLink href="/tools/panic-decoder" name="panic decoder" subtitle="Solidity Panic codes in plain English" accent="bg-amber" />
            <ToolLink href="/tools/aa-error-decoder" name="aa decoder" subtitle="FailedOp and AAxx failures" accent="bg-cyan" />
            <ToolLink href="/tools/rpc-error-parser" name="rpc parser" subtitle="JSON-RPC and provider envelopes" accent="bg-bone" />
            <ToolLink href="/tools/selector-resolver" name="selector resolver" subtitle="4-byte selector lookup" accent="bg-violet text-paper" />
            <ToolLink href="/docs/mcp" name="MCP server" subtitle="read-only tools for agents" accent="bg-blood text-paper" />
          </ul>
        </div>
      </section>

      <section className="bg-ink text-paper ink-noise">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 grid lg:grid-cols-[1fr_auto] gap-8 items-center">
          <div>
            <p className="brutal-tag bg-acid text-ink">open catalog</p>
            <h2 className="mt-4 font-display text-5xl leading-none text-acid sm:text-6xl">
              coverage protocols can actually use.
            </h2>
            <p className="mt-4 max-w-2xl text-sm text-paper/70 leading-relaxed">
              The catalog collects protocol, provider, wallet, library, AA, and
              x402 errors with explanations, likely causes, next steps, and
              references that products and agents can point to.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/docs/contributing" className="brutal-button bg-acid text-ink">
              contribute
            </Link>
            <a href={REPO_URL} target="_blank" rel="noreferrer" className="brutal-button bg-cyan text-ink">
              source repo
            </a>
            <Link href="/errors" className="brutal-button bg-paper text-ink">
              browse errors
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

function homeJsonLd(totalEntries: number, selectorCount: number) {
  return [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "revert.wtf",
      url: "https://revert.wtf",
      description:
        "EVM error explanations for revert bytes, JSON-RPC responses, wallet failures, simulation traces, ERC-4337 errors, and x402 payloads.",
      sameAs: [REPO_URL],
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareSourceCode",
      name: "revert.wtf",
      codeRepository: REPO_URL,
      license: "https://opensource.org/license/mit",
      programmingLanguage: "TypeScript",
      runtimePlatform: "Node.js",
      keywords: ["EVM errors", "revert reasons", "RPC errors", "ERC-4337", "x402"],
      about: `${totalEntries.toLocaleString()} catalog entries and ${selectorCount.toLocaleString()} selector signatures`,
    },
  ];
}

function SpecimenPlate({ total, selectors }: { total: number; selectors: number }) {
  return (
    <div className="specimen-frame mt-8 p-5 md:p-6">
      <div className="relative z-10 grid gap-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-wide2 text-paper/50">selector spectrogram</p>
            <p className="font-display text-5xl leading-none text-acid">0xWHY</p>
          </div>
          <div className="text-left text-xs uppercase tracking-wide2 text-paper/50 sm:text-right">
            <p>{total.toLocaleString()} catalog rows</p>
            <p>{selectors.toLocaleString()} selector signatures</p>
          </div>
        </div>

        <div className="byte-lattice">
          {BYTE_GRID.map((cell, i) => (
            <span
              key={cell}
              className={`byte-cell ${i % 7 === 0 ? "warn" : i % 5 === 0 ? "cool" : i % 3 === 0 ? "hot" : ""}`}
            >
              {cell}
            </span>
          ))}
        </div>

        <div className="grid gap-4 border-t border-paper/20 pt-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <p className="text-xs leading-relaxed text-paper/60">
            panic, provider, wallet, protocol, ecosystem, account abstraction,
            and x402 failure surfaces share one catalog of explanations.
          </p>
          <Link href="/catalog" className="brutal-button-ghost bg-paper text-ink slab-link">
            catalog
          </Link>
        </div>
      </div>
    </div>
  );
}

function formatMetric(value: number) {
  if (value < 1_000) return value.toLocaleString();
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  })
    .format(value)
    .replace("K", "k");
}

function Metric({ value, title, label, loud }: { value: string; title: string; label: string; loud?: boolean }) {
  return (
    <div
      className={`min-w-0 overflow-hidden border-2 border-paper/30 p-3 ${loud ? "bg-acid text-ink shadow-[5px_5px_0_#ff3d65]" : "bg-paper/10 text-paper"}`}
      title={title}
    >
      <p className="metric-value font-display">{value}</p>
      <p className="mt-1 text-[10px] uppercase tracking-wide2 font-extrabold opacity-65">{label}</p>
    </div>
  );
}

function Pillar({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="brutal-card p-5 bg-chalk min-h-[220px]">
      <p className="font-display text-7xl text-blood leading-none">{n}</p>
      <p className="mt-2 font-extrabold text-2xl">{title}</p>
      <p className="mt-3 text-sm leading-relaxed text-ink/75">{body}</p>
    </div>
  );
}

function ToolLink({
  href,
  name,
  subtitle,
  accent,
}: {
  href: string;
  name: string;
  subtitle: string;
  accent: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="group slab-link brutal-card-flat bg-paper p-4 flex items-stretch gap-4 hover:-translate-y-1 transition-transform min-h-[104px]"
      >
        <span className={`w-3 shrink-0 border-2 border-ink ${accent}`} aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block font-extrabold text-lg leading-tight">{name}</span>
          <span className="block text-xs mt-1 text-ink/65">{subtitle}</span>
        </span>
        <span className="hidden shrink-0 font-display text-4xl leading-none group-hover:text-blood sm:block">-&gt;</span>
      </Link>
    </li>
  );
}
