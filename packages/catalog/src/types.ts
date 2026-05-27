import type { Confidence, ErrorLayer, Helpfulness, Reference } from "@revertwtf/core";

export type CatalogPattern =
  | { type: "substring"; value: string; caseSensitive?: boolean }
  | { type: "regex"; value: string; flags?: string }
  | { type: "json_path"; path: string; equals: string | number | boolean }
  | { type: "selector"; value: string }
  | { type: "aa_code"; value: string };

export interface CatalogEntry {
  id: string;
  title: string;
  layer: ErrorLayer;
  source: string;
  sourceDisplayName?: string;
  sourceLifecycle?: SourceLifecycle;
  sourceAliases?: string[];
  sourceNote?: string;
  sourceSunsetDate?: string;
  sourceReferences?: Reference[];
  category: string;
  patterns: CatalogPattern[];
  requires?: CatalogPattern[];
  summary: string;
  rootCauseKnown: boolean;
  likelyCauses: string[];
  nextSteps: string[];
  retryHelpful: Helpfulness;
  increasingGasHelpful: Helpfulness;
  confidence: Confidence;
  references?: Reference[];
  related?: string[];
  examples?: string[];
}

export type SourceLifecycle = "current" | "legacy" | "renamed" | "sunsetting";

export interface CatalogSourceMetadata {
  id: string;
  displayName: string;
  lifecycle: SourceLifecycle;
  aliases?: string[];
  sunsetDate?: string;
  note?: string;
  references?: Reference[];
}

export interface CatalogStats {
  total: number;
  byLayer: Record<string, number>;
  byCategory: Record<string, number>;
}

export interface BlockscoutExplorer {
  url: string;
  hostedBy: string;
}

export interface BlockscoutChain {
  chainId: string;
  name: string;
  description: string;
  ecosystem: string[];
  isTestnet: boolean;
  layer: number;
  rollupType: string | null;
  nativeCurrency: string;
  website: string;
  logo: string;
  settlementLayerChainId: string | null;
  explorers: BlockscoutExplorer[];
}

export interface BlockscoutChainStats {
  total: number;
  mainnets: number;
  testnets: number;
  byLayer: Record<string, number>;
  byRollupType: Record<string, number>;
  byHostedBy: Record<string, number>;
  byEcosystem: Record<string, number>;
}
