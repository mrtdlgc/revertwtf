import { DocShell } from "@/components/DocShell";

export const metadata = { title: "contributing - revert.wtf" };

export default function Page() {
  return (
    <DocShell kicker="/docs/contributing" title="contributing errors">
      <p>Catalog PRs are the main way to contribute. Keep each PR small and evidence-backed.</p>
      <ol className="space-y-2 list-decimal list-inside">
        <li>Fork the repo.</li>
        <li>Add an entry to the matching shard under <code>packages/catalog/src/data/shards/</code>.</li>
        <li>Add a fixture in <code>fixtures/&lt;layer&gt;/&lt;slug&gt;.json</code>.</li>
        <li>Run <code>pnpm catalog:build-data</code>, <code>pnpm validate:catalog</code>, <code>pnpm catalog:duplicates</code>, and <code>pnpm test</code>.</li>
        <li>Open the PR with a source link or redacted real-world error.</li>
      </ol>

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
