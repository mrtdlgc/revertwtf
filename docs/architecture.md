# Architecture

```
apps/web                Next.js 15 (App Router, standalone output)
  app/                  routes: /, /errors, /errors/[id], /tools/*, /catalog, /docs/*, /about
  components/           SiteHeader, SiteFooter, ErrorPasteBox, ExplanationCard,
                        RevertDecoder, PanicDecoder, AADecoder, SelectorResolver
  lib/catalog.ts        thin wrappers over @revertwtf/search

packages/core           Hex, Explanation, Evidence, NormalizedError types
packages/catalog        JSON data + loader + Solidity panic dictionary
packages/search         generated SQLite FTS index + server-side lookup APIs
packages/selectors      Built-in 4-byte to signature table
packages/parser         normalize / extract revert data / extract trace failures /
                        decode / matchCatalog / explain
packages/aa             AAxx parser, EntryPoint FailedOp decoder, explainAAError
packages/cli            CLI bound to the same packages
```

## Explanation Sources

Explanations come from:
- `decodeAbiParameters` / `decodeErrorResult` (viem)
- the built-in selector catalog (`@revertwtf/selectors`)
- the reviewed catalog (`@revertwtf/catalog`)
- AAxx / EntryPoint parsing in `@revertwtf/aa`
- local trace-shape extraction for simulator/debugger payloads

The full catalog-backed surfaces are server-sized by design. Browser apps should
prefer subpaths such as `@revertwtf/catalog/panic`,
`@revertwtf/parser/decode`, and `@revertwtf/aa/parse`, and call
`@revertwtf/parser/explain` from a server/API boundary.

## Trace Payloads

`@revertwtf/parser` accepts pasted simulator/debugger objects from tools such as
Tenderly-style simulations, trace RPC responses, relayer dashboards, and wallet
transaction lifecycle APIs. It does not attempt to reproduce a full debugger.
Instead, it looks for failed call-frame-shaped objects under paths such as
`trace`, `calls`, `callTrace`, `stack`, or `frames`, extracts the failed frame,
and then decodes any revert bytes found on that frame.

## Public API

The web app exposes bounded HTTP routes under `apps/web/app/api/`:
`/api/explain`, `/api/revert-decode`, `/api/aa-decode`, `/api/selector`, and
`/api/search`.
They are CORS-open, rate-limited, and intended for agents or browser apps that
should not bundle the full catalog. `@revertwtf/client` is the small fetch SDK
for those routes. Caller identity is keyed by API key first, then forwarded IP
headers, with an anonymous fallback bucket for deployments where proxy headers
are not visible.

## Adding A Package

A new package goes under `packages/<name>` with its own `package.json`,
`tsconfig.json`, `src/`, `test/`, and `README.md`. Wire it into the website by
adding it to `transpilePackages` in `apps/web/next.config.mjs`.

## Catalog Search Index

`@revertwtf/catalog` remains the reviewable JSON source of truth. The build step
for `@revertwtf/search` generates `dist/data/catalog.sqlite` from those shards
with an FTS5 table for ranked search. The website uses that generated database
for `/errors`, `/catalog`, `/api/search`, dynamic error detail pages, and
chunked sitemap output. Development and test runs can fall back to catalog JSON
when SQLite is unavailable; production and explicit `REVERTWTF_CATALOG_DB_PATH`
configurations require the SQLite DB to exist.

## Deploy Via Coolify

Use the root `Dockerfile`. It builds every package then the Next.js standalone
output. The image copies the generated catalog SQLite DB to
`/app/catalog/catalog.sqlite` and sets `REVERTWTF_CATALOG_DB_PATH` for the web
runtime. Coolify just needs port 3000 exposed and a persistent `/data` volume
for the rate-limit database.
