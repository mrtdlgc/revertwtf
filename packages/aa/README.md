# @revertwtf/aa

ERC-4337 / UserOperation error utilities.

```bash
pnpm add @revertwtf/aa
```

- `parseAACode(string)` - pull `AAxx` out of any reason text and map to a known code + category.
- `decodeEntryPointError(hex)` - decode `FailedOp` / `FailedOpWithRevert` / `SignatureValidationFailed`, then recursively decode any `inner` revert bytes.
- `explainAAError(input)` - produce `Explanation[]` for AA failures.

```ts
import { explainAAError } from "@revertwtf/aa/explain";
explainAAError('FailedOp(0, "AA24 signature error")');
```

For browser bundles, prefer `@revertwtf/aa/parse` or `@revertwtf/aa/codes` when
you only need the AAxx dictionary. Keep `@revertwtf/aa/explain` on a server/API
boundary because it can use the full catalog-backed parser.
