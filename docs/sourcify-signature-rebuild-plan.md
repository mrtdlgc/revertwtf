# Implementation plan — Sourcify signature shard rebuild

## Goal

Replace the current `packages/catalog/src/data/shards/ecosystems/sourcify-signatures.json` (~94 MB, 66k template-identical entries) with a semantically bucketed, contract-attributed, actionable set of shards.

The current shard contributes the catalog's largest disk + clone cost while adding the *least* per-entry signal: every entry has the same `summary`, `likelyCauses`, `nextSteps`, and `references` boilerplate wrapped around a `{selector, name}` pair. Decoders match the selector and then surface a generic "Sourcify verified-contract signature candidate" message that tells the user nothing about likely cause or next step.

This plan rebuilds the shard so:

1. Each entry's `likelyCauses` / `nextSteps` / `confidence` reflect the *meaning* of the signature name, not a global template.
2. Where Sourcify has verified-contract metadata, entries carry **contract attribution** (chain, address, contract name, protocol) and not just a function name string.
3. The shard is split into many small semantic files, one per category, so the loader, MCP search payloads, and lazy browser callers only pull what they need.
4. Entries already covered by curated shards (`core/eip-6093`, `core/solidity`, `core/erc-4337-entrypoint`, `core/openzeppelin`, `core/solady`, `core/prb-math`) are dropped from the Sourcify output so the better-curated entry wins matching and search.

Out of scope for this pass:

- Per-contract custom-revert *argument* decoding. We add signature attribution, not full ABI decoding.
- New runtime LLM calls. The classifier and template rendering happen at generator time; runtime stays deterministic per `docs/deterministic-runtime.md`.

---

## Inputs

Two Sourcify endpoints feed the generator. The existing script only uses the first.

### A. 4byte search (already used)

`https://api.4byte.sourcify.dev/signature-database/v1/search?query=<prefix>*&filter=true`

Returns `[{ name }]`. We compute the selector locally with viem's `toFunctionSelector`. This is the **name corpus** — ~66k+ unique error/function names.

### B. Verified-contract lookup (new)

Sourcify's repository / contract API exposes verified contracts per chain with their ABI and source. The relevant endpoints are documented at <https://docs.sourcify.dev/docs/api/>. For each selector we want to know:

- which verified contracts on which chains contain that signature in their ABI,
- the contract name (e.g. `UniswapV4PoolManager`, `MorphoBlue`),
- a Sourcify repo URL we can link in `references`.

Two viable paths:

1. **Direct per-selector lookup.** For each selector, hit the search API for the matching ABI. Rate-limited, slow at 66k×.
2. **Bulk pre-index from Sourcify's repo dump.** Pull the ABIs of the top N verified contracts per chain (e.g. via the Sourcify file server `repository.sourcify.dev`) and build an inverted index `selector → [{chain, address, contractName, repoUrl}]`. Cache locally under `.cache/sourcify-contracts/`. Much faster, larger first run.

Use path 2. Cap to the top ~10k most-frequent verified contracts across mainnets we already track (Ethereum, Base, Arbitrum, Optimism, Polygon, BNB, Avalanche, plus the Blockscout chain registry). That captures the long tail of selectors that actually occur in production reverts.

Both caches live under `.cache/sourcify-signatures/` and `.cache/sourcify-contracts/` and are checked into `.gitignore` (already is).

---

## Bucket taxonomy

Every signature gets classified into exactly one bucket by a rule-based matcher that runs `name` against an ordered list of regex/keyword rules. First match wins; order = specificity (most specific first). Anything that matches no rule lands in `unclassified`.

Each bucket file becomes `shards/ecosystems/sourcify-signatures/<bucket-id>.json`. The full set:

| Bucket id | Covers | Default confidence |
|---|---|---|
| `access-control` | `OnlyOwner`, `Unauthorized*`, `NotAdmin`, `CallerNot*`, `NotMinter`, `NotOperator`, `NotGuardian`, `AccessControlUnauthorizedAccount`, `Forbidden`, `NotAuthorized`, `PermissionDenied`, `OnlyRole*`, `RoleNotGranted` | medium |
| `reentrancy` | `Reentrant*`, `ReentrancyGuardReentrantCall`, `LockedFor*`, `NonReentrant*`, `AlreadyLocked` | medium |
| `slippage-price` | `Slippage*`, `PriceTooHigh`, `PriceTooLow`, `InsufficientOutputAmount`, `MinReturnNotMet`, `BadPrice`, `OutsideTolerance`, `ExcessiveImpact`, `SqrtPriceLimit*`, `LimitReached`, `MinOutNotMet` | medium |
| `deadline-expiry` | `Deadline*`, `Expired`, `TooLate`, `TimelockNotReady`, `NotYetExecutable`, `BeforeStart`, `AfterEnd`, `WindowClosed`, `OrderExpired` | medium |
| `balance-funds` | `Insufficient(Balance|Funds|Reserve|Liquidity|Collateral)`, `NotEnough*`, `Balance(Too)?Low`, `Underfunded`, `NothingToWithdraw`, `EmptyVault` | medium |
| `allowance-approval` | `InsufficientAllowance`, `ERC20InsufficientAllowance`, `NotApproved`, `ApprovalRequired`, `Allowance(Too)?Low`, `NotOperatorApproved` | high (very narrow semantics) |
| `pause-emergency` | `Paused`, `(Enforced|Whenever)Paused`, `Halted`, `EmergencyShutdown`, `CircuitBreaker*`, `Frozen`, `Disabled`, `KillSwitch*` | high |
| `signature-712` | `InvalidSignature`, `BadSig*`, `SignatureExpired`, `WrongSigner`, `BadV`, `MalformedSignature`, `ECDSA(InvalidSignature|InvalidSignatureLength)`, `EIP712*`, `InvalidNonce` (when signature-shaped) | medium |
| `arg-validation` | `ZeroAddress`, `NullAddress`, `InvalidAddress`, `ZeroAmount`, `InvalidAmount`, `InvalidLength`, `LengthMismatch`, `EmptyArray`, `OutOfBounds`, `IndexOutOfRange`, `InvalidArgument`, `BadInput`, `MalformedRequest` | high |
| `math` | `Overflow`, `Underflow`, `DivByZero`, `DivisionByZero`, `SafeCast*`, `Math*`, `PRBMath_*`, `MulDivFailed`, `RoundingError` | high |
| `proxy-init` | `AlreadyInitialized`, `NotInitialized`, `ImplementationNotSet`, `UUPS*`, `UpgradeNotAllowed`, `BeaconNotSet`, `ProxyDeniedAdminAccess` | high |
| `oracle-feed` | `Stale(Price|Data|Round)`, `OracleNotSet`, `PriceFeed*`, `OracleNotReady`, `RoundNotComplete`, `AnswerTooLow`, `OracleUnauthorized`, `ChainlinkFeed*`, `PythError*` | high |
| `token-erc20` | duplicates of `ERC20*` errors — dedupe-target, see "Curated dedupe" below | drop or low |
| `token-erc721` | duplicates of `ERC721*` errors — dedupe-target | drop or low |
| `token-erc1155` | duplicates of `ERC1155*` errors — dedupe-target | drop or low |
| `token-erc4626` | `ERC4626Exceeded(Max)?(Deposit|Mint|Withdraw|Redeem)`, vault-asset/share invariants | medium |
| `lending-collateral` | `Undercollateralized`, `HealthFactor*`, `Insolvent`, `LiquidationThreshold*`, `BorrowCap*`, `SupplyCap*`, `DebtCeiling*`, `BadDebt*`, `LTV*` | medium |
| `liquidation` | `NotLiquidatable`, `LiquidationFailed`, `Healthy`, `CloseFactor*`, `LiquidatorOnly`, `SeizeAmount*` | medium |
| `swap-pool` | `K_Invariant`, `TickOutOf*`, `PoolNotInitialized`, `PoolLocked`, `InvalidTickSpacing`, `PriceLimitReached`, `LiquidityNet*`, `SwapAmountCannotBeZero` | medium |
| `auction-order` | `OrderFilled`, `OrderCanceled`, `OrderNotFillable`, `BidTooLow`, `ReserveNotMet`, `AuctionNotStarted`, `AuctionEnded`, `Settled` | medium |
| `vault-share` | `MaxSharesExceeded`, `ZeroShares`, `ShareConversion*`, `AssetMismatch`, `VaultPaused` (route to pause) | medium |
| `governance-voting` | `ProposalNot(Active|Queued|Executable|Succeeded)`, `AlreadyVoted`, `VotingPeriodEnded`, `QuorumNotReached`, `BadVoteType`, `GovernorOnly*` | high |
| `staking-rewards` | `CooldownActive`, `Unstake*`, `LockNotExpired`, `RewardsClaimed`, `NoRewards`, `StakeBelowMin*`, `EpochNotEnded` | medium |
| `bridge-cross-chain` | `MessageAlreadyProcessed`, `InvalidProof`, `RootNotFound`, `MessageNotReady`, `WrongDestinationChain`, `RemoteCaller*`, `Layer(Zero|0)*`, `Axelar*`, `CCIP*`, `Wormhole*`, `Hyperlane*` | medium |
| `merkle-proof` | `InvalidProof`, `BadMerkleProof`, `LeafNotFound`, `RootMismatch`, `MerkleProofInvalid*` | high |
| `whitelist-allowlist` | `NotWhitelisted`, `NotAllowlisted`, `Blacklisted`, `AddressBlocked`, `KYCRequired`, `RegionBlocked` | high |
| `rate-limit-cap` | `Cap(Exceeded|Reached)`, `RateLimit*`, `MaxSupplyReached`, `MintLimitReached`, `DailyLimit*`, `ThrottleActive` | high |
| `nonce-replay` | `InvalidNonce`, `NonceUsed`, `NonceMismatch`, `ReplayDetected`, `DuplicateRequest` | high |
| `gas` | `OutOfGas`, `InsufficientGas`, `GasLimitTooLow`, `CallDepthExceeded` | medium |
| `domain-resolver` | `Unauthori[sz]edResolver`, `LabelHashMismatch`, `NameNotRegistered`, `NotResolver`, `RecordNotFound` | medium |
| `module-hook-plugin` | `Module(NotInstalled|AlreadyInstalled|NotEnabled)`, `Hook(Reverted|NotPermitted)`, `Plugin*`, `Validator(NotInstalled|Reverted)` | medium |
| `session-permissions` | `Session(Expired|Invalid|Revoked)`, `Permission(Denied|Expired)`, `Selector(NotPermitted)`, `Spending(LimitExceeded)`, `EIP7702*`, `Authorization(Invalid|Expired)` | medium |
| `fees-royalty` | `FeeTooHigh`, `RoyaltyExceedsMax`, `SplitInvalid`, `BadFeeReceiver`, `MaxFeeExceeded` | high |
| `state-machine` | `WrongState`, `BadState`, `NotInState`, `AlreadyClosed`, `AlreadyOpen`, `NotStarted`, `NotEnded`, `LifecycleViolation` | medium |
| `transfer-restriction` | `TransferRestricted`, `LockUpActive`, `NonTransferable`, `SoulboundTransfer`, `Frozen(Token|Account)` | high |
| `epoch-snapshot` | `EpochNotEnded`, `SnapshotMissing`, `CheckpointNot(Recorded|Ready)`, `EpochAlreadyClaimed` | medium |
| `chain-domain-mismatch` | `WrongChainId`, `InvalidDomain*`, `DomainSeparatorMismatch`, `UnsupportedChain` | high |
| `refund-claim` | `Already(Claimed|Refunded)`, `NothingToClaim`, `RefundFailed`, `Claim(Window)?Closed` | high |
| `unclassified` | catch-all, no rule matched | low |

### Rule file

The rule list lives in `scripts/sourcify-buckets.mjs` (new) as a typed array:

```js
export const BUCKETS = [
  {
    id: "access-control",
    match: [/^OnlyOwner$/, /Unauthori[sz]ed/, /NotAdmin/, /CallerNot/, /^Not(Minter|Operator|Guardian|Authorized)/, /^AccessControl/, /^Forbidden$/, /PermissionDenied/, /^OnlyRole/],
    title: ({ name }) => `Access denied: ${name}`,
    summary: ({ name }) => `Sourcify-verified custom error \`${name}\` typically indicates the caller is not authorized for this action.`,
    likelyCauses: [
      "Caller does not hold the required role, ownership, or admin rights for this function.",
      "The contract owner / governance has not yet granted this address permission.",
      "Call is being made through a proxy or relayer whose identity does not match the expected authority.",
    ],
    nextSteps: [
      "Verify msg.sender against the contract's owner / role registry on a block explorer.",
      "If using a meta-transaction or paymaster, confirm the authorized address is the eventual caller, not the relayer.",
      "Grant the missing role via the contract's admin function, or call from the correct account.",
    ],
    retryHelpful: "no",
    increasingGasHelpful: "no",
    confidence: "medium",
  },
  // ... one entry per bucket
];
```

Each bucket entry exports a render function `toEntry({ name, selector, attributions })` that produces a full `CatalogEntry`. The `attributions` array (possibly empty) is used to populate `references` and `examples` when contract metadata is available.

---

## Curated dedupe

Before classifying, drop any signature that already exists in a curated shard. Build a `Set<selector>` from:

- `packages/catalog/src/data/shards/core/eip-6093.json`
- `packages/catalog/src/data/shards/core/solidity.json`
- `packages/catalog/src/data/shards/core/erc-4337-entrypoint.json`
- `packages/catalog/src/data/shards/core/openzeppelin.json`
- `packages/catalog/src/data/shards/core/solady.json`
- `packages/catalog/src/data/shards/core/prb-math.json`
- every file under `packages/catalog/src/data/shards/ecosystems/` except `sourcify-signatures*`

Skip those during generation. Log dropped count per source. Expected: a few hundred to a few thousand removed.

Rationale: the curated entries have hand-written explanations and protocol attribution. Sourcify versions would compete against them in `matchCatalog` and dilute confidence. Curated wins.

---

## Contract attribution pipeline

`scripts/build-sourcify-contract-index.mjs` (new). Runs separately, output cached.

1. Pull the list of verified contracts from Sourcify for each tracked chain (Ethereum, Base, Arbitrum, Optimism, Polygon, BNB, Avalanche, plus the Blockscout chain set we already maintain). Cap per chain at top-N by recent activity if a usage signal is available; otherwise alphabetical first-N as a starting point. Target: ~10k contracts total in the first pass.
2. Fetch each contract's `metadata.json` from Sourcify's file server. Extract ABI + contract name.
3. For every error / function entry in the ABI, compute selector via viem `toFunctionSelector`. Push `{selector, chain, address, contractName, repoUrl}` into the index.
4. Write the inverted index to `.cache/sourcify-contracts/index.json` (selector → attributions[]).
5. Be polite: `--concurrency=4`, retries, timeouts, resume from cache. Same pattern as the existing 4byte script.

The enrich step joins the name corpus against this index by selector. Outputs:

- `attributedCount` per bucket (entries with at least one verified contract).
- `attributions: [{chain, address, contractName, repoUrl}]` capped at 5 per entry (best-known first).

For attributed entries:

- `references` includes the Sourcify repo URLs.
- `examples` may include `0x<selector> // <name>() — seen in <contractName> on <chain>`.
- `confidence` may be bumped one tier (low→medium, medium→high) because the signature is provably tied to deployed verified code.

For non-attributed entries (the long tail of names that exist in the 4byte DB but didn't show up in any of the verified contracts we indexed): leave references to the Sourcify 4byte docs only, keep base confidence.

---

## Generator architecture

Replace `scripts/generate-sourcify-signature-shard.mjs` with two cooperating scripts:

```
scripts/
  build-sourcify-contract-index.mjs   # fetches verified-contract ABIs, builds selector index
  enrich-sourcify-signatures.mjs      # reads 4byte names + contract index, classifies, emits sharded files
  sourcify-buckets.mjs                # bucket rule + template definitions (data, not code paths)
```

Pipeline:

```
4byte cache  ─┐
              ├─► enrich ─► classify by bucket rules
contract idx ─┘            ├─► drop if curated
                           ├─► render entry per bucket template
                           └─► emit shards/ecosystems/sourcify-signatures/<bucket>.json
```

### CLI

```bash
node scripts/build-sourcify-contract-index.mjs --chains=ethereum,base,arbitrum,optimism,polygon,bsc,avalanche --top-per-chain=1500
node scripts/enrich-sourcify-signatures.mjs --dry-run    # prints bucket counts, no write
node scripts/enrich-sourcify-signatures.mjs              # writes shards
node scripts/enrich-sourcify-signatures.mjs --bucket=access-control   # rebuild one bucket
```

### Output layout

```
packages/catalog/src/data/shards/ecosystems/sourcify-signatures/
  access-control.json
  allowance-approval.json
  arg-validation.json
  auction-order.json
  balance-funds.json
  bridge-cross-chain.json
  chain-domain-mismatch.json
  deadline-expiry.json
  domain-resolver.json
  epoch-snapshot.json
  fees-royalty.json
  gas.json
  governance-voting.json
  lending-collateral.json
  liquidation.json
  math.json
  merkle-proof.json
  module-hook-plugin.json
  nonce-replay.json
  oracle-feed.json
  pause-emergency.json
  proxy-init.json
  rate-limit-cap.json
  refund-claim.json
  reentrancy.json
  session-permissions.json
  signature-712.json
  slippage-price.json
  staking-rewards.json
  state-machine.json
  swap-pool.json
  token-erc4626.json
  transfer-restriction.json
  unclassified.json
  vault-share.json
  whitelist-allowlist.json
  _index.json                # bucket → file path manifest, also lists per-bucket counts
```

Delete the old `shards/ecosystems/sourcify-signatures.json` in the same commit.

---

## Loader changes

### `packages/catalog/src/shards.ts`

Today shards are enumerated explicitly. Add:

1. A nested-shard descriptor for Sourcify so `loadShard("sourcify-signatures")` returns the union, but `loadShard("sourcify-signatures/access-control")` works too.
2. Update `_index.json` to be the source of truth for bucket file list, so adding a bucket doesn't require touching the loader.

### `packages/catalog/src/data/index.ts`

Adjust the generated data index to include the per-bucket files. The build-data script (`scripts/build-catalog-data.mjs --generate --dist --check`) should pick up the new layout automatically if it globs; verify and update its glob if it lists `ecosystems/*.json` directly.

### `packages/search` SQLite build

`scripts/build-catalog-sqlite.mjs` ingests all entries — should keep working as long as the build-data step yields the union. Verify after rebuild.

### `packages/parser/src/matchCatalog.ts`

No code change required. The matcher iterates entries; entries now come from many files instead of one. Confirm match latency stays acceptable on warm SQLite.

---

## Confidence policy

- Curated entry exists for selector → that wins; Sourcify entry not emitted.
- Sourcify entry with contract attribution + specific bucket → `high`.
- Sourcify entry with specific bucket, no attribution → `medium`.
- Sourcify entry in `unclassified` (no rule match) → `low`. Include in catalog, but downrank in matchers.

`matchCatalog` already weights by `confidence`. Verify Sourcify `low`-confidence entries don't outrank curated entries when both happen to match.

---

## Validation

Add to `scripts/validate-catalog.ts`:

1. Every `sourcify-signatures/<bucket>.json` file's entries have `source: "sourcify-signatures"` and `category: "custom_error"`.
2. No selector appears in more than one Sourcify bucket file.
3. No selector in Sourcify shards collides with a selector in a curated shard (would mean dedupe failed).
4. Every `_index.json` entry corresponds to an existing file and vice versa.
5. Each bucket has at least one entry (catches silent-classification regressions when a regex breaks).

Add to `scripts/check-catalog-duplicates.mjs`:

- Already flags `same-source-selector` — keep enabled. Expect zero from Sourcify after rebuild.

CI (`.github/workflows/ci.yml`) already runs both. No workflow change required.

---

## Web / MCP surfaces

### Web

`apps/web/lib/catalog.ts` reads through `@revertwtf/search`. No change needed once the SQLite is rebuilt.

`apps/web/app/errors/[id]/page.tsx` and `apps/web/app/catalog/page.tsx` already render whatever `getEntry`/`listEntries` returns. Per-bucket explanations will surface automatically.

Sitemap (`apps/web/app/sitemap.xml/route.ts`, `apps/web/lib/sitemap.ts`) emits a URL per entry. Entry count is unchanged-to-slightly-smaller after dedupe; no scale concern.

### MCP

`packages/mcp` exposes `search_catalog`, `get_error`, `catalog_stats`, `list_sources`. Verify `list_sources` still groups `sourcify-signatures` as one source even though entries live in many files (it should — `source` field, not file path, drives grouping).

`catalog_stats` per-source counts will reflect bucket totals. That's an improvement, not a break.

---

## Migration steps (execution order)

1. Land `scripts/sourcify-buckets.mjs` with the full bucket table and templates. Unit-test the classifier in isolation against a held-out sample of ~200 names (snapshot test in `scripts/__tests__/sourcify-buckets.test.mjs`).
2. Land `scripts/build-sourcify-contract-index.mjs`. Run it offline; commit nothing yet.
3. Land `scripts/enrich-sourcify-signatures.mjs` with `--dry-run`. Iterate on bucket coverage until `unclassified` ratio is acceptable (target: <15% of names).
4. Land loader changes in `packages/catalog/src/shards.ts` and `data/index.ts` behind the new layout, with a temporary fallback that still reads the old single file. Verify build + tests pass.
5. Run the generator to produce the new sharded layout. Delete the old single file in the same commit. Remove the fallback in the loader.
6. Rebuild SQLite (`pnpm catalog:build-sqlite`). Verify `pnpm validate:catalog`, `pnpm catalog:duplicates`, and full test suite.
7. Spot-check ~30 entries across buckets on the website (`/errors/<id>`) to confirm explanations read well per category.
8. Update `CONTRIBUTING.md` and `docs/contributing-errors.md` to mention how to add a new bucket / rule.
9. Update `docs/catalog-format.md` with the new shard layout.
10. Replace `scripts/generate-sourcify-signature-shard.mjs` (the old script) with a deprecation shim that prints "use enrich-sourcify-signatures.mjs" and exits non-zero. Remove it entirely one release later.

---

## Contract attribution via the Parquet export (verified path)

The live enumeration endpoint `GET https://sourcify.dev/server/v2/contracts/{chainId}`
returns **403 for everyone** — Sourcify disabled mass enumeration. The original
`build-sourcify-contract-index.mjs` depends on that endpoint and therefore can
never populate attribution. Do **not** rely on it.

Instead, use Sourcify's public Parquet export, which has no 403 and gives
complete coverage. **Verified working end-to-end from this Windows shell on
2026-05-27** (DuckDB CLI v1.5.3, remote `httpfs`, no full download):

- Bucket root: `https://export.sourcify.dev/` (GCS `ListBucketResult`, public read)
- Tables and the columns we actually need (types confirmed by `DESCRIBE`):
  - `compiled_contracts_signatures/` — 76 files, ~4.3 GB — `compilation_id` (varchar), `signature_hash_32` (**blob**), `signature_type` (varchar, `function`/`error`)
  - `compiled_contracts/` — 257 files — `id` (varchar), `name` (varchar)
  - `verified_contracts/` — 14 files — `compilation_id` (varchar), `deployment_id` (varchar)
  - `contract_deployments/` — 14 files — `id` (varchar), `chain_id` (bigint), `address` (**blob**)

Join path: `ccs.compilation_id = cc.id`, `ccs.compilation_id = vc.compilation_id`,
`vc.deployment_id = cd.id`. Selector = first 4 hex bytes of `signature_hash_32`.

### Gotchas confirmed during verification

1. **`to_hex()` returns UPPERCASE.** Wrap selector/address in `lower(to_hex(...))`
   or filters silently match nothing (this produced a false "0 rows").
2. **`signature_hash_32` and `address` are `blob`**, not hex strings — always `to_hex`.
3. **HTTP globs are not supported** (`read_parquet('.../*.parquet')` errors). You
   must enumerate the bucket keys and pass an explicit URL list:
   `read_parquet(['https://.../file1.parquet', ...])`. List via
   `GET https://export.sourcify.dev/?list-type=2&prefix=<table>/` and follow
   `<NextContinuationToken>` (`&continuation-token=`) for pagination.
4. **Cost is round-trip-bound, not bandwidth-bound.** A single dimension join
   touching ~285 files took ~220–270s; a filtered `ccs` scan (~2 GB of the
   `signature_hash_32` column) is the other ~4 min. A full attribution build is
   ~8–10 min and pulls a few GB — **not** the ~15 GB database. Filter `chain_id`
   to a mainnet allowlist so entries aren't tagged with testnet deployments.

### Manual run

`scripts/build-sourcify-contract-index.mjs` now implements this: it enumerates
the bucket keys, builds a `targets` table from the current Sourcify shard
selectors, generates the DuckDB SQL, runs it (point `--duckdb <path>` or
`DUCKDB_BIN` at the CLI), and writes `.cache/sourcify-contracts/index.json` in the
exact shape `enrich-sourcify-signatures.mjs` consumes
(`{ "0x<selector>": [{chain,address,contractName,repoUrl}] }`). Use `--print-sql`
to inspect the query without running it.

```bash
# one-time: get the DuckDB CLI (single exe), then:
node scripts/build-sourcify-contract-index.mjs --duckdb /path/to/duckdb --print-sql   # inspect
node scripts/build-sourcify-contract-index.mjs --duckdb /path/to/duckdb               # ~8-10 min remote
node scripts/enrich-sourcify-signatures.mjs                                           # populate attribution
pnpm catalog:build-data && pnpm validate:catalog && pnpm catalog:duplicates
pnpm catalog:build-sqlite
```

Verified-correct reference query (single selector, proven to resolve to
`SygFactory` / chain 11155111 / `0x31b4…525`):

```sql
LOAD httpfs; SET http_timeout=300000;
WITH ccs AS (
  SELECT compilation_id, '0x'||lower(substr(to_hex(signature_hash_32),1,8)) AS selector
  FROM read_parquet([<ccs file list>])
  WHERE signature_type IN ('function','error')
    AND selector IN (SELECT selector FROM targets)        -- catalog selectors
)
SELECT ccs.selector,
       list({'chain': cd.chain_id::VARCHAR,
             'address': '0x'||lower(to_hex(cd.address)),
             'contractName': cc.name,
             'repoUrl': 'https://sourcify.dev/server/v2/contract/'||cd.chain_id||'/0x'||lower(to_hex(cd.address))})[1:25] AS attributions
FROM ccs
JOIN read_parquet([<compiled_contracts list>])  cc ON cc.id = ccs.compilation_id
JOIN read_parquet([<verified_contracts list>])  vc ON vc.compilation_id = ccs.compilation_id
JOIN read_parquet([<contract_deployments list>]) cd ON cd.id = vc.deployment_id
WHERE cd.chain_id IN (1, 10, 56, 137, 8453, 42161, 43114)   -- mainnet allowlist
GROUP BY ccs.selector;
```

Once `index.json` exists, re-run `node scripts/enrich-sourcify-signatures.mjs`;
attribution, references, and confidence bumps populate automatically. Then
rebuild SQLite, validate, and commit.

## Effort estimate

- Bucket rule table + per-bucket templates (the bulk of the writing): ~6–10 hours of focused work. Each bucket gets 2–4 likely causes and 2–4 next steps, written so they make sense without contract context.
- Contract-index builder: ~3–5 hours including rate-limit handling and resume logic. First full run will be long (multi-hour fetch) but it's offline.
- Enrich script + loader integration + validation: ~3–5 hours.
- Iteration on classifier (looking at `unclassified` samples, adding rules, re-running): ~3–6 hours spread over the rebuild.

Total: ~2 working days of focused effort, plus the offline crawl time.

---

## Success criteria

- Zero entries in the catalog have the current "Sourcify verified-contract signature candidate `X()`" generic template.
- Every bucket file's entries pass a manual read of three randomly-sampled entries: the explanation is coherent for the bucket and the name.
- `unclassified.json` holds <15% of total Sourcify-sourced entries.
- Repo total size drops materially after dedupe with curated shards (expect 30–50% fewer Sourcify entries once EIP-6093 / OZ / Solidity duplicates are removed).
- `matchCatalog` against a known-curated selector still returns the curated entry first (Sourcify entry, if it exists, never wins over curated).
- No single shard file exceeds 10 MB.
- `pnpm catalog:duplicates` is clean.
- Public hosted `/api/search?query=<bucket-name>` returns coherent, on-bucket results.
