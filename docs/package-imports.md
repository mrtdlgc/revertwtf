# Package import guide

revert.wtf packages are split so integrations can choose between full
server-side explanation surfaces and small browser-safe helpers.

## Server-side explanation

Use these from a backend, CLI, MCP server, worker, or other server boundary:

```ts
import { explain } from "@revertwtf/parser/explain";
import { matchCatalog } from "@revertwtf/parser/match-catalog";
import { explainAAError } from "@revertwtf/aa/explain";
import { searchCatalog } from "@revertwtf/search";
```

These paths can use the catalog and may be too large for browser bundles.

## Browser-safe helpers

Use focused subpaths when you only need a small local dictionary or decoder:

```ts
import { describePanic, normalizePanicCode } from "@revertwtf/catalog/panic";
import { decodeRevertData } from "@revertwtf/parser/decode";
import { normalizeError } from "@revertwtf/parser/normalize";
import { parseAACode } from "@revertwtf/aa/parse";
import { lookupSelector } from "@revertwtf/selectors";
```

For catalog-backed explanations in a browser app, call your own server route or
use the hosted API through `@revertwtf/client`:

```ts
import { createRevertClient } from "@revertwtf/client";

const revert = createRevertClient();
const explanations = await revert.explain('{"code":-32000,"message":"nonce too low"}');
```

## Full catalog data

Only import full catalog data when you intentionally need it:

```ts
import fullCatalog from "@revertwtf/catalog/data-full";
import solidityShard from "@revertwtf/catalog/data/shards/solidity";
```

Prefer shard imports or `@revertwtf/search` for server-side catalog lookup.
