import type { CatalogEntry, CatalogSourceMetadata, SourceLifecycle } from "./types.js";

interface SourceTitlePrefix {
  from: string;
  to: string;
}

interface EntrySourceOverride {
  titleStartsWith: string;
  displayName?: string;
  lifecycle?: SourceLifecycle;
  note?: string;
  titlePrefixes?: SourceTitlePrefix[];
}

interface SourceMetadataInternal extends CatalogSourceMetadata {
  titlePrefixes?: SourceTitlePrefix[];
  entryOverrides?: EntrySourceOverride[];
}

const SOURCE_METADATA: SourceMetadataInternal[] = [
  {
    id: "erc-4337",
    displayName: "ERC-4337",
    lifecycle: "current",
    aliases: ["Account Abstraction", "UserOperation", "EntryPoint", "FailedOp", "FailedOpWithRevert"],
    note: "Core account-abstraction validation coverage. EntryPoint AAxx codes should keep protocol attribution separate from provider-specific bundler wrappers.",
    references: [
      { label: "ERC-4337 specification", url: "https://eips.ethereum.org/EIPS/eip-4337" },
      { label: "ERC-4337 EntryPoint explainer", url: "https://docs.erc4337.io/smart-accounts/entrypoint-explainer.html" },
    ],
  },
  {
    id: "erc-4337-entrypoint",
    displayName: "ERC-4337 EntryPoint",
    lifecycle: "current",
    aliases: ["AA10", "AA21", "AA23", "AA24", "AA25", "AA31", "AA33", "AA95", "EntryPoint revert codes"],
    note: "AAxx EntryPoint reason-code coverage, enriched from ERC-4337 protocol attribution and Alchemy's versioned EntryPoint error docs.",
    references: [
      { label: "Alchemy EntryPoint v0.7/v0.8 revert codes", url: "https://www.alchemy.com/docs/wallets/reference/entrypoint-v07-revert-codes" },
      { label: "Alchemy EntryPoint v0.6 revert codes", url: "https://www.alchemy.com/docs/wallets/reference/entrypoint-v06-revert-codes" },
      { label: "ERC-4337 error codes", url: "https://eips.ethereum.org/EIPS/eip-4337#error-codes" },
    ],
  },
  {
    id: "berachain",
    displayName: "Berachain",
    lifecycle: "current",
    aliases: ["Bera", "BGT", "Honey", "PoL"],
    references: [{ label: "Berachain contracts", url: "https://github.com/berachain/contracts" }],
  },
  {
    id: "blockscout",
    displayName: "Blockscout",
    lifecycle: "current",
    aliases: ["Chainscout", "Blockscout API", "Blockscout Explorer", "Blockscout PRO API"],
    note: "Explorer/API integration coverage, plus a generated Chainscout registry of all known Blockscout chain instances.",
    references: [
      { label: "Chainscout chain registry", url: "https://chains.blockscout.com/" },
      { label: "Blockscout API limits", url: "https://docs.blockscout.com/devs/apis/requests-and-limits" },
    ],
  },
  {
    id: "x402",
    displayName: "x402",
    lifecycle: "current",
    aliases: [
      "HTTP 402",
      "Payment Required",
      "PAYMENT-REQUIRED",
      "PAYMENT-SIGNATURE",
      "PAYMENT-RESPONSE",
      "x402 facilitator",
      "EIP-3009 payments",
      "Permit2 payments",
    ],
    note: "Open-source HTTP-native payment protocol coverage for agents and apps handling PaymentRequired, facilitator verify/settle, EVM, Permit2, and SVM failures.",
    references: [
      { label: "x402 docs", url: "https://docs.x402.org/" },
      { label: "x402 protocol specification v2", url: "https://github.com/x402-foundation/x402/blob/main/specs/x402-specification-v2.md" },
      { label: "Coinbase x402 facilitator API", url: "https://docs.cdp.coinbase.com/api-reference/v2/rest-api/x402-facilitator/verify-payment" },
    ],
  },
  {
    id: "seaport",
    displayName: "OpenSea Seaport",
    lifecycle: "current",
    aliases: ["Seaport", "OpenSea marketplace protocol", "Seaport 1.6"],
    references: [
      { label: "Seaport repository", url: "https://github.com/ProjectOpenSea/seaport" },
      { label: "Seaport events and errors", url: "https://docs.opensea.io/docs/seaport-events-and-errors" },
    ],
  },
  {
    id: "cow-protocol",
    displayName: "CoW Protocol",
    lifecycle: "current",
    aliases: ["CoW Swap", "GPv2", "MEV Blocker"],
    references: [
      { label: "CoW Protocol contracts", url: "https://github.com/cowprotocol/contracts" },
      { label: "CoW contracts docs", url: "https://cowswap.mintlify.app/cow-contracts/contracts/settlement" },
    ],
  },
  {
    id: "plume",
    displayName: "Plume",
    lifecycle: "current",
    aliases: ["Plume Network", "Plume RWAfi"],
    references: [{ label: "Plume contracts", url: "https://github.com/plumenetwork/contracts" }],
  },
  {
    id: "enzyme",
    displayName: "Enzyme Protocol",
    lifecycle: "current",
    aliases: ["Enzyme Finance", "Melon", "Enzyme vaults"],
    references: [
      { label: "Enzyme protocol", url: "https://github.com/enzymefinance/protocol" },
      { label: "Enzyme GitHub repo docs", url: "https://docs.enzyme.finance/enzyme-blue-protocol/github-repo" },
    ],
  },
  {
    id: "yearn-v3",
    displayName: "Yearn v3",
    lifecycle: "current",
    aliases: ["Yearn Vaults v3", "Yearn V3 Vaults"],
    references: [{ label: "Yearn v3 vaults", url: "https://github.com/yearn/yearn-vaults-v3" }],
  },
  {
    id: "hop",
    displayName: "Hop Protocol",
    lifecycle: "current",
    aliases: ["Hop Bridge", "Hop AMM", "Hop bonder"],
    references: [{ label: "Hop contracts", url: "https://github.com/hop-protocol/contracts" }],
  },
  {
    id: "tellor",
    displayName: "Tellor",
    lifecycle: "current",
    aliases: ["Tellor Flex", "TRB", "Tellor oracle"],
    references: [{ label: "Tellor Flex", url: "https://github.com/tellor-io/tellorFlex" }],
  },
  {
    id: "sky",
    displayName: "Sky token contracts",
    lifecycle: "current",
    aliases: ["Sky", "MKR to SKY converter", "SKY token"],
    references: [{ label: "Sky token contracts", url: "https://github.com/sky-ecosystem/sky" }],
  },
  {
    id: "ondo",
    displayName: "Ondo USDY",
    lifecycle: "current",
    aliases: ["Ondo", "USDY", "RWAHub"],
    references: [{ label: "Ondo USDY", url: "https://github.com/ondoprotocol/usdy" }],
  },
  {
    id: "ondo-v1",
    displayName: "Ondo v1",
    lifecycle: "legacy",
    aliases: ["Ondo Finance v1", "OUSG legacy", "CashManager legacy"],
    note: "Legacy Ondo contracts are retained for historical on-chain errors and deprecated OUSG/CashManager interactions.",
    references: [
      { label: "Ondo v1 snapshot", url: "https://github.com/ondoprotocol/ondo-v1" },
      { label: "Ondo contract addresses", url: "https://docs.ondo.finance/addresses" },
    ],
  },
  {
    id: "centrifuge-rwa",
    displayName: "Centrifuge RWA Hub",
    lifecycle: "current",
    aliases: ["Centrifuge", "RWA Hub", "Tinlake"],
    references: [{ label: "Centrifuge protocol", url: "https://github.com/centrifuge/protocol" }],
  },
  {
    id: "ethena",
    displayName: "Ethena",
    lifecycle: "current",
    aliases: ["Ethena Labs", "USDe", "sUSDe", "ENA"],
    references: [
      { label: "Ethena public assets", url: "https://github.com/ethena-labs/bbp-public-assets" },
      { label: "Ethena GitHub overview", url: "https://docs.ethena.fi/solution-design/overview/github-overview" },
    ],
  },
  {
    id: "world-chain",
    displayName: "World Chain",
    lifecycle: "current",
    aliases: ["Worldcoin", "World ID", "PBH", "Priority Blockspace for Humans"],
    references: [{ label: "World Chain contracts", url: "https://github.com/worldcoin/world-chain" }],
  },
  {
    id: "abstract",
    displayName: "Abstract",
    lifecycle: "current",
    aliases: ["Abstract Global Wallet", "AGW"],
    references: [{ label: "AGW contracts", url: "https://github.com/Abstract-Foundation/agw-contracts" }],
  },
  {
    id: "everclear",
    displayName: "Everclear",
    lifecycle: "current",
    aliases: ["Connext", "CLEAR", "NEXT", "xERC20"],
    references: [{ label: "Everclear monorepo", url: "https://github.com/everclearorg/monorepo" }],
  },
  {
    id: "debridge",
    displayName: "deBridge",
    lifecycle: "current",
    aliases: ["DLN", "deBridge Gate"],
    references: [{ label: "deBridge contracts", url: "https://github.com/debridge-finance/debridge-contracts-v1" }],
  },
  {
    id: "socket",
    displayName: "Socket",
    lifecycle: "current",
    aliases: ["Socket DL", "Socket Protocol"],
    references: [{ label: "Socket DL contracts", url: "https://github.com/SocketDotTech/socket-DL" }],
  },
  {
    id: "symbiotic",
    displayName: "Symbiotic",
    lifecycle: "current",
    aliases: ["Symbiotic Core"],
    references: [{ label: "Symbiotic core", url: "https://github.com/symbioticfi/core" }],
  },
  {
    id: "biconomy",
    displayName: "Biconomy",
    lifecycle: "current",
    aliases: ["Biconomy Smart Account"],
    references: [{ label: "Biconomy smart account contracts", url: "https://github.com/bcnmy/scw-contracts" }],
  },
  {
    id: "fluid",
    displayName: "Fluid",
    lifecycle: "current",
    aliases: ["Instadapp Fluid", "Fluid Protocol"],
    references: [{ label: "Fluid contracts", url: "https://github.com/Instadapp/fluid-contracts-public" }],
  },
  {
    id: "renzo",
    displayName: "Renzo",
    lifecycle: "current",
    aliases: ["ezETH", "xRenzo", "Restaked ETH"],
    references: [{ label: "Renzo contracts", url: "https://github.com/Renzo-Protocol/contracts-public" }],
  },
  {
    id: "karak",
    displayName: "Karak",
    lifecycle: "current",
    aliases: ["Karak DSS", "Distributed Secure Services"],
    references: [{ label: "Karak on-chain SDK", url: "https://github.com/karak-network/karak-onchain-sdk" }],
  },
  {
    id: "taiko",
    displayName: "Taiko",
    lifecycle: "current",
    aliases: ["Taiko Based Rollup", "Taiko Protocol"],
    references: [{ label: "Taiko monorepo", url: "https://github.com/taikoxyz/taiko-mono" }],
  },
  {
    id: "morph",
    displayName: "Morph",
    lifecycle: "current",
    aliases: ["Morph L2"],
    references: [{ label: "Morph contracts", url: "https://github.com/morph-l2/morph" }],
  },
  {
    id: "fraxtal",
    displayName: "Fraxtal",
    lifecycle: "current",
    aliases: ["Frax L2", "FRAXTAL", "frxUSD", "frxETH"],
    references: [{ label: "Fraxtal contracts", url: "https://github.com/FraxFinance/fraxtal-contracts" }],
  },
  {
    id: "ronin",
    displayName: "Ronin",
    lifecycle: "current",
    aliases: ["Ronin Bridge", "RON"],
    references: [{ label: "Ronin bridge contracts", url: "https://github.com/ronin-chain/bridge-contract" }],
  },
  {
    id: "lens-protocol",
    displayName: "Lens Protocol",
    lifecycle: "current",
    aliases: ["Lens", "Lens V3", "Lens Network"],
    references: [{ label: "Lens V3 contracts", url: "https://github.com/lens-protocol/lens-v3" }],
  },
  {
    id: "story-protocol",
    displayName: "Story Protocol",
    lifecycle: "current",
    aliases: ["Story", "IP Protocol", "Programmable IP"],
    references: [{ label: "Story Protocol contracts", url: "https://github.com/storyprotocol/protocol-contracts" }],
  },
  {
    id: "mantle-lsp",
    displayName: "Mantle LSP",
    lifecycle: "current",
    aliases: ["Mantle Liquid Staking", "mETH", "cmETH"],
    references: [{ label: "Mantle LSP contracts", url: "https://github.com/mantle-lsp/contracts" }],
  },
  {
    id: "swell",
    displayName: "Swell",
    lifecycle: "current",
    aliases: ["swETH", "rswETH", "Swellchain"],
    references: [{ label: "Swell v3 core contracts", url: "https://github.com/SwellNetwork/v3-core-public" }],
  },
  {
    id: "sourcify-signatures",
    displayName: "Sourcify verified signatures",
    lifecycle: "current",
    aliases: ["Sourcify 4byte", "Sourcify signature database", "verified custom errors"],
    note: "Bucketed selector coverage from Sourcify verified-contract signatures. Prefer protocol-specific shards when both match.",
    references: [
      { label: "Sourcify signature database", url: "https://docs.sourcify.dev/docs/repository/signature-database/" },
      { label: "Sourcify 4byte API", url: "https://docs.sourcify.dev/docs/api/#4byte-signature-service-api-documentation" },
    ],
  },
  {
    id: "uniswap-v4-core",
    displayName: "Uniswap v4 Core",
    lifecycle: "current",
    aliases: ["Uniswap v4", "PoolManager", "Hooks"],
    references: [{ label: "Uniswap v4 core", url: "https://github.com/Uniswap/v4-core" }],
  },
  {
    id: "uniswap-v4-periphery",
    displayName: "Uniswap v4 Periphery",
    lifecycle: "current",
    aliases: ["Uniswap v4 position manager", "Uniswap v4 router"],
    references: [{ label: "Uniswap v4 periphery", url: "https://github.com/Uniswap/v4-periphery" }],
  },
  {
    id: "uniswap-permit2",
    displayName: "Uniswap Permit2",
    lifecycle: "current",
    aliases: ["Permit2"],
    references: [{ label: "Permit2", url: "https://github.com/Uniswap/permit2" }],
  },
  {
    id: "uniswapx",
    displayName: "UniswapX",
    lifecycle: "current",
    aliases: ["Uniswap X", "Uniswap reactors"],
    references: [{ label: "UniswapX", url: "https://github.com/Uniswap/UniswapX" }],
  },
  {
    id: "balancer-v3",
    displayName: "Balancer v3",
    lifecycle: "current",
    aliases: ["Balancer v3 Vault", "Balancer v3 pools"],
    references: [{ label: "Balancer v3 monorepo", url: "https://github.com/balancer/balancer-v3-monorepo" }],
  },
  {
    id: "liquity-bold",
    displayName: "Liquity BOLD",
    lifecycle: "current",
    aliases: ["BOLD", "Liquity v2"],
    references: [{ label: "Liquity BOLD", url: "https://github.com/liquity/bold" }],
  },
  {
    id: "bunni-v2",
    displayName: "Bunni v2",
    lifecycle: "current",
    aliases: ["Bunni hooks", "Bunni liquidity"],
    references: [{ label: "Bunni v2", url: "https://github.com/timeless-fi/bunni-v2" }],
  },
  {
    id: "superform",
    displayName: "Superform",
    lifecycle: "current",
    aliases: ["Superform Core", "Superpositions"],
    references: [{ label: "Superform core", url: "https://github.com/superform-xyz/superform-core" }],
  },
  {
    id: "silo-v2",
    displayName: "Silo v2",
    lifecycle: "current",
    aliases: ["Silo Finance", "Silo lending"],
    references: [{ label: "Silo contracts v2", url: "https://github.com/silo-finance/silo-contracts-v2" }],
  },
  {
    id: "morpho-blue",
    displayName: "Morpho Blue",
    lifecycle: "current",
    aliases: ["Morpho", "Morpho lending"],
    references: [{ label: "Morpho Blue contracts", url: "https://github.com/morpho-org/morpho-blue" }],
  },
  {
    id: "metamorpho",
    displayName: "MetaMorpho",
    lifecycle: "current",
    aliases: ["Morpho vaults", "MetaMorpho vault"],
    references: [{ label: "MetaMorpho contracts", url: "https://github.com/morpho-org/metamorpho" }],
  },
  {
    id: "morpho-bundlers",
    displayName: "Morpho Bundlers",
    lifecycle: "current",
    aliases: ["Morpho Blue Bundlers", "Morpho periphery"],
    references: [{ label: "Morpho Blue Bundlers", url: "https://github.com/morpho-org/morpho-blue-bundlers" }],
  },
  {
    id: "euler-evk",
    displayName: "Euler Vault Kit",
    lifecycle: "current",
    aliases: ["EVK", "Euler v2"],
    references: [{ label: "Euler Vault Kit", url: "https://github.com/euler-xyz/euler-vault-kit" }],
  },
  {
    id: "ethereum-vault-connector",
    displayName: "Ethereum Vault Connector",
    lifecycle: "current",
    aliases: ["EVC", "Euler Vault Connector"],
    references: [{ label: "Ethereum Vault Connector", url: "https://github.com/euler-xyz/ethereum-vault-connector" }],
  },
  {
    id: "stakewise-v3",
    displayName: "StakeWise v3",
    lifecycle: "current",
    aliases: ["StakeWise", "osETH", "StakeWise vaults"],
    references: [{ label: "StakeWise v3 core", url: "https://github.com/stakewise/v3-core" }],
  },
  {
    id: "goldfinch",
    displayName: "Goldfinch Protocol",
    lifecycle: "current",
    aliases: ["Goldfinch", "GFI", "FIDU"],
    references: [{ label: "Goldfinch mono repo", url: "https://github.com/goldfinch-eng/mono" }],
  },
  {
    id: "origin-dollar",
    displayName: "Origin Dollar",
    lifecycle: "current",
    aliases: ["OUSD", "OETH", "Origin Protocol"],
    references: [{ label: "Origin Dollar contracts", url: "https://github.com/OriginProtocol/origin-dollar" }],
  },
  {
    id: "alchemix-v2",
    displayName: "Alchemix v2",
    lifecycle: "current",
    aliases: ["Alchemix", "AlchemistV2", "alUSD", "alETH"],
    references: [{ label: "Alchemix v2 foundry", url: "https://github.com/alchemix-finance/v2-foundry" }],
  },
  {
    id: "truefi",
    displayName: "TrueFi",
    lifecycle: "current",
    aliases: ["TrustToken", "TRU", "TrueFi Credit"],
    references: [{ label: "TrueFi smart contracts", url: "https://github.com/smartcontractkit/trusttoken-smart-contracts" }],
  },
  {
    id: "term-finance",
    displayName: "Term Finance",
    lifecycle: "current",
    aliases: ["Term repo", "Term auctions"],
    references: [{ label: "Term Finance contracts", url: "https://github.com/term-finance/term-finance-contracts" }],
  },
  {
    id: "kelp",
    displayName: "Kelp rsETH",
    lifecycle: "current",
    aliases: ["Kelp DAO", "rsETH"],
    references: [{ label: "Kelp rsETH", url: "https://github.com/Kelp-DAO/LRT-rsETH" }],
  },
  {
    id: "mellow",
    displayName: "Mellow LRT",
    lifecycle: "current",
    aliases: ["Mellow Finance", "Mellow vaults"],
    references: [{ label: "Mellow LRT", url: "https://github.com/mellow-finance/mellow-lrt" }],
  },
  {
    id: "puffer",
    displayName: "Puffer",
    lifecycle: "current",
    aliases: ["Puffer Finance", "pufETH"],
    references: [{ label: "Puffer contracts", url: "https://github.com/PufferFinance/puffer-contracts" }],
  },
  {
    id: "alchemy-modular-account",
    displayName: "Alchemy Modular Account",
    lifecycle: "current",
    aliases: ["Alchemy Account Kit", "ERC-6900 modular account"],
    references: [{ label: "Alchemy modular account", url: "https://github.com/alchemyplatform/modular-account" }],
  },
  {
    id: "coinbase-smart-wallet",
    displayName: "Coinbase Smart Wallet",
    lifecycle: "current",
    aliases: ["Coinbase SW", "Coinbase account abstraction"],
    references: [{ label: "Coinbase smart wallet", url: "https://github.com/coinbase/smart-wallet" }],
  },
  {
    id: "biconomy-nexus",
    displayName: "Biconomy Nexus",
    lifecycle: "current",
    aliases: ["Nexus", "Biconomy modular account"],
    references: [{ label: "Biconomy Nexus", url: "https://github.com/bcnmy/nexus" }],
  },
  {
    id: "safe7579",
    displayName: "Rhinestone Safe7579",
    lifecycle: "current",
    aliases: ["Safe 7579", "ERC-7579 Safe"],
    references: [{ label: "Safe7579", url: "https://github.com/rhinestonewtf/safe7579" }],
  },
  {
    id: "avalanche-teleporter",
    displayName: "Avalanche Teleporter",
    lifecycle: "current",
    aliases: ["Teleporter", "Avalanche ICTT"],
    references: [{ label: "Avalanche Teleporter", url: "https://github.com/ava-labs/teleporter" }],
  },
  {
    id: "synapse",
    displayName: "Synapse",
    lifecycle: "current",
    aliases: ["Synapse bridge", "Synapse router"],
    references: [{ label: "Synapse contracts", url: "https://github.com/synapsecns/synapse-contracts" }],
  },
  {
    id: "chainflip",
    displayName: "Chainflip",
    lifecycle: "current",
    aliases: ["Chainflip ETH contracts", "Chainflip State Chain Gateway"],
    references: [{ label: "Chainflip ETH contracts", url: "https://github.com/chainflip-io/chainflip-eth-contracts" }],
  },
  {
    id: "omni",
    displayName: "Omni Network",
    lifecycle: "current",
    aliases: ["Omni", "Omni Portal"],
    references: [{ label: "Omni repository", url: "https://github.com/omni-network/omni" }],
  },
  {
    id: "looksrare-v2",
    displayName: "LooksRare v2",
    lifecycle: "current",
    aliases: ["LooksRare Protocol v2", "LooksRare exchange"],
    references: [{ label: "LooksRare exchange v2", url: "https://github.com/LooksRare/contracts-exchange-v2" }],
  },
  {
    id: "sudoswap",
    displayName: "Sudoswap",
    lifecycle: "current",
    aliases: ["LSSVM2", "Sudoswap NFT AMM"],
    references: [{ label: "Sudoswap LSSVM2", url: "https://github.com/sudoswap/lssvm2" }],
  },
  {
    id: "sound-protocol",
    displayName: "Sound Protocol",
    lifecycle: "current",
    aliases: ["Sound.xyz", "Sound editions"],
    references: [{ label: "Sound Protocol", url: "https://github.com/soundxyz/sound-protocol" }],
  },
  {
    id: "api3",
    displayName: "API3",
    lifecycle: "current",
    aliases: ["Airnode", "dAPI"],
    references: [{ label: "API3 contracts", url: "https://github.com/api3dao/contracts" }],
  },
  {
    id: "algebra",
    displayName: "Algebra Integral",
    lifecycle: "current",
    aliases: ["Algebra", "Algebra AMM"],
    references: [{ label: "Algebra repository", url: "https://github.com/cryptoalgebra/Algebra" }],
  },
  {
    id: "ambient",
    displayName: "Ambient / CrocSwap",
    lifecycle: "current",
    aliases: ["Ambient Finance", "CrocSwap"],
    references: [{ label: "CrocSwap protocol", url: "https://github.com/CrocSwap/CrocSwap-protocol" }],
  },
  {
    id: "hashi",
    displayName: "Gnosis Hashi",
    lifecycle: "legacy",
    aliases: ["Hashi", "Gnosis Hashi"],
    note: "Legacy Gnosis bridge Hashi integration; on-chain contracts can still emit these errors.",
    references: [{ label: "Gnosis Hashi docs", url: "https://docs.gnosischain.com/bridges/hashi/" }],
    titlePrefixes: [{ from: "Gnosis Hashi", to: "Gnosis Hashi (legacy)" }],
  },
  {
    id: "notional",
    displayName: "Notional V3",
    lifecycle: "legacy",
    aliases: ["Notional"],
    note: "Notional V3 is wind-down/legacy coverage retained for historical on-chain errors.",
    references: [{ label: "Notional V3 wind-down", url: "https://blog.notional.finance/balancer-hack-response/" }],
    titlePrefixes: [{ from: "Notional V3", to: "Notional V3 (legacy)" }],
  },
  {
    id: "balancer",
    displayName: "Balancer V2",
    lifecycle: "legacy",
    aliases: ["Balancer"],
    note: "Balancer V2 pool creation infrastructure is legacy; existing V2 pools can still emit these errors.",
    references: [
      {
        label: "Balancer BIP-887",
        url: "https://forum.balancer.fi/t/bip-887-transitioning-to-balancer-v3-disabling-v2-pool-factories/6874",
      },
    ],
    titlePrefixes: [{ from: "Balancer V2", to: "Balancer V2 (legacy)" }],
  },
  {
    id: "polygon-zkevm",
    displayName: "Polygon zkEVM",
    lifecycle: "sunsetting",
    sunsetDate: "2026-07-01",
    aliases: ["Polygon zkEVM Mainnet Beta"],
    note: "Polygon zkEVM Mainnet Beta has a announced sequencer sunset date.",
    references: [{ label: "Polygon zkEVM sunset", url: "https://polygon.technology/polygon-zkevm" }],
    titlePrefixes: [{ from: "Polygon zkEVM", to: "Polygon zkEVM (sunsetting)" }],
  },
  {
    id: "connext",
    displayName: "Everclear (Connext legacy)",
    lifecycle: "renamed",
    aliases: ["Connext", "Everclear", "NEXT", "CLEAR"],
    note: "Connext-era contract coverage retained under the Everclear rename.",
    references: [{ label: "Everclear migration", url: "https://www.everclear.org/blog/the-future-is-clear" }],
    titlePrefixes: [{ from: "Connext", to: "Everclear (Connext legacy)" }],
  },
  {
    id: "gnosis-ido",
    displayName: "Gnosis EasyAuction",
    lifecycle: "renamed",
    aliases: ["Gnosis IDO", "Gnosis Auction", "EasyAuction"],
    note: "The upstream contracts are branded as EasyAuction rather than Gnosis IDO.",
    references: [{ label: "EasyAuction contracts", url: "https://github.com/Gnosis-Auction/auction-contracts" }],
    titlePrefixes: [{ from: "Gnosis IDO contracts", to: "Gnosis EasyAuction" }],
  },
  {
    id: "makerdao",
    displayName: "Sky / MakerDAO DSS",
    lifecycle: "renamed",
    aliases: ["MakerDAO", "MakerDAO DSS", "Sky", "DSS", "DAI", "USDS"],
    note: "MakerDAO DSS coverage remains relevant under the Sky ecosystem rename.",
    references: [{ label: "Sky token routes", url: "https://developers.sky.money/quick-start/protocol-token-routes/" }],
    titlePrefixes: [{ from: "MakerDAO DSS", to: "Sky / MakerDAO DSS" }],
  },
  {
    id: "frax",
    displayName: "Frax / frxUSD",
    lifecycle: "renamed",
    aliases: ["Frax", "FRAX", "frxUSD", "FXS"],
    note: "Frax docs and token naming have evolved; older contract errors remain useful for integration debugging.",
    references: [{ label: "Frax protocol docs", url: "https://docs.frax.com/protocol" }],
  },
  {
    id: "maple",
    displayName: "Maple / Syrup",
    lifecycle: "renamed",
    aliases: ["Maple", "Syrup", "MPL", "SYRUP"],
    note: "Maple token utility moved from MPL/xMPL to SYRUP/stSYRUP; protocol errors remain cataloged.",
    references: [{ label: "Maple token migration", url: "https://docs.maple.finance/maple-for-token-holders/mpl-token-migration" }],
  },
  {
    id: "polygon",
    displayName: "Polygon PoS / POL",
    lifecycle: "renamed",
    aliases: ["Polygon", "Polygon PoS", "MATIC", "POL"],
    note: "Polygon PoS gas/staking token context should use POL after the MATIC migration.",
    references: [{ label: "Polygon MATIC docs", url: "https://docs.polygon.technology/pos/concepts/tokens/matic/" }],
    titlePrefixes: [{ from: "Polygon PoS", to: "Polygon PoS / POL" }],
  },
  {
    id: "gnosis-tokenbridge",
    displayName: "Gnosis xDAI / TokenBridge",
    lifecycle: "current",
    aliases: ["Gnosis TokenBridge", "xDAI Bridge", "Gnosis Bridge"],
    note: "Prefer current Gnosis bridge docs over older TokenBridge docs.",
    references: [
      { label: "Gnosis xDAI bridge", url: "https://docs.gnosischain.com/bridges/About%20Token%20Bridges/xdai-bridge" },
    ],
    titlePrefixes: [{ from: "Gnosis TokenBridge", to: "Gnosis xDAI / TokenBridge" }],
  },
  {
    id: "gmx",
    displayName: "GMX",
    lifecycle: "current",
    aliases: ["GMX Synthetics", "GMX V2", "GMX V1"],
    entryOverrides: [
      {
        titleStartsWith: "GMX V1:",
        displayName: "GMX V1",
        lifecycle: "legacy",
        note: "GMX V1 trading is phased out; these entries are retained for historical on-chain errors.",
        titlePrefixes: [{ from: "GMX V1", to: "GMX V1 (legacy)" }],
      },
    ],
  },
];

const SOURCE_METADATA_BY_ID = new Map(SOURCE_METADATA.map((metadata) => [metadata.id, metadata]));

export function getCatalogSourceMetadata(source: string): CatalogSourceMetadata {
  return publicMetadata(SOURCE_METADATA_BY_ID.get(source) ?? defaultMetadata(source));
}

export function getKnownCatalogSources(): CatalogSourceMetadata[] {
  return SOURCE_METADATA.map(publicMetadata);
}

export function decorateCatalogEntry(entry: CatalogEntry): CatalogEntry {
  const resolved = resolveEntryMetadata(entry);
  return {
    ...entry,
    title: decorateTitle(entry.title, resolved.titlePrefixes),
    sourceDisplayName: resolved.displayName,
    sourceLifecycle: resolved.lifecycle,
    sourceAliases: resolved.aliases,
    sourceNote: resolved.note,
    sourceSunsetDate: resolved.sunsetDate,
    sourceReferences: resolved.references,
  };
}

function resolveEntryMetadata(entry: CatalogEntry): SourceMetadataInternal {
  const base = SOURCE_METADATA_BY_ID.get(entry.source) ?? defaultMetadata(entry.source);
  const override = base.entryOverrides?.find((candidate) => entry.title.startsWith(candidate.titleStartsWith));
  if (!override) return base;

  return {
    ...base,
    displayName: override.displayName ?? base.displayName,
    lifecycle: override.lifecycle ?? base.lifecycle,
    note: override.note ?? base.note,
    titlePrefixes: [...(base.titlePrefixes ?? []), ...(override.titlePrefixes ?? [])],
  };
}

function decorateTitle(title: string, prefixes: SourceTitlePrefix[] | undefined): string {
  for (const prefix of prefixes ?? []) {
    if (title.startsWith(`${prefix.to}:`) || title === prefix.to) return title;
    if (title.startsWith(`${prefix.from}:`)) return `${prefix.to}:${title.slice(prefix.from.length + 1)}`;
    if (title === prefix.from) return prefix.to;
  }
  return title;
}

function defaultMetadata(source: string): SourceMetadataInternal {
  return { id: source, displayName: source, lifecycle: "current" };
}

function publicMetadata(metadata: SourceMetadataInternal): CatalogSourceMetadata {
  const { id, displayName, lifecycle, aliases, sunsetDate, note, references } = metadata;
  return { id, displayName, lifecycle, aliases, sunsetDate, note, references };
}
