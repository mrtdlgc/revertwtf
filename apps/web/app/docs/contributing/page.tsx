import { DocShell } from "@/components/DocShell";
import { CATALOG_SHARDS_URL, REPO_ERROR_REPORT_URL, REPO_URL } from "@/lib/site";

export const metadata = { title: "contributing - revert.wtf" };

export default function Page() {
  return (
    <DocShell kicker="/docs/contributing" title="contributing errors">
      <p>Report weird errors first when the evidence is thin. Catalog PRs should stay small and evidence-backed.</p>
      <p>
        <a href={REPO_ERROR_REPORT_URL} target="_blank" rel="noreferrer" className="brutal-button bg-acid text-ink">
          report an error
        </a>
      </p>

      <h2 className="font-display text-4xl mt-8">report path</h2>
      <ul className="space-y-1 list-disc list-inside">
        <li>Use reports for unknown errors, weak wrapper matches, incorrect explanations, or missing execution context.</li>
        <li>Include chain, RPC/client, wallet, library version, tx hash when public, and whether it failed before or after submit.</li>
        <li>Paste the copied report JSON after redacting secrets and private calldata.</li>
      </ul>

      <h2 className="font-display text-4xl mt-8">catalog PR path</h2>
      <ol className="space-y-2 list-decimal list-inside">
        <li>
          Fork the{" "}
          <a href={REPO_URL} target="_blank" rel="noreferrer" className="brutal-link">
            revert.wtf repo
          </a>.
        </li>
        <li>
          Add an entry to the matching shard under{" "}
          <a href={CATALOG_SHARDS_URL} target="_blank" rel="noreferrer" className="brutal-link">
            <code>packages/catalog/src/data/shards/</code>
          </a>.
        </li>
        <li>Add a fixture in <code>fixtures/&lt;layer&gt;/&lt;slug&gt;.json</code>.</li>
        <li>Run <code>pnpm catalog:build-data</code>, <code>pnpm validate:catalog</code>, <code>pnpm catalog:duplicates</code>, and <code>pnpm test</code>.</li>
        <li>Open the PR with a source link or redacted real-world error.</li>
      </ol>
      <p>
        <a href={REPO_URL} target="_blank" rel="noreferrer" className="brutal-button bg-ink text-acid">
          open source repo
        </a>
      </p>

      <h2 className="font-display text-4xl mt-8">style</h2>
      <ul className="space-y-1 list-disc list-inside">
        <li>Use concrete <code>likelyCauses</code>. No generic fallback prose.</li>
        <li>Use actionable <code>nextSteps</code>. Prefer field names and exact checks.</li>
        <li>Set <code>confidence: high</code> only for exact ABI, standard, or catalog matches.</li>
        <li>Mark <code>rootCauseKnown: false</code> for wrappers when the cause is one layer deeper.</li>
      </ul>
    </DocShell>
  );
}
