import type { CatalogEntry, CatalogStats } from "./types.js";
import { CATALOG_SHARDS } from "./data/index.js";
import { decorateCatalogEntry } from "./sources.js";

export interface CatalogShardView {
  id: string;
  group: string;
  name: string;
  count: number;
  entries: CatalogEntry[];
}

const SHARDS: CatalogShardView[] = CATALOG_SHARDS.map((shard) => {
  const [group = "catalog", ...nameParts] = shard.id.split("/");
  const name = nameParts.join("/") || group;
  const entries = shard.entries.map(decorateCatalogEntry);

  return {
    id: shard.id,
    group,
    name,
    count: entries.length,
    entries,
  };
});

const ENTRIES = SHARDS.flatMap((shard) => shard.entries);

export function getCatalog(): CatalogEntry[] {
  return ENTRIES;
}

export function getCatalogShards(): CatalogShardView[] {
  return SHARDS;
}

export function getCatalogShard(id: string): CatalogShardView | undefined {
  return SHARDS.find((shard) => shard.id === id);
}

export function getEntry(id: string): CatalogEntry | undefined {
  return ENTRIES.find((e) => e.id === id);
}

export function getEntriesByLayer(layer: string): CatalogEntry[] {
  return ENTRIES.filter((e) => e.layer === layer);
}

export function getEntriesByCategory(category: string): CatalogEntry[] {
  return ENTRIES.filter((e) => e.category === category);
}

export function searchCatalog(query: string): CatalogEntry[] {
  const q = query.toLowerCase();
  return ENTRIES.filter(
    (e) =>
      e.id.toLowerCase().includes(q) ||
      e.title.toLowerCase().includes(q) ||
      e.summary.toLowerCase().includes(q) ||
      e.source.toLowerCase().includes(q) ||
      (e.sourceDisplayName?.toLowerCase().includes(q) ?? false) ||
      (e.sourceLifecycle?.toLowerCase().includes(q) ?? false) ||
      (e.sourceAliases?.some((alias) => alias.toLowerCase().includes(q)) ?? false) ||
      e.category.toLowerCase().includes(q),
  );
}

export function getCatalogStats(): CatalogStats {
  const byLayer: Record<string, number> = {};
  const byCategory: Record<string, number> = {};
  for (const e of ENTRIES) {
    byLayer[e.layer] = (byLayer[e.layer] ?? 0) + 1;
    byCategory[e.category] = (byCategory[e.category] ?? 0) + 1;
  }
  return { total: ENTRIES.length, byLayer, byCategory };
}
