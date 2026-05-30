---
name: revertwtf-catalog-error-enrichment
description: Run evidence-locked enrichment passes over existing revert.wtf catalog errors, preserving good entries while improving generic explanations, actions, references, and helper metadata.
version: 0.1.0
---

# revert.wtf Catalog And Error Enrichment Skill

Use this skill when improving existing catalog coverage at scale: better explanations, sharper likely causes, more useful next steps, corrected version-specific meanings, and real source references.

## Core Principle

Evidence-locked enrichment means every stronger explanation must be backed by opened/read source material or existing source code. Keep good entries. Do not rewrite entries merely to sound smoother.

Prefer this source ladder:

1. Standards and specs: EIPs/ERCs, JSON-RPC specs, ERC-4337 docs, OpenRPC, Solidity docs.
2. Official implementation docs: provider docs, wallet docs, protocol docs, official runbooks.
3. Official code: contract repositories, SDK source, ABI/error declarations, verified source.
4. Generated evidence: Sourcify selector and verified-contract attribution, only when semantics are not over-claimed.

## Entry Scoring

Before editing, classify entries:

- `keep`: already has specific summary, concrete likely causes, actionable next steps, accurate helpfulness flags, and useful references.
- `enrich`: generic summary, missing/weak references, vague causes, vague "retry" advice, version ambiguity, or helper metadata drift.
- `split`: one entry mixes version-specific meanings or different products.
- `sync`: catalog is good but parser/AA/helper package metadata disagrees.

Generic signals:

- `summary` looks like `<source> custom error <signature>.`
- `summary` looks like `<source> revert reason string: <reason>.`
- `summary` starts with broad generated text such as `Sourcify-verified custom error`.
- `nextSteps` say only "inspect source", "retry", or "decode args" when docs provide better actions.

## Workflow

1. Define the enrichment lane:
   - Use one category, source, or shard family at a time.
   - Examples: `erc-4337`, `rpc-provider`, `sourcify-signatures/gas`, `chainlink`, `lending`, `bridge`.
2. Inventory current coverage:
   - Read `packages/catalog/src/data/shards/...`.
   - Check `packages/catalog/src/sources.ts`.
   - Check helper packages when behavior is duplicated, especially `packages/aa`, `packages/parser`, and `packages/search`.
3. Gather sources:
   - Search/open/read official docs and code before writing.
   - Record the exact source URL in `references` or source-level `references`.
   - For versioned behavior, keep version names in prose and references.
4. Patch entries:
   - Keep `id`, `source`, and matching patterns stable unless the old meaning is wrong.
   - Tighten `summary` to explain what failed, not just what selector matched.
   - Make `likelyCauses` describe real branches, fields, state, policy, balances, gas, nonce, or signature causes.
   - Make `nextSteps` operational: what to inspect, recompute, regenerate, fund, decode, trace, or change.
   - Set `retryHelpful` and `increasingGasHelpful` honestly.
   - Add `references` at entry level when the entry has its own explanation; use `sourceReferences` via `sources.ts` for source-wide context.
   - For generated official-source and Sourcify entries, run `pnpm catalog:enrich-generated` after generation to replace generic selector/reason boilerplate with conservative category-family guidance.
   - Do a source-and-semantics sample audit after deterministic passes. Exact source hits are necessary but not sufficient; also inspect whether the chosen failure family matches the actual error/reason meaning.
5. Sync helper behavior:
   - If AA/RPC/provider code meanings change, update helper metadata and tests.
   - Example: AA94 is `gas values overflow`; AA96 is `invalid aggregator`.
6. Regenerate and verify:
   - Keep shard JSON, generated dist data, and helper package output synchronized.
   - Run the duplicate audit after adding entries or changing selectors/patterns.
7. Spot-check product output:
   - Use `getEntry()` or `explain()` runtime checks to confirm the improved entry appears with references.

## Verification

Preferred verification:

```bash
node scripts/build-catalog-data.mjs --generate --dist --check
pnpm validate:catalog
node scripts/check-catalog-duplicates.mjs --fail-on=id,same-source-selector
pnpm catalog:audit-generated-sample
pnpm catalog:audit-generated-sample -- --seed broad-pass-2
pnpm --filter @revertwtf/catalog typecheck
pnpm --filter @revertwtf/parser typecheck
```

Use targeted smoke checks for the enriched lane:

```bash
node --input-type=module -e "const { getEntry } = await import('./packages/catalog/dist/index.js'); console.log(getEntry('aa23-reverted-or-oog')?.references?.length)"
```

## Quality Bar

- Do not use an LLM as the source of truth.
- Do not copy long documentation text; paraphrase from sources.
- Do not overwrite hand-authored entries that are already sharper than the new source.
- Do not add broad substring patterns when a selector, AA code, JSON code, exact reason regex, or guarded match is available.
- Do not claim contract-specific semantics from a selector name alone.
- Keep generated Sourcify entries modest unless contract attribution or source inspection supports stronger meaning.
- Keep classification evidence scoped to the error name or exact reason string. Do not let source titles or protocol labels such as `Chainlink`, `asset`, `operator`, or `claim` steer semantics by themselves.
- Use priority and category-aware classification for broad terms. Common traps: `price` can mean oracle or slippage, `asset` can mean vault or fees, `delegate`/`execute` can mean account-abstraction simulation rather than governance, `claim`/`operator` are often not staking, and `SenderNotAllowed`/`not allowed` style names should usually be access checks before category fallback.
- Audit scripts should distinguish empty issue arrays from real findings; a clean sampled entry must not be counted suspicious just because it has a `suspicious` field.
- Run seeded samples so repeated QA does not keep checking the same first 100 entries. Treat sampled source misses and sampled product issues as blockers; treat broad product-lint examples as a triage queue that still needs human/source inspection.
- Avoid substring matches that cross semantic boundaries: `sequencer` is not a nonce `sequence`, `data feed` is not a fee, `SafeERC20` is not a fee, and `timelock` by itself is not a deadline.
- Prefer missing-state for `uninitialized`, `not initialized`, and `not yet registered`; prefer deadline only when the token/reason actually says expired, stale, delayed, not passed, not yet, cooldown, maturity, or a similar timing condition.
- Treat generic-looking verbs in category context carefully: a paymaster `Deposit failed` is account-abstraction/EntryPoint deposit forwarding, not ERC-4626 vault share accounting.
- If a sampled GitHub source misses the exact string, search release tags or stable branch refs before deleting or weakening the entry; pin the reference to the tag/ref that actually contains the audited string.
- Full-catalog source audits should rerun freshly before release. Treat a dead raw GitHub reference as a hard blocker; if the file moved off `main`, pin to the release tag that still contains the exact audited error.
- Treat full-catalog suspicious-family counts as a triage queue, not a release blocker by itself. Account-abstraction `validator`, `delegatecall`, recovery timelock, deposit, and withdrawal terms often describe smart-account mechanics, while protocol admin/timelock errors can be legitimate governance entries inside DeFi or derivatives shards.
- When a 100-entry sample shows semantic drift, tighten the script first, rerun the enrichment pass, then re-audit before calling the lane done.

## Prioritized Backlog

Current high-impact enrichment lanes after the ERC-4337 pilot:

1. Core missing-reference cleanup: about 49 entries still lack entry references, mainly `eip-1193`, `eip-1474`, `ethers`, `generic`, `node`, `openzeppelin`, `rpc-provider`, `solidity`, `viem`, `wallet`, and a few Uniswap legacy entries.
2. Sourcify custom errors: `custom_error` has about 2,968 generic entries out of 3,059. Improve by bucket, adding verified-contract attributions where possible and keeping semantics conservative.
3. L2 and bridge protocol lanes: `l2` has about 2,506 generic entries; `bridge` about 2,122; `cross_chain` about 759. Prioritize Arbitrum, zkSync, Morph, Polygon zkEVM, Connext/Everclear, LayerZero, Hyperlane, Wormhole, Axelar, Stargate, and Avalanche Teleporter.
4. DeFi high-volume lanes: `dex` has about 1,732 generic entries, `lending` about 1,631, `derivatives` about 699, and `yield` about 599. Prioritize Uniswap, Balancer, GMX, Pendle, Silo, Morpho, Euler, Aave, Curve, Trader Joe, PancakeSwap, and Reserve.
5. Asset and tokenization lanes: `rwa` has about 1,762 generic entries, `stablecoin` about 1,272, and `asset_management` about 406. Prioritize Ondo, Centrifuge, Plume, Frax, Origin Dollar, Sky/MakerDAO, TrueFi, Goldfinch, and Enzyme.
6. Staking/restaking/oracle lanes: `restaking` has about 1,281 generic entries, `staking` about 1,145, `oracle` about 1,064, and `liquid_staking` about 134. Prioritize Lido, Rocket Pool, EigenLayer, Symbiotic, Puffer, Renzo, Kelp, Mellow, Chainlink, Pyth, Redstone, API3, and Tellor.
7. Account abstraction ecosystem lanes: `account_abstraction` still has about 603 generic entries outside the core AA pilot. Prioritize Alchemy Modular Account, Coinbase Smart Wallet, Biconomy/Nexus, Safe7579, Rhinestone, ZeroDev, and thirdweb.
8. Source-specific large shards: Chainlink (~742 generic), GMX (~655), Pendle (~561), Origin Dollar (~498), Frax (~471), Lido (~450), Connext (~446), Rocket Pool (~434), Enzyme (~406), Reserve (~389), Silo v2 (~367), Arbitrum (~364), thirdweb (~363), OpenZeppelin (~350), Morph (~339), Term Finance (~333), Kelp (~332), and zkSync (~331).

Treat this backlog as working order, not a promise to rewrite every entry. Start each lane with a small pilot, validate quality, then scale.
