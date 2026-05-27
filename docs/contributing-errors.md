# Contributing errors

See `CONTRIBUTING.md` at the repo root for the short version.

## Workflow

1. Reproduce the error and capture the *raw* blob (redact secrets like API keys).
2. Add a fixture: `fixtures/<layer>/<short-slug>.json` (or `.txt` for raw bytes).
3. Append a `CatalogEntry` to the matching shard under `packages/catalog/src/data/shards/`.
4. Run:
   ```bash
   pnpm catalog:build-data
   pnpm validate:catalog
   pnpm catalog:duplicates
   pnpm test
   ```
5. Open the PR. Title it: `catalog: add <error-title>`.

## Generated Sourcify buckets

Do not edit `packages/catalog/src/data/shards/ecosystems/sourcify-signatures/*.json`
by hand. Those files are generated from Sourcify's signature cache by
`scripts/enrich-sourcify-signatures.mjs`.

- Add or refine semantic bucket rules in `scripts/sourcify-buckets.mjs`.
- Rebuild one bucket with `node scripts/enrich-sourcify-signatures.mjs --bucket=<bucket-id>`.
- Rebuild the full generated set with `node scripts/enrich-sourcify-signatures.mjs`.
- Run `pnpm catalog:build-data`, `pnpm validate:catalog`, and
  `pnpm catalog:duplicates` after regenerating.

## What makes a good entry

- Patterns are tight enough to avoid false positives across the whole corpus.
- Use `requires` for guard context that must be present, such as a message
  detail that should only be classified under JSON-RPC `-32000`.
- `likelyCauses` are surgical, not generic.
- `nextSteps` reference real field names, commands, and tools.
- `confidence` is honest. Wrappers without root cause are `medium` or `low`.
- `related` cross-links neighbour entries.

## Don't

- Don't put explanation behavior behind hidden hosted services.
- Don't put website-only logic in `packages/parser`.
- Don't ship an entry without a fixture.
