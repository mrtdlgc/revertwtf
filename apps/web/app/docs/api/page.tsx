import { DocShell } from "@/components/DocShell";

export const metadata = { title: "public API - revert.wtf" };

const BASE = "https://revert.wtf";

const ROUTES = [
  {
    name: "Explain an error",
    path: "/api/explain",
    body: '{ "raw": "{\\"code\\":-32000,\\"message\\":\\"nonce too low\\"}" }',
    response: "{ normalized, decoded, explanations }",
  },
  {
    name: "Decode revert data",
    path: "/api/revert-decode",
    body: '{ "data": "0x4e487b71...", "abiText": "[...]" }',
    response: "DecodedRevert | null",
  },
  {
    name: "Decode AA failure",
    path: "/api/aa-decode",
    body: '{ "raw": "AA23 reverted or OOG" }',
    response: "{ explanations, decoded } | null",
  },
  {
    name: "Resolve selector",
    path: "/api/selector",
    body: '{ "selector": "0x08c379a0" }',
    response: "SignatureCandidate[]",
  },
  {
    name: "Search catalog",
    path: "/api/search",
    body: '{ "query": "AA23", "limit": 20, "offset": 0 }',
    response: "{ entries, totalMatches, returned, limit, offset, hasMore }",
  },
];

export default function Page() {
  return (
    <DocShell kicker="/docs/api" title="public API">
      <p>
        The hosted API exposes the same parser surfaces used by the web tools
        without making browser apps bundle catalog data.
      </p>

      <div className="mt-6 brutal-card-flat bg-acid p-4">
        <p className="font-extrabold">Use the tiny client SDK when you can.</p>
        <pre className="mt-3 overflow-x-auto text-xs">
{`import { createRevertClient } from "@revertwtf/client";

const revert = createRevertClient();
const explanations = await revert.explain('{"code":-32000,"message":"nonce too low"}');
const matches = await revert.searchCatalog({ query: "AA23", limit: 20 });`}
        </pre>
      </div>

      <h2 className="font-display text-5xl leading-none mt-8">routes</h2>
      <div className="mt-4 grid gap-4">
        {ROUTES.map((route) => (
          <section key={route.path} className="brutal-card-flat bg-paper p-4">
            <p className="brutal-tag bg-cyan mb-2">POST {route.path}</p>
            <h3 className="text-2xl font-extrabold">{route.name}</h3>
            <p className="mt-2 text-sm text-ink/70">Response: <code>{route.response}</code></p>
            <pre className="mt-3 overflow-x-auto bg-ink p-3 text-xs text-paper">
{`curl -s ${BASE}${route.path} \\
  -H "content-type: application/json" \\
  -d '${route.body}'`}
            </pre>
          </section>
        ))}
      </div>

      <h2 className="font-display text-5xl leading-none mt-8">limits and CORS</h2>
      <p>
        CORS is open with <code>access-control-allow-origin: *</code> and no
        credentials. Preflight requests use <code>OPTIONS</code>. Requests are
        rate-limited per route and identity; a <code>429</code> response includes
        <code>retry-after</code>, <code>x-ratelimit-limit-minute</code>,
        <code>x-ratelimit-limit-hour</code>, <code>x-ratelimit-remaining-minute</code>,
        and <code>x-ratelimit-remaining-hour</code>. These headers are exposed to
        browser clients through CORS.
      </p>
      <p>
        Optional API keys use the <code>x-revertwtf-key</code> header. If this
        deployment configures an allowlist, requests must include a valid key.
        Without a key, the limiter identifies callers from <code>cf-connecting-ip</code>,
        <code>x-real-ip</code>, then the first <code>x-forwarded-for</code> value.
        If none are visible, the request uses the anonymous fallback bucket.
      </p>

      <h2 className="font-display text-5xl leading-none mt-8">self-hosting</h2>
      <p>
        The routes are MIT-licensed with the rest of the repo. You can self-host
        the Next.js app or copy <code>apps/web/app/api/</code> into your own app,
        then pass <code>baseUrl</code> to <code>@revertwtf/client</code>.
      </p>
      <p>
        The public endpoint is best-effort and intended for lightweight product
        integrations, agents, demos, and debugging tools. For higher limits,
        self-host or open an issue.
      </p>
    </DocShell>
  );
}
