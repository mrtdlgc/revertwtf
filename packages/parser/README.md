# @revertwtf/parser

Ethereum error explainer.

```bash
pnpm add @revertwtf/parser
```

Composes:

- `normalizeError(input)` - walks arbitrary error-like objects and extracts messages, codes, method, action, errorName, candidate revert bytes, and failed trace frames.
- `extractRevertData(input)` - finds revert bytes nested anywhere (`error.data`, `data.originalError.data`, stringified `body`, failed trace `output`, etc.).
- `extractTraceFailures(input)` - summarizes failed simulator/debugger call frames under paths such as `trace`, `calls`, `callTrace`, `stack`, and `frames`.
- `decodeRevertData(data, { abi? })` - decodes `Error(string)`, `Panic(uint256)`, custom errors via provided ABI, and the built-in selector catalog.
- `matchCatalog(normalized)` - matches against `@revertwtf/catalog` patterns.
- `explain(input, { abi? })` - full pipeline. Returns explanations with evidence.

```ts
import { explain } from "@revertwtf/parser/explain";

const { explanations } = explain(rawError);
console.log(explanations[0].title, explanations[0].confidence);
```

Works from local decoding, selector data, and the reviewed catalog.

For browser bundles, keep `@revertwtf/parser/explain` on a server/API path or
call the hosted API through `@revertwtf/client`. Use lighter subpaths when you
do not need full catalog matching:

```ts
import { decodeRevertData } from "@revertwtf/parser/decode";
import { normalizeError } from "@revertwtf/parser/normalize";
import { extractRevertData } from "@revertwtf/parser/extract";
```
