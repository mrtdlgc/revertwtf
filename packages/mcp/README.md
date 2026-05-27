# @revertwtf/mcp

Read-only MCP server for agents that encounter EVM, JSON-RPC, wallet, library,
simulation, ERC-4337, Blockscout, or x402 errors and need clear next steps
without doing a broad internet search.

```bash
pnpm add @revertwtf/mcp
```

```bash
pnpm --filter @revertwtf/mcp build
pnpm --filter @revertwtf/mcp start
```

Local MCP clients can spawn the stdio server through the `revertwtf-mcp` bin
after the package is built.

## Connect an MCP client

The server speaks MCP over stdio. Add it to any MCP client (Claude Desktop,
Claude Code, Cursor, Cline, etc.). Once published to npm:

```json
{
  "mcpServers": {
    "revertwtf": {
      "command": "npx",
      "args": ["-y", "@revertwtf/mcp"]
    }
  }
}
```

From a local checkout (after `pnpm --filter @revertwtf/mcp build`), point at the
built bin instead:

```json
{
  "mcpServers": {
    "revertwtf": {
      "command": "node",
      "args": ["/absolute/path/to/revertwtf/packages/mcp/dist/bin.js"]
    }
  }
}
```

With Claude Code: `claude mcp add revertwtf -- npx -y @revertwtf/mcp`.

The server is read-only and needs no API keys. It falls back to the catalog JSON
shards when the generated SQLite index is absent; set
`REVERTWTF_CATALOG_DB_PATH` to use a prebuilt `@revertwtf/search` DB in
production.

## Tools

- `explain_error` - normalizes and explains raw errors, JSON strings, traces,
  revert bytes, and x402 facilitator responses.
- `decode_revert_data` - decodes Error(string), Panic(uint256), and known custom
  error selectors.
- `search_catalog` / `get_error` / `catalog_stats` / `list_sources` - browse the
  reviewed catalog. Search/list tools are backed by `@revertwtf/search`, bounded,
  and paginated; use `get_error` only after selecting a specific id.
- `lookup_selector` - resolve a 4-byte selector to signature candidates.
- `explain_aa_error` - explain ERC-4337 AAxx and EntryPoint failures.
- `get_blockscout_chain` / `search_blockscout_chains` - inspect the bundled
  Blockscout chain registry.

## Resources

- `revertwtf://catalog/stats`
- `revertwtf://catalog/sources`
- `revertwtf://catalog/errors/{id}`
- `revertwtf://catalog/sources/{source}`
- `revertwtf://blockscout/chains/{chainId}`

## Payload policy

The MCP server is designed for agents that need one explanation or one search,
not bulk data export. Catalog search returns summaries with `limit`, `offset`,
`totalMatches`, and `hasMore`. It does not send the full catalog to clients for
a simple lookup.
