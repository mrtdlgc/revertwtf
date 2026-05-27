# revert.wtf MCP server

`@revertwtf/mcp` exposes the revert.wtf parser and catalog to agents over MCP
stdio. It is intentionally read-only: no payments, no signing, no transaction
sending, and no live chain mutation.

## Run locally

```bash
pnpm --filter @revertwtf/mcp build
pnpm --filter @revertwtf/mcp start
```

For local development:

```bash
pnpm --filter @revertwtf/mcp dev
```

## Connect an MCP client

Add it to any MCP client (Claude Desktop, Claude Code, Cursor, Cline). Published:

```json
{ "mcpServers": { "revertwtf": { "command": "npx", "args": ["-y", "@revertwtf/mcp"] } } }
```

Local checkout (after build): use `"command": "node"` with
`"args": ["/abs/path/to/packages/mcp/dist/bin.js"]`. Claude Code shortcut:
`claude mcp add revertwtf -- npx -y @revertwtf/mcp`. No API keys; read-only.

## Tools

- `explain_error` explains raw EVM/RPC/provider/wallet/library/simulation/x402
  errors and returns evidence-backed next steps.
- `decode_revert_data` decodes raw revert bytes.
- `search_catalog`, `get_error`, `catalog_stats`, and `list_sources` expose the
  reviewed catalog through bounded, paginated responses. Catalog search and
  exact lookup use the generated SQLite FTS index from `@revertwtf/search`.
- `lookup_selector` resolves 4-byte custom error selectors.
- `explain_aa_error` handles ERC-4337 AAxx and EntryPoint FailedOp failures.
- `get_blockscout_chain` and `search_blockscout_chains` expose the bundled
  Blockscout chain registry.

## Resources

- `revertwtf://catalog/stats`
- `revertwtf://catalog/sources`
- `revertwtf://catalog/errors/{id}`
- `revertwtf://catalog/sources/{source}`
- `revertwtf://blockscout/chains/{chainId}`

## Payload policy

The MCP server should answer one agent question without making the client
download the full catalog. Use `search_catalog` for summaries, inspect
`totalMatches` and `hasMore`, then call `get_error` for a selected id. Do not
add tools or resources that dump all catalog entries.

## x402 coverage

The catalog includes x402 V2 HTTP payment-required flow failures,
facilitator `invalidReason` and `errorReason` codes, EVM EIP-3009 failures,
Permit2 fallback failures, Solana/SVM exact-payment verification failures, and
settlement failures. The server exposes those through the same `explain_error`
tool as other EVM-facing errors.
