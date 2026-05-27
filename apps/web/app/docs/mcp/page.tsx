import { DocShell } from "@/components/DocShell";
import { REPO_URL } from "@/lib/site";

export const metadata = { title: "MCP server - revert.wtf" };

const TOOLS = [
  "explain_error",
  "decode_revert_data",
  "search_catalog",
  "get_error",
  "catalog_stats",
  "list_sources",
  "lookup_selector",
  "explain_aa_error",
  "get_blockscout_chain",
  "search_blockscout_chains",
];

const RESOURCES = [
  "revertwtf://catalog/stats",
  "revertwtf://catalog/sources",
  "revertwtf://catalog/errors/{id}",
  "revertwtf://catalog/sources/{source}",
  "revertwtf://blockscout/chains/{chainId}",
];

const SKILLS = [
  { name: "agent API", path: "skills/revertwtf-agent-api/SKILL.md" },
  { name: "catalog entries", path: "skills/revertwtf-catalog-entry/SKILL.md" },
  { name: "catalog research", path: "skills/revertwtf-catalog-research/SKILL.md" },
  { name: "parser and decoder", path: "skills/revertwtf-parser-decoder/SKILL.md" },
  { name: "MCP server", path: "skills/revertwtf-mcp-server/SKILL.md" },
  { name: "frontend product UI", path: "skills/revertwtf-frontend-product-ui/SKILL.md" },
  { name: "release readiness", path: "skills/revertwtf-release-readiness/SKILL.md" },
];

export default function Page() {
  return (
    <DocShell kicker="/docs/mcp" title="MCP and agent skills">
      <p>
        <span className="font-mono">@revertwtf/mcp</span> gives agents a focused
        place to look up EVM, RPC, provider, wallet, account-abstraction,
        protocol, and x402 errors. Instead of doing a broad internet search, an
        agent can ask the catalog what the error usually means and what to check
        next.
      </p>
      <p className="mt-4">
        Search and listing tools are bounded. Agents get summaries first, then
        fetch a single error by id when they need the full catalog entry.
      </p>

      <pre className="mt-6 brutal-card-flat bg-ink p-4 text-paper overflow-x-auto text-xs">
{`pnpm --filter @revertwtf/mcp build
pnpm --filter @revertwtf/mcp start`}
      </pre>

      <h2 className="font-display text-5xl leading-none mt-8">tools</h2>
      <ul className="mt-4 grid sm:grid-cols-2 gap-3">
        {TOOLS.map((tool) => (
          <li key={tool} className="brutal-card-flat bg-paper p-3 font-mono text-sm font-extrabold">
            {tool}
          </li>
        ))}
      </ul>

      <h2 className="font-display text-5xl leading-none mt-8">resources</h2>
      <ul className="mt-4 grid gap-3">
        {RESOURCES.map((resource) => (
          <li key={resource} className="brutal-card-flat bg-chalk p-3 font-mono text-sm break-all">
            {resource}
          </li>
        ))}
      </ul>

      <h2 className="font-display text-5xl leading-none mt-8">agent skill files</h2>
      <p>
        The repo includes OpenClaw skill files for agents working on this project.
        They cover catalog entries, ecosystem research, parser changes, MCP
        maintenance, frontend UI, and release-readiness checks.
      </p>
      <ul className="mt-4 grid sm:grid-cols-2 gap-3">
        {SKILLS.map((skill) => (
          <li key={skill.path} className="brutal-card-flat bg-paper p-3">
            <a
              href={`${REPO_URL}/blob/main/${skill.path}`}
              target="_blank"
              rel="noreferrer"
              className="brutal-link font-extrabold"
            >
              {skill.name}
            </a>
            <p className="mt-2 font-mono text-xs break-all text-ink/60">{skill.path}</p>
          </li>
        ))}
      </ul>
    </DocShell>
  );
}
