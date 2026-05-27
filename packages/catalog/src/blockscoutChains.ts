import chains from "./data/blockscout-chains.json" with { type: "json" };
import type { BlockscoutChain, BlockscoutChainStats } from "./types.js";

const BLOCKSCOUT_CHAINS = chains as BlockscoutChain[];
const BLOCKSCOUT_CHAINS_BY_ID = new Map(BLOCKSCOUT_CHAINS.map((chain) => [chain.chainId, chain]));

export function getBlockscoutChains(): BlockscoutChain[] {
  return BLOCKSCOUT_CHAINS;
}

export function getBlockscoutChain(chainId: string | number): BlockscoutChain | undefined {
  return BLOCKSCOUT_CHAINS_BY_ID.get(String(chainId));
}

export function searchBlockscoutChains(query: string): BlockscoutChain[] {
  const q = query.trim().toLowerCase();
  if (!q) return BLOCKSCOUT_CHAINS;

  return BLOCKSCOUT_CHAINS.filter((chain) =>
    [
      chain.chainId,
      chain.name,
      chain.description,
      chain.nativeCurrency,
      chain.rollupType,
      chain.website,
      chain.settlementLayerChainId,
      ...chain.ecosystem,
      ...chain.explorers.flatMap((explorer) => [explorer.url, explorer.hostedBy]),
    ]
      .filter((value): value is string => typeof value === "string" && value.length > 0)
      .some((value) => value.toLowerCase().includes(q)),
  );
}

export function getBlockscoutChainStats(): BlockscoutChainStats {
  const stats: BlockscoutChainStats = {
    total: BLOCKSCOUT_CHAINS.length,
    mainnets: 0,
    testnets: 0,
    byLayer: {},
    byRollupType: {},
    byHostedBy: {},
    byEcosystem: {},
  };

  for (const chain of BLOCKSCOUT_CHAINS) {
    if (chain.isTestnet) stats.testnets += 1;
    else stats.mainnets += 1;

    increment(stats.byLayer, `L${chain.layer}`);
    increment(stats.byRollupType, chain.rollupType ?? "none");
    for (const explorer of chain.explorers) increment(stats.byHostedBy, explorer.hostedBy || "unknown");
    for (const ecosystem of chain.ecosystem) increment(stats.byEcosystem, ecosystem);
  }

  return stats;
}

function increment(record: Record<string, number>, key: string): void {
  record[key] = (record[key] ?? 0) + 1;
}
