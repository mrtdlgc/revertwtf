# @revertwtf/selectors

Built-in selector / error-signature lookup.

```bash
pnpm add @revertwtf/selectors
```

```ts
import { lookupSelector } from "@revertwtf/selectors";

lookupSelector("0x08c379a0");
// [{ selector: "0x08c379a0", signature: "Error(string)", name: "Error", source: "solidity", confidence: "verified" }]
```

Includes Solidity built-ins, EIP-6093 token errors, EIP-3668 `OffchainLookup`,
ERC-4337 EntryPoint errors, and common OpenZeppelin v5 custom errors.

Use `@revertwtf/selectors` for lookup helpers and `@revertwtf/selectors/data`
only when you explicitly need the raw selector table.
