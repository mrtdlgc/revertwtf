# @revertwtf/search

SQLite-backed catalog lookup and FTS search for revert.wtf.

This package is intentionally separate from `@revertwtf/catalog`: the catalog
package stays JSON-only and browser-friendly through subpaths, while this
package opts into `better-sqlite3` for server-side search surfaces.

```bash
pnpm add @revertwtf/search
```

```ts
import { searchCatalog, getEntry } from "@revertwtf/search";

const results = searchCatalog({ query: "AA23", limit: 20 });
const entry = getEntry("solidity-panic-0x11");
```

The SQLite database is generated at package build time from the catalog shards.
Do not edit `dist/data/catalog.sqlite` by hand.

In development and tests, the package can fall back to the catalog JSON/shards if
the native SQLite binding or generated DB is missing. In production, or whenever
`REVERTWTF_CATALOG_DB_PATH` is set, the SQLite DB is required and missing DB
configuration fails loudly.
