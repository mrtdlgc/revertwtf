import { DocShell } from "@/components/DocShell";

export const metadata = { title: "catalog format - revert.wtf" };

export default function Page() {
  return (
    <DocShell kicker="/docs/catalog-format" title="catalog format">
      <p>Source of truth: JSON shards under <code>packages/catalog/src/data/shards/</code>. Each shard contains <code>CatalogEntry</code> objects:</p>
      <pre className="brutal-card-flat p-4 text-xs overflow-x-auto whitespace-pre-wrap">
{`{
  "id": "rpc-32000-nonce-too-high",
  "title": "nonce too high",
  "layer": "rpc",
  "source": "ethereum-json-rpc",
  "category": "transaction_nonce",
  "patterns": [
    { "type": "substring", "value": "nonce too high" }
  ],
  "requires": [
    { "type": "json_path", "path": "code", "equals": -32000 }
  ],
  "summary": "...",
  "rootCauseKnown": false,
  "likelyCauses": ["..."],
  "nextSteps": ["..."],
  "retryHelpful": "sometimes",
  "increasingGasHelpful": "unknown",
  "confidence": "medium",
  "references": [{ "label": "...", "url": "..." }],
  "related": ["ethers-call-exception"]
}`}
      </pre>

      <h2 className="font-display text-3xl mt-8">pattern types</h2>
      <ul className="space-y-1 list-disc list-inside">
        <li><code>substring</code> - case-insensitive (or sensitive) substring over messages.</li>
        <li><code>regex</code> - JS regex over messages.</li>
        <li><code>json_path</code> - dotted path read against the raw error object.</li>
        <li><code>selector</code> - 4-byte prefix matched against any extracted revert bytes.</li>
        <li><code>aa_code</code> - matches an ERC-4337 AAxx code anywhere in the messages.</li>
      </ul>
      <p className="mt-3"><code>requires</code> uses the same pattern syntax, but every required pattern must match before the entry is emitted. This keeps broad RPC codes such as <code>-32000</code> from creating noisy matches.</p>
      <p className="mt-3">Generated custom-error entries should prefer selector patterns. Generated revert reason strings should use exact reason regexes so short protocol codes do not match unrelated payloads.</p>

      <h2 className="font-display text-3xl mt-8">source lifecycle</h2>
      <p>Shard JSON keeps stable <code>source</code> IDs. Runtime catalog entries are decorated from <code>packages/catalog/src/sources.ts</code> with display names, aliases, notes, and lifecycle labels.</p>
      <ul className="space-y-1 list-disc list-inside mt-3">
        <li><code>legacy</code> - deprecated, wound down, or historical coverage retained because old contracts can still emit real errors.</li>
        <li><code>sunsetting</code> - still relevant, but tied to an announced shutdown date.</li>
        <li><code>renamed</code> - ecosystem branding or token naming changed while coverage remains useful.</li>
      </ul>

      <h2 className="font-display text-3xl mt-8">enum fields</h2>
      <ul className="space-y-1 list-disc list-inside">
        <li><code>layer</code>: evm | rpc | provider | wallet | library | account_abstraction | protocol | unknown</li>
        <li><code>confidence</code>: high | medium | low</li>
        <li><code>retryHelpful</code> / <code>increasingGasHelpful</code>: yes | no | sometimes | unknown</li>
      </ul>

      <h2 className="font-display text-3xl mt-8">validation</h2>
      <p>Run <code>pnpm catalog:build-data</code>, <code>pnpm validate:catalog</code>, and <code>pnpm catalog:duplicates</code> before opening a PR. Validation checks unique IDs, required fields, non-empty causes/steps, and that <code>related</code> IDs exist. The duplicate audit also flags suspicious same-source selector clones.</p>
    </DocShell>
  );
}
