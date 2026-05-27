# Catalog Format

Source of truth: JSON shard files under `packages/catalog/src/data/shards/`.
Each shard is a JSON array of `CatalogEntry` objects. `packages/catalog/src/data/index.ts`
and `packages/catalog/dist/data/errors.json` are generated from those shards.

Nested shard directories are allowed. The generated Sourcify coverage lives in
`packages/catalog/src/data/shards/ecosystems/sourcify-signatures/<bucket>.json`
with `_index.json` as a bucket manifest. `_index.json` is metadata, not a
catalog entry shard. `loadShard("sourcify-signatures")` returns the union of
all Sourcify buckets, while `loadShard("sourcify-signatures/access-control")`
loads a single bucket.

See the `CatalogEntry` type in `packages/catalog/src/types.ts` for the
authoritative shape, and `apps/web/app/docs/catalog-format/page.tsx` for the
narrative version.

## Required Fields

- `id` - kebab-case, globally unique
- `title` - short human-readable name
- `layer` - `evm | rpc | provider | wallet | library | account_abstraction | protocol | unknown`
- `source` - the originating ecosystem, library, provider, protocol, or `generic`
- `category` - free-form taxonomy (`revert`, `gas_estimation`, `userop_paymaster`, ...)
- `patterns[]` - at least one primary match pattern
- `requires[]` - optional guard patterns that must also match, useful for
  message-specific entries under broad JSON-RPC codes like `-32000`
- `summary` - one-paragraph description
- `likelyCauses[]` and `nextSteps[]` - at least one each
- `retryHelpful`, `increasingGasHelpful` - `yes | no | sometimes | unknown`
- `confidence` - `high | medium | low`

## Pattern Types

- `substring` - text match over message fields
- `regex` - JavaScript regex over messages
- `json_path` - dotted path equality check against the raw object
- `selector` - 4-byte prefix match against extracted revert bytes
- `aa_code` - ERC-4337 AAxx code anywhere in messages

Generated custom-error entries should prefer selector patterns over broad name
substrings. Generated revert reason strings should use exact reason regexes so
short protocol codes do not match unrelated JSON payloads.

## Source Lifecycle Metadata

Source IDs in shard JSON stay stable for compatibility. User-facing names,
aliases, and lifecycle labels are maintained in `packages/catalog/src/sources.ts`
and applied by `getCatalog()`.

- `legacy` - deprecated, wound down, or historical coverage retained because old
  contracts can still emit real errors.
- `sunsetting` - still relevant, but tied to an announced shutdown date.
- `renamed` - the ecosystem changed branding or token naming, but coverage is
  still current or historically useful.
