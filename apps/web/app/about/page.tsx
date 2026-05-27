import { DocShell } from "@/components/DocShell";
import { CATALOG_SHARDS_URL, REPO_URL } from "@/lib/site";

export const metadata = { title: "about - revert.wtf" };

export default function Page() {
  return (
    <DocShell kicker="/about" title="about">
      <p>
        <strong>revert.wtf</strong> explains EVM errors across revert bytes,
        JSON-RPC/provider responses, wallets, libraries, protocols, ERC-4337,
        and x402 payment flows.
      </p>
      <p>
        Error codes are usually not supposed to be the whole answer. There is
        often a known reason, a protocol-specific condition, or a practical next
        step that users and support teams can act on.
      </p>

      <h2 className="font-display text-4xl mt-8">why it exists</h2>
      <p>
        Many platforms and providers stop at vague messages such as
        <code> execution reverted</code>, <code> -32000</code>, or
        <code> Internal JSON-RPC error</code>. We built a reusable catalog so
        protocols can document those errors and products can show better
        explanations at the point of failure.
      </p>

      <h2 className="font-display text-4xl mt-8">for agents</h2>
      <p>
        The MCP server gives agents a focused place to look up EVM, RPC,
        provider, wallet, account-abstraction, protocol, and x402 errors without
        doing a broad web search. The repo also includes OpenClaw skill files
        for agents working directly on catalog, parser, MCP, frontend, and
        release-readiness tasks.
      </p>

      <h2 className="font-display text-4xl mt-8">data and privacy</h2>
      <p>
        The paste box is designed for local triage in the browser. Catalog
        entries are reusable data with source notes and references.
      </p>

      <h2 className="font-display text-4xl mt-8">source</h2>
      <p>
        The canonical project repository is public on GitHub. It contains the
        <a href={CATALOG_SHARDS_URL} target="_blank" rel="noreferrer" className="brutal-link">
          catalog shards
        </a>, parser packages, API routes, MCP server, CLI, docs, and frontend
        code that power the site.
      </p>
      <p>
        <a href={REPO_URL} target="_blank" rel="noreferrer" className="brutal-button bg-ink text-acid">
          open source repo
        </a>
      </p>

      <h2 className="font-display text-4xl mt-8">license</h2>
      <p>MIT. Catalog entries are intended to be reusable with attribution.</p>
    </DocShell>
  );
}
