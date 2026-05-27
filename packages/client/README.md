# @revertwtf/client

Tiny fetch client for the public revert.wtf API. It has no dependency on the
parser, catalog, selector table, or AA package, so browser apps do not bundle
catalog data.

```bash
pnpm add @revertwtf/client
```

```ts
import { createRevertClient } from "@revertwtf/client";

const revert = createRevertClient();
const explanations = await revert.explain('{"code":-32000,"message":"nonce too low"}');
```

Pass an API key only when your self-hosted deployment requires one:

```ts
const revert = createRevertClient({
  apiKey: process.env.REVERTWTF_API_KEY,
  baseUrl: "https://revert.wtf",
});
```

## Methods

```ts
await revert.explain(raw);
await revert.explainFull(raw);
await revert.decodeRevert({ data: "0x4e487b71..." });
await revert.decodeRevert({ data: "0x...", abiText: "[...]" });
await revert.decodeAA({ raw: "AA23 reverted or OOG" });
await revert.resolveSelector("0x08c379a0");
await revert.searchCatalog({ query: "AA23", limit: 20 });
```

## Self-host

The hosted API defaults to `https://revert.wtf`. To self-host, run the Next.js
API routes from `apps/web/app/api/` in your own deployment and pass your URL:

```ts
const revert = createRevertClient({ baseUrl: "https://errors.example.com" });
```

The public hosted endpoint is best-effort, open source, and rate-limited. See
`/docs/api` for request shapes, CORS, API-key headers, and limits.

`RevertApiError` exposes `status`, `retryAfter`, and the parsed response `body`
so apps can distinguish rate limits, validation errors, and service failures.
