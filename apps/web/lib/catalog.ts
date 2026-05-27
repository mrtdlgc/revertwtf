import type { CatalogEntry } from "@revertwtf/catalog";
import {
  getCatalogStats,
  getEntry,
  listCategories,
  listEntrySummaries,
  listLayers,
  listShards,
  searchCatalog,
  type CatalogEntrySummary,
  type CatalogSearchOptions,
} from "@revertwtf/search";

export function searchEntries(options: CatalogSearchOptions) {
  return searchCatalog(options);
}

export function listEntries(options: CatalogSearchOptions) {
  return listEntrySummaries(options);
}

export function entryById(id: string): CatalogEntry | undefined {
  return getEntry(id);
}

export function stats() {
  return getCatalogStats();
}

export function layers(): string[] {
  return listLayers();
}
export function categories(): string[] {
  return listCategories();
}

export function catalogShards() {
  return listShards();
}

export function sourceLabel(entry: CatalogEntry | CatalogEntrySummary): string {
  return entry.sourceDisplayName ?? entry.source;
}

export function sourceStatus(entry: CatalogEntry | CatalogEntrySummary): string | null {
  const lifecycle = entry.sourceLifecycle;
  if (lifecycle !== "legacy" && lifecycle !== "sunsetting") return null;
  return lifecycle;
}

export type { CatalogEntrySummary };
