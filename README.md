# revert.wtf

> EVM errors should not be this vague.

Paste a revert, RPC error, ethers/viem exception, simulation/debug trace, or
ERC-4337 failure.
**revert.wtf** explains what it likely means, why it happened, and what to
check next.

The project includes a reusable error catalog for protocols and products, a
CLI, a website, an MCP server for agents, and repo-local OpenClaw skill files
for agents working on the catalog or integration code.

## Monorepo

```
apps/web                  Next.js website (paste-box, encyclopedia, tools, docs)
packages/core             Shared types and result models
packages/catalog          Curated error catalog (JSON)
packages/parser           Normalizer, revert-data extractor, decoder, explain()
packages/selectors        Built-in selector / signature lookup
packages/aa               ERC-4337 AA code + EntryPoint FailedOp decoder
packages/client           Tiny fetch SDK for browser-safe hosted API calls
packages/search           SQLite FTS catalog index for server-side search
packages/cli              Local command-line decoder
packages/mcp              Read-only MCP server for agents
skills/*                  OpenClaw workspace skills for repo-specific agents
```

Every package can be imported standalone. The website is just one consumer.

## Quickstart

Requires Node.js 20.10+ and pnpm 9.

```bash
pnpm install
pnpm build
pnpm dev          # apps/web on http://localhost:3000
pnpm test
pnpm validate:catalog
pnpm catalog:duplicates
```

## Use the packages directly

```ts
import { explain } from "@revertwtf/parser/explain";

const result = explain({
  code: -32603,
  message: "Internal JSON-RPC error",
  data: { code: 3, data: "0x08c379a0..." }
});
```

`explain()` also accepts structured simulator/debugger payloads. If the object
contains a failed call frame under paths like `trace`, `calls`, or `stack`, the
parser surfaces the failing frame before the generic wrapper error.

### Browser bundle note

The full catalog-backed explainer intentionally ships a large dataset. In
browser apps, call `@revertwtf/parser/explain` from your server/API layer rather
than importing it into client bundles. For smaller browser-safe helpers, use
subpath imports such as:

```ts
import { describePanic } from "@revertwtf/catalog/panic";
import { decodeRevertData } from "@revertwtf/parser/decode";
import { listKnownAACodes } from "@revertwtf/aa/parse";
import { createRevertClient } from "@revertwtf/client";
```

`@revertwtf/catalog` and `@revertwtf/parser/explain` are the full-data surfaces;
the subpaths above are meant to keep accidental client payloads small.

See `docs/package-imports.md` for the package import guide.

## CLI

```bash
revertwtf decode 0x4e487b71...
revertwtf explain ./error.json
revertwtf aa "AA23 reverted or OOG"
```

## MCP Server

```bash
pnpm --filter @revertwtf/mcp build
pnpm --filter @revertwtf/mcp start
```

The MCP server gives agents a focused place to look up EVM, RPC, provider,
wallet, ERC-4337, Blockscout, and x402 payment/facilitator errors instead of
doing a broad web search.

## OpenClaw Skills

Repo-local OpenClaw skills live under `skills/<skill>/SKILL.md`. They cover
catalog work, ecosystem research, parser/decoder changes, MCP maintenance,
frontend product UI, and release-readiness checks.

The skills are instruction-only and can be submitted to OpenClaw/ClawHub once
the GitHub repository is public.

## Deploy via Coolify

The repository ships a multi-stage `Dockerfile` that builds every package and
the standalone Next.js output. Point a Coolify Dockerfile resource at this
repo. Default port: `3000`. The image includes the generated SQLite catalog
search DB and uses `/data/revertwtf/ratelimit.sqlite` for hosted API rate
limits.

## License

MIT. Contribute catalog entries via PR.
