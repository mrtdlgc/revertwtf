# Contributing to revert.wtf

The main way to contribute is by adding catalog entries. One error per PR.

## Add a catalog entry

1. Edit the matching shard under `packages/catalog/src/data/shards/` and append a new object.
2. Add a fixture under `fixtures/<layer>/<slug>.json` (or `.txt` for raw bytes).
3. Run `pnpm catalog:build-data`, `pnpm validate:catalog`,
   `pnpm catalog:duplicates`, and `pnpm test`.
4. Open the PR. Link the original wild error blob (redact secrets).

See `apps/web/app/docs/catalog-format/page.tsx` for the schema.

Sourcify signature coverage is generated, not hand-edited. Add or tune bucket
rules in `scripts/sourcify-buckets.mjs`, then run
`node scripts/enrich-sourcify-signatures.mjs` and `pnpm catalog:build-data`.

## Add a package or change the parser

- All packages live under `packages/`. Each is independently published-ready.
- Do **not** put website-only logic in `packages/parser`. Anything the website
  does that affects results must live in a reusable package.
- Runtime explanations should stay reproducible from package code, catalog data,
  and caller-provided inputs. Offline drafting is fine, but shipped behavior
  must be reviewable in the repo.

## Local dev

```bash
pnpm install
pnpm -r --filter=./packages/* build
pnpm dev    # apps/web at http://localhost:3000
pnpm test
```
