import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { gunzipSync } from "node:zlib";

const requireFromParser = createRequire(new URL("../packages/parser/package.json", import.meta.url));
const { toFunctionSelector } = await import(pathToFileURL(requireFromParser.resolve("viem")));

const ROOT = findRoot(process.cwd());
const SHARDS_DIR = join(ROOT, "packages", "catalog", "src", "data", "shards", "ecosystems");
const CACHE_DIR = join(ROOT, ".cache", "catalog-sources");
const USER_AGENT = "revertwtf-catalog-enrichment";

const SOURCES = [
  {
    source: "berachain",
    titlePrefix: "Berachain contracts",
    repo: "berachain/contracts",
    branch: "main",
    include: ["src/"],
    layer: "protocol",
    category: "l2",
    context: "native chain, governance, Honey, PoL, reward, validator, or oracle",
  },
  {
    source: "world-chain",
    titlePrefix: "World Chain contracts",
    repo: "worldcoin/world-chain",
    branch: "main",
    include: ["pkg/contracts/src/"],
    layer: "account_abstraction",
    category: "account_abstraction",
    context: "World Chain PBH, account manager, session, fee escrow, or verifier",
  },
  {
    source: "abstract",
    titlePrefix: "Abstract Global Wallet",
    repo: "Abstract-Foundation/agw-contracts",
    branch: "main",
    include: ["contracts/"],
    layer: "account_abstraction",
    category: "account_abstraction",
    context: "Abstract Global Wallet account, module, hook, session key, validator, or feature",
  },
  {
    source: "everclear",
    titlePrefix: "Everclear contracts",
    repo: "everclearorg/monorepo",
    branch: "dev",
    include: ["packages/contracts/src/"],
    layer: "protocol",
    category: "bridge",
    context: "Everclear intent, hub, spoke, gateway, settlement, asset, or route",
  },
  {
    source: "debridge",
    titlePrefix: "deBridge contracts",
    repo: "debridge-finance/debridge-contracts-v1",
    branch: "main",
    include: ["contracts/"],
    exclude: ["contracts/mock/"],
    layer: "protocol",
    category: "bridge",
    context: "deBridge gate, token, oracle, fee proxy, call proxy, or cross-chain transfer",
  },
  {
    source: "socket",
    titlePrefix: "Socket DL",
    repo: "SocketDotTech/socket-DL",
    branch: "master",
    include: ["contracts/"],
    exclude: ["contracts/examples/", "contracts/mocks/"],
    layer: "protocol",
    category: "bridge",
    context: "Socket message, capacitor, switchboard, transmitter, execution manager, or plug",
  },
  {
    source: "symbiotic",
    titlePrefix: "Symbiotic core",
    repo: "symbioticfi/core",
    branch: "main",
    include: ["src/"],
    layer: "protocol",
    category: "restaking",
    context: "Symbiotic vault, network, operator, delegator, slasher, registry, or opt-in service",
  },
  {
    source: "biconomy",
    titlePrefix: "Biconomy Smart Account",
    repo: "bcnmy/scw-contracts",
    branch: "main",
    include: ["contracts/"],
    layer: "account_abstraction",
    category: "account_abstraction",
    context: "Biconomy smart account, module, validator, factory, session, or EntryPoint integration",
  },
  {
    source: "fluid",
    titlePrefix: "Fluid contracts",
    repo: "Instadapp/fluid-contracts-public",
    branch: "main",
    include: ["contracts/"],
    layer: "protocol",
    category: "defi",
    context: "Fluid liquidity, vault, DEX, oracle, resolver, auth, or configuration",
  },
  {
    source: "renzo",
    titlePrefix: "Renzo contracts",
    repo: "Renzo-Protocol/contracts-public",
    branch: "master",
    include: ["contracts/"],
    layer: "protocol",
    category: "restaking",
    context: "Renzo deposit, bridge, oracle, operator delegator, reward, xERC20, or restaking",
  },
  {
    source: "karak",
    titlePrefix: "Karak DSS SDK",
    repo: "karak-network/karak-onchain-sdk",
    branch: "main",
    include: ["src/"],
    layer: "protocol",
    category: "restaking",
    context: "Karak DSS, vault, operator, oracle, BLS, or staking viewer",
  },
  {
    source: "taiko",
    titlePrefix: "Taiko protocol",
    repo: "taikoxyz/taiko-mono",
    branch: "main",
    include: ["packages/protocol/contracts/"],
    layer: "protocol",
    category: "l2",
    context: "Taiko rollup, inbox, bridge, vault, proof, verifier, preconfirmation, or governance",
  },
  {
    source: "morph",
    titlePrefix: "Morph contracts",
    repo: "morph-l2/morph",
    branch: "main",
    include: ["contracts/contracts/"],
    layer: "protocol",
    category: "l2",
    context: "Morph L1/L2 bridge, rollup, messenger, staking, gateway, sequencer, or token system",
  },
  {
    source: "fraxtal",
    titlePrefix: "Fraxtal contracts",
    repo: "FraxFinance/fraxtal-contracts",
    branch: "master",
    include: ["src/contracts/Fraxtal/"],
    layer: "protocol",
    category: "l2",
    context: "Fraxtal bridge, portal, gas token, fee vault, cross-domain messenger, or yield boosting",
  },
  {
    source: "ronin",
    titlePrefix: "Ronin Bridge",
    repo: "ronin-chain/bridge-contract",
    branch: "mainnet",
    include: ["src/"],
    exclude: ["src/mocks/"],
    layer: "protocol",
    category: "bridge",
    context: "Ronin bridge, gateway, bridge manager, governance, validator, or withdrawal limit",
  },
  {
    source: "lens-protocol",
    titlePrefix: "Lens Protocol V3",
    repo: "lens-protocol/lens-v3",
    branch: "development",
    include: ["contracts/"],
    layer: "protocol",
    category: "social",
    context: "Lens account, feed, graph, group, namespace, rule, action, access control, or upgradeability",
  },
  {
    source: "story-protocol",
    titlePrefix: "Story Protocol",
    repo: "storyprotocol/protocol-contracts",
    branch: "main",
    include: ["contracts/"],
    exclude: ["legacy/"],
    layer: "protocol",
    category: "ip",
    context: "Story IP asset, IP org, module, registry, hook, access control, licensing, royalty, or relationship",
  },
  {
    source: "mantle-lsp",
    titlePrefix: "Mantle LSP",
    repo: "mantle-lsp/contracts",
    branch: "main",
    include: ["src/"],
    layer: "protocol",
    category: "liquid_staking",
    context: "Mantle liquid staking, mETH, oracle, staking, liquidity buffer, pauser, or withdrawal",
  },
  {
    source: "swell",
    titlePrefix: "Swell contracts",
    repo: "SwellNetwork/v3-core-public",
    branch: "master",
    include: ["contracts/lst/contracts/", "contracts/lrt/contracts/", "contracts/l2-deposits/"],
    layer: "protocol",
    category: "restaking",
    context: "Swell LST, LRT, deposit manager, node operator, repricing oracle, staking, or L2 deposit",
  },
  {
    source: "uniswap-v4-core",
    titlePrefix: "Uniswap v4 core",
    repo: "Uniswap/v4-core",
    branch: "main",
    include: ["src/"],
    layer: "protocol",
    category: "dex",
    context: "Uniswap v4 pool manager, hooks, positions, swaps, liquidity, settlement, or protocol fees",
  },
  {
    source: "uniswap-v4-periphery",
    titlePrefix: "Uniswap v4 periphery",
    repo: "Uniswap/v4-periphery",
    branch: "main",
    include: ["src/"],
    layer: "protocol",
    category: "dex",
    context: "Uniswap v4 periphery routing, position management, liquidity, hook, permit, or multicall flow",
  },
  {
    source: "uniswap-permit2",
    titlePrefix: "Uniswap Permit2",
    repo: "Uniswap/permit2",
    branch: "main",
    include: ["src/"],
    layer: "protocol",
    category: "token",
    context: "Permit2 allowance, signature, nonce, witness, transfer, expiry, or spender authorization",
  },
  {
    source: "uniswapx",
    titlePrefix: "UniswapX",
    repo: "Uniswap/UniswapX",
    branch: "main",
    include: ["src/"],
    layer: "protocol",
    category: "dex",
    context: "UniswapX order, reactor, filler, permit, exclusivity, validation, or settlement",
  },
  {
    source: "balancer-v3",
    titlePrefix: "Balancer v3",
    repo: "balancer/balancer-v3-monorepo",
    branch: "main",
    include: ["pkg/"],
    layer: "protocol",
    category: "dex",
    context: "Balancer v3 vault, pool, hook, router, swap, liquidity, rate provider, or fee configuration",
  },
  {
    source: "ethena",
    titlePrefix: "Ethena contracts",
    repo: "ethena-labs/bbp-public-assets",
    branch: "main",
    include: ["contracts/"],
    layer: "protocol",
    category: "defi",
    context: "Ethena minting, redemption, staking, reward, custody, collateral, or role-gated flow",
  },
  {
    source: "liquity-bold",
    titlePrefix: "Liquity BOLD",
    repo: "liquity/bold",
    branch: "main",
    include: ["contracts/"],
    layer: "protocol",
    category: "lending",
    context: "Liquity BOLD trove, borrower operation, stability pool, collateral registry, liquidation, or oracle",
  },
  {
    source: "bunni-v2",
    titlePrefix: "Bunni v2",
    repo: "timeless-fi/bunni-v2",
    branch: "main",
    include: ["src/"],
    layer: "protocol",
    category: "dex",
    context: "Bunni v2 hook, hub, pool, swap, liquidity, oracle, rebalancing, or vault flow",
  },
  {
    source: "superform",
    titlePrefix: "Superform core",
    repo: "superform-xyz/superform-core",
    branch: "main",
    include: ["src/", "contracts/"],
    layer: "protocol",
    category: "defi",
    context: "Superform vault routing, bridge, form, registry, payload, superposition, or cross-chain execution",
  },
  {
    source: "silo-v2",
    titlePrefix: "Silo v2",
    repo: "silo-finance/silo-contracts-v2",
    branch: "master",
    include: ["silo-core/contracts/", "silo-vaults/contracts/", "silo-oracles/contracts/"],
    layer: "protocol",
    category: "lending",
    context: "Silo v2 lending, vault, share token, hook, liquidation, oracle, utilization, or market configuration",
  },
  {
    source: "morpho-blue",
    titlePrefix: "Morpho Blue",
    repo: "morpho-org/morpho-blue",
    branch: "main",
    include: ["src/"],
    includeReasonConstants: true,
    layer: "protocol",
    category: "lending",
    context: "Morpho Blue market, borrow, supply, collateral, liquidation, authorization, oracle, or interest-rate flow",
  },
  {
    source: "metamorpho",
    titlePrefix: "MetaMorpho",
    repo: "morpho-org/metamorpho",
    branch: "main",
    include: ["src/"],
    layer: "protocol",
    category: "lending",
    context: "MetaMorpho vault, allocator, market cap, timelock, fee, guardian, or queue flow",
  },
  {
    source: "morpho-bundlers",
    titlePrefix: "Morpho Bundlers",
    repo: "morpho-org/morpho-blue-bundlers",
    branch: "main",
    include: ["src/"],
    layer: "protocol",
    category: "lending",
    context: "Morpho bundler, callback, permit, transfer, multicall, wrapping, or vault action flow",
  },
  {
    source: "euler-evk",
    titlePrefix: "Euler Vault Kit",
    repo: "euler-xyz/euler-vault-kit",
    branch: "master",
    include: ["src/"],
    layer: "protocol",
    category: "lending",
    context: "Euler Vault Kit vault, borrow, collateral, liquidation, hook, oracle, governance, or config flow",
  },
  {
    source: "ethereum-vault-connector",
    titlePrefix: "Ethereum Vault Connector",
    repo: "euler-xyz/ethereum-vault-connector",
    branch: "master",
    include: ["src/"],
    layer: "protocol",
    category: "lending",
    context: "Ethereum Vault Connector controller, collateral, account status, operator, batch, or execution-context flow",
  },
  {
    source: "stakewise-v3",
    titlePrefix: "StakeWise v3",
    repo: "stakewise/v3-core",
    branch: "main",
    include: ["contracts/"],
    layer: "protocol",
    category: "liquid_staking",
    context: "StakeWise v3 vault, validator, keeper, oracle, token, curator, node, or withdrawal flow",
  },
  {
    source: "goldfinch",
    titlePrefix: "Goldfinch Protocol",
    repo: "goldfinch-eng/mono",
    branch: "main",
    include: ["packages/protocol/contracts/"],
    layer: "protocol",
    category: "rwa",
    context: "Goldfinch pool, credit line, tranche, go-list, staking, reward, backer, or borrower flow",
  },
  {
    source: "origin-dollar",
    titlePrefix: "Origin Dollar",
    repo: "OriginProtocol/origin-dollar",
    branch: "master",
    include: ["contracts/contracts/"],
    layer: "protocol",
    category: "stablecoin",
    context: "Origin Dollar vault, strategy, oracle, mint, redeem, rebase, governance, or collateral flow",
  },
  {
    source: "alchemix-v2",
    titlePrefix: "Alchemix v2",
    repo: "alchemix-finance/v2-foundry",
    branch: "master",
    include: ["src/"],
    layer: "protocol",
    category: "defi",
    context: "Alchemix alchemist, transmuter, collateral, debt, harvest, keeper, cross-chain token, or access-control flow",
  },
  {
    source: "truefi",
    titlePrefix: "TrueFi contracts",
    repo: "smartcontractkit/trusttoken-smart-contracts",
    branch: "main",
    include: ["contracts/truefi/", "contracts/truefi2/", "contracts/common/", "contracts/governance/"],
    layer: "protocol",
    category: "rwa",
    context: "TrueFi pool, credit line, borrower, lender, staking, governance, portfolio, or token flow",
  },
  {
    source: "enzyme",
    titlePrefix: "Enzyme Protocol",
    repo: "enzymefinance/protocol",
    branch: "v4",
    include: ["contracts/"],
    layer: "protocol",
    category: "asset_management",
    context: "Enzyme vault, comptroller, fund, policy, adapter, integration, denomination asset, or release flow",
  },
  {
    source: "yearn-v3",
    titlePrefix: "Yearn v3 Vaults",
    repo: "yearn/yearn-vaults-v3",
    branch: "master",
    include: ["contracts/"],
    includeVyper: true,
    layer: "protocol",
    category: "defi",
    context: "Yearn v3 vault, strategy, factory, deposit, withdrawal, profit report, fee, or shutdown flow",
  },
  {
    source: "term-finance",
    titlePrefix: "Term Finance",
    repo: "term-finance/term-finance-contracts",
    branch: "main",
    include: ["contracts/"],
    layer: "protocol",
    category: "lending",
    context: "Term Finance auction, repo, rollover, collateral, bid, offer, maturity, or settlement",
  },
  {
    source: "puffer",
    titlePrefix: "Puffer contracts",
    repo: "PufferFinance/puffer-contracts",
    branch: "master",
    include: ["mainnet-contracts/", "l2-contracts/", "partners/"],
    layer: "protocol",
    category: "restaking",
    context: "Puffer restaking, validator ticket, vault, module, oracle, withdrawal, or access-control flow",
  },
  {
    source: "kelp",
    titlePrefix: "Kelp rsETH",
    repo: "Kelp-DAO/LRT-rsETH",
    branch: "main",
    include: ["contracts/"],
    layer: "protocol",
    category: "restaking",
    context: "Kelp rsETH deposit, withdrawal, oracle, node delegator, strategy, asset, or role-gated flow",
  },
  {
    source: "mellow",
    titlePrefix: "Mellow LRT",
    repo: "mellow-finance/mellow-lrt",
    branch: "main",
    include: ["src/", "contracts/"],
    layer: "protocol",
    category: "restaking",
    context: "Mellow LRT vault, strategy, withdrawal queue, oracle, curator, role, or asset configuration",
  },
  {
    source: "alchemy-modular-account",
    titlePrefix: "Alchemy Modular Account",
    repo: "alchemyplatform/modular-account",
    branch: "develop",
    include: ["src/"],
    layer: "account_abstraction",
    category: "account_abstraction",
    context: "Alchemy modular account validation, execution, plugin, hook, session key, or EntryPoint flow",
  },
  {
    source: "coinbase-smart-wallet",
    titlePrefix: "Coinbase Smart Wallet",
    repo: "coinbase/smart-wallet",
    branch: "main",
    include: ["src/"],
    layer: "account_abstraction",
    category: "account_abstraction",
    context: "Coinbase smart wallet validation, WebAuthn, owner, module, paymaster, or EntryPoint flow",
  },
  {
    source: "biconomy-nexus",
    titlePrefix: "Biconomy Nexus",
    repo: "bcnmy/nexus",
    branch: "main",
    include: ["contracts/", "src/"],
    layer: "account_abstraction",
    category: "account_abstraction",
    context: "Biconomy Nexus account, validator, module, hook, executor, factory, or EntryPoint integration",
  },
  {
    source: "safe7579",
    titlePrefix: "Rhinestone Safe7579",
    repo: "rhinestonewtf/safe7579",
    branch: "main",
    include: ["src/"],
    layer: "account_abstraction",
    category: "account_abstraction",
    context: "Safe7579 adapter, module, validator, executor, hook, registry, or account installation",
  },
  {
    source: "avalanche-teleporter",
    titlePrefix: "Avalanche Teleporter",
    repo: "ava-labs/teleporter",
    branch: "main",
    include: ["contracts/"],
    layer: "protocol",
    category: "bridge",
    context: "Avalanche Teleporter message, relayer, fee, receipt, validator, warp, or cross-chain execution",
  },
  {
    source: "synapse",
    titlePrefix: "Synapse contracts",
    repo: "synapsecns/synapse-contracts",
    branch: "master",
    include: ["contracts/"],
    layer: "protocol",
    category: "bridge",
    context: "Synapse bridge, router, pool, message, swap, token, or cross-chain execution",
  },
  {
    source: "hop",
    titlePrefix: "Hop Protocol",
    repo: "hop-protocol/contracts",
    branch: "master",
    include: ["contracts/"],
    layer: "protocol",
    category: "bridge",
    context: "Hop bridge, bonder, AMM, wrapper, messenger, accounting, or cross-chain transfer",
  },
  {
    source: "chainflip",
    titlePrefix: "Chainflip ETH contracts",
    repo: "chainflip-io/chainflip-eth-contracts",
    branch: "master",
    include: ["contracts/"],
    layer: "protocol",
    category: "bridge",
    context: "Chainflip vault, state chain gateway, key manager, token transfer, swap, or cross-chain message",
  },
  {
    source: "omni",
    titlePrefix: "Omni Network",
    repo: "omni-network/omni",
    branch: "main",
    include: ["contracts/"],
    layer: "protocol",
    category: "bridge",
    context: "Omni cross-chain message, portal, bridge, validator, gas, inbox, or execution flow",
  },
  {
    source: "looksrare-v2",
    titlePrefix: "LooksRare v2",
    repo: "LooksRare/contracts-exchange-v2",
    branch: "master",
    include: ["contracts/"],
    layer: "protocol",
    category: "nft",
    context: "LooksRare v2 order, strategy, transfer manager, royalty, nonce, signature, or settlement",
  },
  {
    source: "sudoswap",
    titlePrefix: "Sudoswap LSSVM2",
    repo: "sudoswap/lssvm2",
    branch: "main",
    include: ["src/"],
    layer: "protocol",
    category: "nft",
    context: "Sudoswap pair, bonding curve, NFT, token, router, royalty, or swap execution",
  },
  {
    source: "sound-protocol",
    titlePrefix: "Sound Protocol",
    repo: "soundxyz/sound-protocol",
    branch: "main",
    include: ["contracts/"],
    layer: "protocol",
    category: "nft",
    context: "Sound edition, minter, metadata, royalty, module, signature, or sale configuration",
  },
  {
    source: "api3",
    titlePrefix: "API3 contracts",
    repo: "api3dao/contracts",
    branch: "main",
    include: ["contracts/"],
    layer: "protocol",
    category: "oracle",
    context: "API3 data feed, Airnode, dAPI, proxy, oracle update, authorization, or withdrawal",
  },
  {
    source: "tellor",
    titlePrefix: "Tellor Flex",
    repo: "tellor-io/tellorFlex",
    branch: "main",
    include: ["contracts/"],
    layer: "protocol",
    category: "oracle",
    context: "Tellor reporting, staking, dispute, governance, query, oracle value, or reward flow",
  },
  {
    source: "algebra",
    titlePrefix: "Algebra Integral",
    repo: "cryptoalgebra/Algebra",
    branch: "master",
    include: ["src/", "contracts/"],
    layer: "protocol",
    category: "dex",
    context: "Algebra pool, plugin, position, swap, liquidity, tick, oracle, or farming flow",
  },
  {
    source: "ambient",
    titlePrefix: "Ambient / CrocSwap",
    repo: "CrocSwap/CrocSwap-protocol",
    branch: "main",
    include: ["contracts/"],
    layer: "protocol",
    category: "dex",
    context: "Ambient pool, swap, liquidity, knockout, oracle, path, or settlement flow",
  },
  {
    source: "cow-protocol",
    titlePrefix: "CoW Protocol contracts",
    repo: "cowprotocol/contracts",
    branch: "main",
    include: ["src/contracts/"],
    layer: "protocol",
    category: "dex",
    context: "CoW Protocol settlement, order, signature, solver, authenticator, vault relayer, or conditional order flow",
  },
  {
    source: "plume",
    titlePrefix: "Plume contracts",
    repo: "plumenetwork/contracts",
    branch: "main",
    include: ["arc/src/", "plume/src/", "smart-wallets/src/", "staking/src/"],
    layer: "protocol",
    category: "rwa",
    context: "Plume RWA tokenization, smart wallet, asset vault, staking, bridge, allocation, or compliance flow",
  },
  {
    source: "sky",
    titlePrefix: "Sky token contracts",
    repo: "sky-ecosystem/sky",
    branch: "master",
    include: ["src/", "contracts/"],
    layer: "protocol",
    category: "stablecoin",
    context: "Sky token, MKR/SKY converter, permit, voting, migration, or token accounting flow",
  },
  {
    source: "ondo",
    titlePrefix: "Ondo USDY",
    repo: "ondoprotocol/usdy",
    branch: "main",
    include: ["contracts/"],
    layer: "protocol",
    category: "rwa",
    context: "Ondo USDY token, RWA hub, subscription, redemption, allowlist, blocklist, oracle, or role-gated flow",
  },
  {
    source: "ondo-v1",
    titlePrefix: "Ondo v1",
    repo: "ondoprotocol/ondo-v1",
    branch: "main",
    include: ["contracts/"],
    layer: "protocol",
    category: "rwa",
    context: "Ondo legacy vault, cash manager, tranche, lending, subscription, redemption, allowlist, or role-gated flow",
  },
  {
    source: "centrifuge-rwa",
    titlePrefix: "Centrifuge Protocol",
    repo: "centrifuge/protocol",
    branch: "main",
    include: ["src/"],
    layer: "protocol",
    category: "rwa",
    context: "Centrifuge RWA pool, tranche, gateway, escrow, investment, redemption, or cross-chain message",
  },
];

const GLOBAL_EXCLUDES = [
  "/test/",
  "/tests/",
  "/mock/",
  "/mocks/",
  "/script/",
  "/scripts/",
  "/node_modules/",
  "/out/",
  "/cache/",
  "/artifacts/",
  "/broadcast/",
  "/lib/forge-std/",
  "/lib/openzeppelin",
  "/lib/solmate",
  "/vendor/openzeppelin",
];

const DATA_LOCATIONS = new Set(["memory", "calldata", "storage", "indexed"]);
const INTEGER_RE = /^(u?int)([0-9]{0,3})$/;
const BYTES_RE = /^bytes([0-9]{1,2})$/;

mkdirSync(SHARDS_DIR, { recursive: true });
mkdirSync(CACHE_DIR, { recursive: true });

const selectedSourceIds = selectedSourcesFromArgs();
const isDryRun = process.argv.includes("--dry-run");
const fetchTimeoutMs = numberArg("--fetch-timeout-ms", 30_000);
const sourcesToRun = selectedSourceIds.size === 0
  ? SOURCES
  : SOURCES.filter((source) => selectedSourceIds.has(source.source));

if (process.argv.includes("--list")) {
  console.log(SOURCES.map((source) => source.source).join("\n"));
  process.exit(0);
}

for (const id of selectedSourceIds) {
  if (!SOURCES.some((source) => source.source === id)) {
    throw new Error(`Unknown source ${id}. Run with --list to see available source ids.`);
  }
}

let failures = 0;
for (const source of sourcesToRun) {
  const started = Date.now();
  console.log(`${source.source}: collecting from ${source.repo}@${source.branch}`);
  try {
    const entries = await collectSourceEntries(source);
    if (!isDryRun) {
      const out = join(SHARDS_DIR, `${source.source}.json`);
      writeFileSync(out, `${JSON.stringify(entries, null, 2)}\n`);
    }
    const action = isDryRun ? "found" : "wrote";
    console.log(`${source.source}: ${action} ${entries.length} entries in ${Date.now() - started}ms`);
  } catch (error) {
    failures += 1;
    console.error(`${source.source}: failed in ${Date.now() - started}ms: ${error.message}`);
  }
}

if (failures > 0) {
  process.exitCode = 1;
}

function selectedSourcesFromArgs() {
  const selected = new Set();
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--source") {
      const value = args[i + 1];
      if (!value) throw new Error("--source requires a source id");
      selected.add(value);
      i += 1;
    } else if (args[i].startsWith("--source=")) {
      selected.add(args[i].slice("--source=".length));
    }
  }
  return selected;
}

function numberArg(name, fallback) {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === name) {
      const value = Number(args[i + 1]);
      if (!Number.isFinite(value) || value <= 0) throw new Error(`${name} requires a positive number`);
      return value;
    }
    if (args[i].startsWith(`${name}=`)) {
      const value = Number(args[i].slice(name.length + 1));
      if (!Number.isFinite(value) || value <= 0) throw new Error(`${name} requires a positive number`);
      return value;
    }
  }
  return fallback;
}

async function collectSourceEntries(source) {
  const sourceDir = await ensureSourceArchive(source);
  const files = listFiles(sourceDir)
    .map((file) => relativePath(sourceDir, file))
    .filter((path) => shouldIncludeSourceFile(source, path))
    .sort();

  const found = new Map();
  const reasons = new Map();
  let skipped = 0;
  await mapLimit(files, 10, async (path) => {
    const text = readFileSync(join(sourceDir, path), "utf8");
    if (path.endsWith(".sol")) {
      for (const parsed of parseSolidityErrors(text)) {
        if (!parsed.signature) {
          skipped += 1;
          continue;
        }
        const existing = found.get(parsed.signature);
        if (!existing || path.length < existing.path.length) {
          found.set(parsed.signature, { ...parsed, path });
        }
      }
    }

    const parsedReasons = path.endsWith(".vy") ? parseVyperReasonStrings(text) : parseSolidityReasonStrings(text);
    for (const reason of parsedReasons) {
      const existing = reasons.get(reason);
      if (!existing || path.length < existing.path.length) {
        reasons.set(reason, { reason, path });
      }
    }
    if (source.includeReasonConstants && isErrorLibraryPath(path)) {
      for (const reason of parseSolidityReasonConstants(text)) {
        const existing = reasons.get(reason);
        if (!existing || path.length < existing.path.length) {
          reasons.set(reason, { reason, path });
        }
      }
    }
  });

  if (skipped > 0) {
    console.warn(`${source.source}: skipped ${skipped} non-canonical source-only error declaration(s)`);
  }

  const selectorEntries = [...found.values()]
    .sort((a, b) => a.name.localeCompare(b.name) || a.signature.localeCompare(b.signature))
    .map((error) => toCatalogEntry(source, error));
  const reasonEntries = [...reasons.values()]
    .sort((a, b) => a.reason.localeCompare(b.reason))
    .map((reason) => toReasonEntry(source, reason));

  return dedupeEntryIds([...selectorEntries, ...reasonEntries]);
}

async function ensureSourceArchive(source) {
  const safeName = `${source.repo.replace(/[^a-zA-Z0-9._-]/g, "__")}__${source.branch.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const tarPath = join(CACHE_DIR, `${safeName}.tar.gz`);
  const extractDir = join(CACHE_DIR, safeName);
  const marker = join(extractDir, ".extracted");

  if (!existsSync(tarPath)) {
    const res = await fetch(`https://codeload.github.com/${source.repo}/tar.gz/${source.branch}`, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(fetchTimeoutMs),
    });
    if (!res.ok) {
      throw new Error(`GitHub codeload failed for ${source.repo}@${source.branch}: ${res.status} ${await res.text()}`);
    }
    const bytes = Buffer.from(await res.arrayBuffer());
    writeFileSync(tarPath, bytes);
  }

  if (!existsSync(marker)) {
    assertInsideCache(extractDir);
    rmSync(extractDir, { recursive: true, force: true });
    mkdirSync(extractDir, { recursive: true });
    extractTarGz(readFileSync(tarPath), extractDir);
    writeFileSync(marker, "ok\n");
  }

  return extractDir;
}

function extractTarGz(bytes, dest) {
  const tar = gunzipSync(bytes);
  let offset = 0;

  while (offset + 512 <= tar.length) {
    const header = tar.subarray(offset, offset + 512);
    const name = readTarString(header, 0, 100);
    if (!name) break;

    const prefix = readTarString(header, 345, 155);
    const fullName = prefix ? `${prefix}/${name}` : name;
    const size = parseInt(readTarString(header, 124, 12).trim() || "0", 8);
    const type = String.fromCharCode(header[156]);
    const relative = fullName.split("/").slice(1).join("/");
    const contentStart = offset + 512;
    const contentEnd = contentStart + size;

    if (relative && type !== "x" && type !== "g" && isPortablePath(relative)) {
      const out = join(dest, relative);
      assertInsideCache(out);

      if (type === "5") {
        mkdirSync(out, { recursive: true });
      } else if (type === "0" || type === "\0" || type === "") {
        mkdirSync(dirname(out), { recursive: true });
        writeFileSync(out, tar.subarray(contentStart, contentEnd));
      }
    }

    offset = contentStart + Math.ceil(size / 512) * 512;
  }
}

function readTarString(buffer, start, length) {
  const value = buffer.subarray(start, start + length);
  const nul = value.indexOf(0);
  return value.subarray(0, nul === -1 ? value.length : nul).toString("utf8");
}

function isPortablePath(relative) {
  return relative.split("/").every((part) => part.length > 0 && !/[<>:"|?*]/.test(part));
}

function listFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(full));
    if (entry.isFile()) out.push(full);
  }
  return out;
}

function relativePath(root, file) {
  return file.slice(root.length + 1).replace(/\\/g, "/");
}

function assertInsideCache(target) {
  const root = resolve(CACHE_DIR);
  const candidate = resolve(target);
  const rel = relative(root, candidate);
  if (rel.startsWith("..") || resolve(rel) === rel) {
    throw new Error(`Refusing to write outside cache: ${candidate}`);
  }
}

function parseSolidityErrors(text) {
  const stripped = text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  const found = [];
  const re = /\berror\s+([A-Za-z_$][\w$]*)\s*\(([^;{}]*)\)\s*;/g;
  let match;
  while ((match = re.exec(stripped))) {
    const name = match[1];
    const params = canonicalParams(match[2]);
    if (!params) {
      found.push({ name, signature: null, params: [] });
      continue;
    }
    found.push({ name, signature: `${name}(${params.join(",")})`, params });
  }
  return found;
}

function parseSolidityReasonStrings(text) {
  const stripped = text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  const reasons = new Set();
  const patterns = [
    /\brequire\s*\([\s\S]*?,\s*(["'])((?:\\.|(?!\1)[\s\S])*?)\1\s*\)/g,
    /\brevert\s*\(\s*(["'])((?:\\.|(?!\1)[\s\S])*?)\1\s*\)/g,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(stripped))) {
      const reason = decodeSolidityString(match[2]);
      if (isUsefulReason(reason)) reasons.add(reason);
    }
  }

  return [...reasons];
}

function parseSolidityReasonConstants(text) {
  const stripped = text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  const reasons = new Set();
  const re = /\bstring\s+(?:internal|public|private|constant|\s)+\s*([A-Z][A-Z0-9_]*)\s*=\s*(["'])((?:\\.|(?!\2)[\s\S])*?)\2\s*;/g;
  let match;
  while ((match = re.exec(stripped))) {
    const reason = decodeSolidityString(match[3]);
    if (isUsefulReason(reason)) reasons.add(reason);
  }
  return [...reasons];
}

function parseVyperReasonStrings(text) {
  const stripped = text
    .replace(/("""|''')[\s\S]*?\1/g, "")
    .replace(/#.*$/gm, "");
  const reasons = new Set();
  const patterns = [
    /\bassert\b[^\n#]*?,\s*(["'])((?:\\.|(?!\1)[^\n])*?)\1/g,
    /\braise\s+(["'])((?:\\.|(?!\1)[^\n])*?)\1/g,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(stripped))) {
      const reason = decodeSolidityString(match[2]);
      if (isUsefulReason(reason)) reasons.add(reason);
    }
  }

  return [...reasons];
}

function isErrorLibraryPath(path) {
  return /(?:^|\/)(?:Errors?|ErrorsLib|ErrorLib|ErrorMessages)\.sol$/i.test(path);
}

function decodeSolidityString(value) {
  return value
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\"/g, "\"")
    .replace(/\\'/g, "'")
    .replace(/\\\\/g, "\\");
}

function isUsefulReason(reason) {
  if (reason.length < 3 || reason.length > 220) return false;
  if (reason.includes("\n") || reason.includes("\r")) return false;
  if (!/[a-zA-Z]/.test(reason)) return false;
  return true;
}

function canonicalParams(raw) {
  const args = splitTopLevel(raw)
    .map((arg) => arg.trim())
    .filter(Boolean);
  const params = [];
  for (const arg of args) {
    const type = canonicalType(arg);
    if (!type) return null;
    params.push(type);
  }
  return params;
}

function canonicalType(rawArg) {
  let parts = rawArg.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  parts = parts.filter((part) => !DATA_LOCATIONS.has(part));
  if (parts.length > 1 && /^[A-Za-z_$][\w$]*$/.test(parts[parts.length - 1])) {
    parts = parts.slice(0, -1);
  }

  let type = parts.join(" ");
  type = type.replace(/^address\s+payable$/, "address");
  type = type.replace(/\s+/g, "");

  const arraySuffix = [...type.matchAll(/\[[0-9]*\]/g)].map((m) => m[0]).join("");
  const base = arraySuffix ? type.slice(0, -arraySuffix.length) : type;
  const canonicalBase = canonicalBaseType(base);
  if (!canonicalBase) return null;
  return `${canonicalBase}${arraySuffix}`;
}

function canonicalBaseType(base) {
  if (base === "address" || base === "bool" || base === "string" || base === "bytes") return base;

  const integer = base.match(INTEGER_RE);
  if (integer) {
    const prefix = integer[1];
    const size = integer[2] ? Number(integer[2]) : 256;
    if (size >= 8 && size <= 256 && size % 8 === 0) return `${prefix}${size}`;
    return null;
  }

  const bytes = base.match(BYTES_RE);
  if (bytes) {
    const size = Number(bytes[1]);
    if (size >= 1 && size <= 32) return `bytes${size}`;
  }

  return null;
}

function splitTopLevel(raw) {
  const out = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < raw.length; i += 1) {
    const ch = raw[i];
    if (ch === "(") depth += 1;
    if (ch === ")") depth -= 1;
    if (ch === "," && depth === 0) {
      out.push(raw.slice(start, i));
      start = i + 1;
    }
  }
  out.push(raw.slice(start));
  return out;
}

function shouldIncludeSourceFile(source, path) {
  if (!path.endsWith(".sol") && !(source.includeVyper && path.endsWith(".vy"))) return false;
  const normalized = `/${path.toLowerCase()}`;
  if (GLOBAL_EXCLUDES.some((needle) => normalized.includes(needle))) return false;
  if ((source.exclude ?? []).some((prefix) => path.startsWith(prefix))) return false;
  if ((source.exclude ?? []).some((needle) => normalized.includes(`/${needle.toLowerCase()}`))) return false;
  return source.include.some((prefix) => path.startsWith(prefix));
}

function toCatalogEntry(source, error) {
  const selector = toFunctionSelector(error.signature);
  return {
    id: catalogId(source.source, error.name, error.params),
    title: `${source.titlePrefix}: ${error.name}`,
    layer: source.layer,
    source: source.source,
    category: source.category,
    patterns: [{ type: "selector", value: selector }],
    summary: `${source.titlePrefix} custom error ${error.signature}.`,
    rootCauseKnown: true,
    likelyCauses: [
      `The contract reverted with ${error.name}, a ${source.context} precondition.`,
      "The selector identifies the failing contract branch; decoded arguments usually identify the bad account, token, amount, route, nonce, domain, module, or configuration value.",
    ],
    nextSteps: [
      "Decode the custom error arguments with the contract ABI or selector catalog.",
      `Check the ${source.titlePrefix} source precondition named by the error and retry only after changing the transaction inputs or protocol state.`,
    ],
    retryHelpful: "no",
    increasingGasHelpful: "no",
    confidence: "high",
    references: [
      {
        label: `${source.titlePrefix} source`,
        url: `https://github.com/${source.repo}/blob/${source.branch}/${error.path}`,
      },
    ],
    examples: [`${selector} // ${error.signature}`],
  };
}

function toReasonEntry(source, item) {
  return {
    id: catalogReasonId(source.source, item.reason),
    title: `${source.titlePrefix}: ${item.reason}`,
    layer: source.layer,
    source: source.source,
    category: source.category,
    patterns: [{ type: "regex", value: revertReasonRegex(item.reason) }],
    summary: `${source.titlePrefix} revert reason string: ${item.reason}.`,
    rootCauseKnown: true,
    likelyCauses: [
      `A ${source.context} precondition failed.`,
      "The reason string is exact; map it back to the source file or calling flow before changing gas settings.",
    ],
    nextSteps: [
      "Search the protocol source for the exact string.",
      `Check the ${source.titlePrefix} source precondition and retry only after changing transaction inputs or protocol state.`,
    ],
    retryHelpful: "no",
    increasingGasHelpful: "no",
    confidence: "high",
    references: [
      {
        label: `${source.titlePrefix} source`,
        url: `https://github.com/${source.repo}/blob/${source.branch}/${item.path}`,
      },
    ],
    examples: [`execution reverted: ${item.reason}`],
  };
}

function dedupeEntryIds(entries) {
  const seen = new Map();
  return entries.map((entry) => {
    const count = seen.get(entry.id) ?? 0;
    seen.set(entry.id, count + 1);
    if (count === 0) return entry;
    const selector = entry.patterns.find((pattern) => pattern.type === "selector")?.value?.slice(2);
    const suffix = selector || shortHash(JSON.stringify(entry.patterns));
    return { ...entry, id: `${entry.id}-${suffix}` };
  });
}

function catalogId(source, name, params) {
  const suffix = params.length === 0 ? "" : `-${params.map(slugType).join("-")}`;
  return `${source}-${slugWords(name)}${suffix}`;
}

function catalogReasonId(source, reason) {
  const slug = slugWords(reason).slice(0, 96).replace(/-+$/g, "") || "revert-reason";
  return `${source}-reason-${slug}-${shortHash(reason)}`;
}

function shortHash(value) {
  return createHash("sha1").update(value).digest("hex").slice(0, 8);
}

function revertReasonRegex(reason) {
  return `(?:^|.*(?:execution reverted(?: with reason string)?|reverted with reason string|revert(?:ed)?)\\s*:?\\s*)['"]?${escapeRegex(reason)}['"]?\\s*$`;
}

function escapeRegex(value) {
  return value.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
}

function slugWords(value) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function slugType(type) {
  return type.replace(/\[\]/g, "-array").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase();
}

async function mapLimit(items, limit, fn) {
  const queue = [...items];
  const workers = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length > 0) {
      const item = queue.shift();
      await fn(item);
    }
  });
  await Promise.all(workers);
}

function findRoot(start) {
  let dir = resolve(start);
  while (true) {
    if (existsSync(join(dir, "pnpm-workspace.yaml"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) throw new Error("Could not find repository root");
    dir = parent;
  }
}
