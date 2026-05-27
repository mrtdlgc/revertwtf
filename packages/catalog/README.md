# @revertwtf/catalog

Curated catalog of EVM, RPC, wallet, account abstraction, and protocol errors.

```bash
pnpm add @revertwtf/catalog
```

- `getCatalog()` - all entries
- `getEntry(id)` - single entry
- `searchCatalog(q)` - string search across id/title/summary/category/source metadata
- `getEntriesByLayer(layer)` / `getEntriesByCategory(cat)`
- `getCatalogSourceMetadata(source)` - source display name, aliases, lifecycle, notes
- `getBlockscoutChains()` / `getBlockscoutChain(chainId)` - generated Blockscout registry snapshot
- `searchBlockscoutChains(q)` / `getBlockscoutChainStats()` - Blockscout chain lookup helpers
- `describePanic("0x11")` - Solidity panic-code dictionary, also available as the tiny `@revertwtf/catalog/panic` subpath

Entries are pure data in `src/data/shards/`. Source display names and lifecycle
labels live in `src/sources.ts` so raw source IDs stay stable.

`@revertwtf/catalog` is the full catalog surface. Browser apps that only need
small dictionaries or one shard should use explicit subpaths so they do not
bundle the full catalog data by accident.

## Bundle-size guide

| Subpath | Approx size | Use when |
| --- | ---: | --- |
| `@revertwtf/catalog/panic` | < 2 KB | only need Solidity panic codes |
| `@revertwtf/catalog/shards` + `loadShard("solidity")` | ~10 KB for `solidity`, varies by shard | client or server app needs one shard |
| `@revertwtf/catalog/data-full` | very large raw JSON | server-side, need everything |
| `@revertwtf/catalog` | full catalog surface | server-side programmatic catalog access |

Blockscout chain coverage lives in `src/data/blockscout-chains.json`, generated
from Blockscout. Refresh it with `pnpm catalog:update-blockscout`, then run
`pnpm catalog:build-data`, `pnpm validate:catalog`, and
`pnpm catalog:duplicates`.
