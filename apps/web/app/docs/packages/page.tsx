import { DocShell } from "@/components/DocShell";
import Link from "next/link";

const PKGS = [
  { name: "@revertwtf/core", role: "Shared types and hex helpers." },
  { name: "@revertwtf/catalog", role: "Full catalog loader and stats. Tiny panic helpers live at @revertwtf/catalog/panic." },
  { name: "@revertwtf/selectors", role: "Built-in 4-byte selector lookup. Use @revertwtf/selectors/data only when you need the raw table." },
  { name: "@revertwtf/parser", role: "Light subpaths for normalize, extract, trace, and decode; catalog-backed explain lives at @revertwtf/parser/explain." },
  { name: "@revertwtf/aa", role: "ERC-4337 helpers with subpaths for parse, codes, EntryPoint decoding, and explain." },
  { name: "@revertwtf/client", role: "Tiny fetch SDK for the hosted or self-hosted API. Browser-safe and catalog-free." },
  { name: "@revertwtf/search", role: "Server-side SQLite FTS index for fast catalog search, filters, and exact lookup." },
  { name: "@revertwtf/cli", role: "CLI for decode, explain, aa, and catalog commands." },
  { name: "@revertwtf/mcp", role: "Read-only MCP server for agents: explain, search catalog, resolve selectors, and inspect Blockscout chains." },
];

export const metadata = { title: "packages - revert.wtf" };

export default function Page() {
  return (
    <DocShell kicker="/docs/packages" title="packages">
      <p>Every package is independent and consumable. The website is just one consumer.</p>
      <p className="mt-4">
        Browser apps should keep the full catalog on a server/API path. Use the
        smaller package subpaths when you only need panic codes, AA code parsing,
        revert-data decoding, or selector lookup.
      </p>
      <p className="mt-4">
        For hosted browser integrations, use <Link href="/docs/api" className="brutal-link">the public API</Link>{" "}
        through <span className="font-mono">@revertwtf/client</span>.
      </p>
      <ul className="grid sm:grid-cols-2 gap-3 mt-6">
        {PKGS.map((p) => (
          <li key={p.name} className="brutal-card-flat bg-paper p-4">
            <p className="font-mono text-sm font-extrabold">{p.name}</p>
            <p className="text-sm mt-2 text-ink/75">{p.role}</p>
          </li>
        ))}
      </ul>
      <p className="mt-6">All packages are MIT licensed and meant to be useful outside the website.</p>
    </DocShell>
  );
}
