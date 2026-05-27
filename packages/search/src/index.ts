import { existsSync, readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { CatalogEntry, CatalogStats } from "@revertwtf/catalog";

const require = createRequire(import.meta.url);
const DEFAULT_DB_PATH = join(moduleDir(), "data", "catalog.sqlite");
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 500;

interface Statement<T = unknown> {
  all(...args: unknown[]): T[];
  get(...args: unknown[]): T | undefined;
}

interface Database {
  pragma(sql: string): void;
  prepare<T = unknown>(sql: string): Statement<T>;
}

interface BetterSqlite3 {
  new(path: string, options?: { readonly?: boolean; fileMustExist?: boolean }): Database;
}

interface EntryRow {
  id: string;
  title: string;
  layer: string;
  source: string;
  source_display_name: string | null;
  source_lifecycle: string | null;
  category: string;
  confidence: string;
  shard_id: string;
  summary: string;
  retry_helpful: string;
  increasing_gas_helpful: string;
  root_cause_known: 0 | 1;
  json: string;
}

interface CountRow {
  count: number;
}

interface FacetRow {
  value: string;
}

interface ShardRow {
  id: string;
  group_name: string;
  name: string;
  count: number;
}

interface MetaRow {
  value: string;
}

export interface CatalogShardSummary {
  id: string;
  group: string;
  name: string;
  count: number;
}

export interface CatalogSearchOptions {
  query?: string;
  source?: string;
  layer?: string;
  category?: string;
  confidence?: string;
  sourceLifecycle?: string;
  shardId?: string;
  limit?: number;
  offset?: number;
}

export interface CatalogSearchResult {
  entries: CatalogEntry[];
  totalMatches: number;
  returned: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface CatalogEntrySummary {
  id: string;
  title: string;
  layer: string;
  source: string;
  sourceDisplayName?: string;
  sourceLifecycle?: string;
  category: string;
  confidence: string;
  summary: string;
  retryHelpful: string;
  increasingGasHelpful: string;
  rootCauseKnown: boolean;
  shardId: string;
}

let db: Database | undefined;
let dbUnavailable = false;
let fallbackEntries: CatalogEntry[] | undefined;

export function getEntry(id: string): CatalogEntry | undefined {
  const database = tryDb();
  if (!database) return getFallbackEntries().find((entry) => entry.id === id);
  const row = database.prepare<EntryRow>("SELECT * FROM entries WHERE id = ?").get(id);
  return row ? parseEntry(row) : undefined;
}

export function getEntrySummary(id: string): CatalogEntrySummary | undefined {
  const database = tryDb();
  if (!database) {
    const entry = getFallbackEntries().find((item) => item.id === id);
    return entry ? summarizeEntry(entry, "catalog/all") : undefined;
  }
  const row = database.prepare<EntryRow>("SELECT * FROM entries WHERE id = ?").get(id);
  return row ? summarizeRow(row) : undefined;
}

export function searchCatalog(options: CatalogSearchOptions = {}): CatalogSearchResult {
  if (!tryDb()) return fallbackSearch(options, false) as CatalogSearchResult;

  const limit = normalizeLimit(options.limit);
  const offset = normalizeOffset(options.offset);
  const query = options.query?.trim() ?? "";
  const filters = buildFilters(options);
  const database = getDb();

  const args: unknown[] = [];
  let from = "entries e";
  let where = filters.sql;
  if (query) {
    const ftsQuery = toFtsQuery(query);
    if (ftsQuery) {
      from = "entries_fts JOIN entries e ON e.rowid = entries_fts.rowid";
      where = appendWhere(where, "entries_fts MATCH ?");
      args.push(ftsQuery);
    } else {
      where = appendWhere(where, "0");
    }
  }
  args.push(...filters.args);

  const count = database.prepare<CountRow>(`SELECT COUNT(*) AS count FROM ${from} ${where}`).get(...args)?.count ?? 0;
  const orderBy = query
    ? "ORDER BY bm25(entries_fts), e.source_display_name COLLATE NOCASE, e.title COLLATE NOCASE"
    : "ORDER BY e.source_display_name COLLATE NOCASE, e.title COLLATE NOCASE, e.id COLLATE NOCASE";
  const rows = database
    .prepare<EntryRow>(`SELECT e.* FROM ${from} ${where} ${orderBy} LIMIT ? OFFSET ?`)
    .all(...args, limit, offset);

  return {
    entries: rows.map(parseEntry),
    totalMatches: count,
    returned: rows.length,
    limit,
    offset,
    hasMore: offset + rows.length < count,
  };
}

export function listEntrySummaries(options: CatalogSearchOptions = {}): {
  entries: CatalogEntrySummary[];
  totalMatches: number;
  returned: number;
  limit: number;
  offset: number;
  hasMore: boolean;
} {
  if (!tryDb()) {
    const result = fallbackSearch(options, true) as {
      entries: CatalogEntrySummary[];
      totalMatches: number;
      returned: number;
      limit: number;
      offset: number;
      hasMore: boolean;
    };
    return result;
  }

  const result = searchRows(options);
  return {
    totalMatches: result.totalMatches,
    returned: result.returned,
    limit: result.limit,
    offset: result.offset,
    hasMore: result.hasMore,
    entries: result.rows.map(summarizeRow),
  };
}

export function listEntryUrls(options: { limit?: number; offset?: number } = {}): Array<{ id: string }> {
  const limit = normalizeBulkLimit(options.limit);
  const offset = normalizeOffset(options.offset);
  const database = tryDb();
  if (!database) {
    return getFallbackEntries()
      .map((entry) => ({ id: entry.id }))
      .sort((a, b) => a.id.localeCompare(b.id))
      .slice(offset, offset + limit);
  }
  return database
    .prepare<{ id: string }>("SELECT id FROM entries ORDER BY id COLLATE NOCASE LIMIT ? OFFSET ?")
    .all(limit, offset);
}

export function getCatalogStats(): CatalogStats {
  const database = tryDb();
  if (!database) {
    const entries = getFallbackEntries();
    return {
      total: entries.length,
      byLayer: countFallbackBy(entries, "layer"),
      byCategory: countFallbackBy(entries, "category"),
    };
  }
  const total = database.prepare<CountRow>("SELECT COUNT(*) AS count FROM entries").get()?.count ?? 0;
  return {
    total,
    byLayer: countBy("layer"),
    byCategory: countBy("category"),
  };
}

export function listLayers(): string[] {
  const database = tryDb();
  if (!database) return fallbackFacet("layer");
  return facet("layer");
}

export function listCategories(): string[] {
  const database = tryDb();
  if (!database) return fallbackFacet("category");
  return facet("category");
}

export function listSources(): string[] {
  const database = tryDb();
  if (!database) return fallbackFacet("source");
  return facet("source");
}

export function listShards(): CatalogShardSummary[] {
  const database = tryDb();
  if (!database) {
    return [{ id: "catalog/all", group: "catalog", name: "all", count: getFallbackEntries().length }];
  }
  return database
    .prepare<ShardRow>("SELECT id, group_name, name, count FROM shards ORDER BY group_name COLLATE NOCASE, name COLLATE NOCASE")
    .all()
    .map((row) => ({
      id: row.id,
      group: row.group_name,
      name: row.name,
      count: row.count,
    }));
}

export function getGeneratedAt(): string | null {
  const database = tryDb();
  if (!database) return null;
  return database.prepare<MetaRow>("SELECT value FROM meta WHERE key = 'generated_at'").get()?.value ?? null;
}

function searchRows(options: CatalogSearchOptions): {
  rows: EntryRow[];
  totalMatches: number;
  returned: number;
  limit: number;
  offset: number;
  hasMore: boolean;
} {
  const limit = normalizeLimit(options.limit);
  const offset = normalizeOffset(options.offset);
  const query = options.query?.trim() ?? "";
  const filters = buildFilters(options);
  const database = getDb();
  const args: unknown[] = [];
  let from = "entries e";
  let where = filters.sql;
  if (query) {
    const ftsQuery = toFtsQuery(query);
    if (ftsQuery) {
      from = "entries_fts JOIN entries e ON e.rowid = entries_fts.rowid";
      where = appendWhere(where, "entries_fts MATCH ?");
      args.push(ftsQuery);
    } else {
      where = appendWhere(where, "0");
    }
  }
  args.push(...filters.args);
  const count = database.prepare<CountRow>(`SELECT COUNT(*) AS count FROM ${from} ${where}`).get(...args)?.count ?? 0;
  const orderBy = query
    ? "ORDER BY bm25(entries_fts), e.source_display_name COLLATE NOCASE, e.title COLLATE NOCASE"
    : "ORDER BY e.source_display_name COLLATE NOCASE, e.title COLLATE NOCASE, e.id COLLATE NOCASE";
  const rows = database.prepare<EntryRow>(`SELECT e.* FROM ${from} ${where} ${orderBy} LIMIT ? OFFSET ?`).all(...args, limit, offset);
  return { rows, totalMatches: count, returned: rows.length, limit, offset, hasMore: offset + rows.length < count };
}

function buildFilters(options: CatalogSearchOptions): { sql: string; args: unknown[] } {
  const clauses: string[] = [];
  const args: unknown[] = [];
  addFilter(clauses, args, "e.source", options.source);
  addFilter(clauses, args, "e.layer", options.layer);
  addFilter(clauses, args, "e.category", options.category);
  addFilter(clauses, args, "e.confidence", options.confidence);
  addFilter(clauses, args, "e.source_lifecycle", options.sourceLifecycle);
  addFilter(clauses, args, "e.shard_id", options.shardId);
  return {
    sql: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "",
    args,
  };
}

function addFilter(clauses: string[], args: unknown[], column: string, value: string | undefined): void {
  const trimmed = value?.trim();
  if (!trimmed) return;
  clauses.push(`${column} = ?`);
  args.push(trimmed);
}

function appendWhere(where: string, clause: string): string {
  if (!where) return `WHERE ${clause}`;
  return `${where} AND ${clause}`;
}

function parseEntry(row: EntryRow): CatalogEntry {
  return JSON.parse(row.json) as CatalogEntry;
}

function summarizeRow(row: EntryRow): CatalogEntrySummary {
  return {
    id: row.id,
    title: row.title,
    layer: row.layer,
    source: row.source,
    sourceDisplayName: row.source_display_name ?? undefined,
    sourceLifecycle: row.source_lifecycle ?? undefined,
    category: row.category,
    confidence: row.confidence,
    summary: row.summary,
    retryHelpful: row.retry_helpful,
    increasingGasHelpful: row.increasing_gas_helpful,
    rootCauseKnown: row.root_cause_known === 1,
    shardId: row.shard_id,
  };
}

function countBy(column: "layer" | "category"): Record<string, number> {
  const rows = getDb().prepare<{ value: string; count: number }>(`SELECT ${column} AS value, COUNT(*) AS count FROM entries GROUP BY ${column}`).all();
  return Object.fromEntries(rows.map((row) => [row.value, row.count]));
}

function facet(column: "layer" | "category" | "source"): string[] {
  return getDb()
    .prepare<FacetRow>(`SELECT DISTINCT ${column} AS value FROM entries WHERE ${column} IS NOT NULL ORDER BY ${column} COLLATE NOCASE`)
    .all()
    .map((row) => row.value);
}

function getDb(): Database {
  if (db) return db;
  const Database = require("better-sqlite3") as BetterSqlite3;
  const path = process.env.REVERTWTF_CATALOG_DB_PATH || DEFAULT_DB_PATH;
  db = new Database(path, { readonly: true, fileMustExist: true });
  db.pragma("query_only = ON");
  return db;
}

function tryDb(): Database | undefined {
  if (dbUnavailable) return undefined;
  try {
    return getDb();
  } catch (err) {
    if (requiresSqliteDb()) throw err;
    dbUnavailable = true;
    return undefined;
  }
}

function requiresSqliteDb(): boolean {
  return Boolean(process.env.REVERTWTF_CATALOG_DB_PATH) || process.env.NODE_ENV === "production";
}

function getFallbackEntries(): CatalogEntry[] {
  if (fallbackEntries) return fallbackEntries;
  const catalogPath = fallbackCatalogPath();
  if (!existsSync(catalogPath)) {
    const shardsPath = fallbackShardsPath();
    if (existsSync(shardsPath)) {
      fallbackEntries = readShardEntries(shardsPath).sort((a, b) => a.id.localeCompare(b.id));
      return fallbackEntries;
    }
    throw new Error("Missing generated catalog SQLite DB and fallback catalog JSON. Build @revertwtf/catalog and @revertwtf/search.");
  }
  fallbackEntries = JSON.parse(readFileSync(catalogPath, "utf8")) as CatalogEntry[];
  return fallbackEntries;
}

function moduleDir(): string {
  return dirname(fileURLToPath(import.meta.url));
}

function fallbackCatalogPath(): string {
  return join(moduleDir(), "..", "..", "catalog", "dist", "data", "errors.json");
}

function fallbackShardsPath(): string {
  return join(moduleDir(), "..", "..", "catalog", "src", "data", "shards");
}

function readShardEntries(dir: string): CatalogEntry[] {
  const entries: CatalogEntry[] = [];
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, item.name);
    if (item.isDirectory()) {
      entries.push(...readShardEntries(path));
    } else if (item.isFile() && item.name.endsWith(".json")) {
      const parsed = JSON.parse(readFileSync(path, "utf8")) as CatalogEntry[];
      entries.push(...parsed);
    }
  }
  return entries;
}

function fallbackSearch(options: CatalogSearchOptions, summaries: false): CatalogSearchResult;
function fallbackSearch(options: CatalogSearchOptions, summaries: true): {
  entries: CatalogEntrySummary[];
  totalMatches: number;
  returned: number;
  limit: number;
  offset: number;
  hasMore: boolean;
};
function fallbackSearch(options: CatalogSearchOptions, summaries: boolean) {
  const limit = normalizeLimit(options.limit);
  const offset = normalizeOffset(options.offset);
  const q = options.query?.trim().toLowerCase() ?? "";
  const tokens = q.match(/[a-z0-9_]+/g) ?? [];
  const matches = getFallbackEntries()
    .filter((entry) => matchesFilter(entry, options))
    .filter((entry) => (tokens.length ? matchesTokens(entry, tokens) : true))
    .sort((a, b) => (a.sourceDisplayName ?? a.source).localeCompare(b.sourceDisplayName ?? b.source) || a.title.localeCompare(b.title));
  const page = matches.slice(offset, offset + limit);
  return {
    entries: summaries ? page.map((entry) => summarizeEntry(entry, "catalog/all")) : page,
    totalMatches: matches.length,
    returned: page.length,
    limit,
    offset,
    hasMore: offset + page.length < matches.length,
  };
}

function matchesFilter(entry: CatalogEntry, options: CatalogSearchOptions): boolean {
  return (!options.source || entry.source === options.source)
    && (!options.layer || entry.layer === options.layer)
    && (!options.category || entry.category === options.category)
    && (!options.confidence || entry.confidence === options.confidence)
    && (!options.sourceLifecycle || entry.sourceLifecycle === options.sourceLifecycle);
}

function matchesTokens(entry: CatalogEntry, tokens: string[]): boolean {
  const haystack = [
    entry.id,
    entry.title,
    entry.summary,
    entry.source,
    entry.sourceDisplayName,
    entry.sourceLifecycle,
    entry.category,
    ...(entry.sourceAliases ?? []),
    ...entry.likelyCauses,
    ...entry.nextSteps,
    ...(entry.examples ?? []),
    JSON.stringify(entry.patterns),
  ]
    .filter(Boolean)
    .join("\n")
    .toLowerCase();
  return tokens.every((token) => haystack.includes(token));
}

function summarizeEntry(entry: CatalogEntry, shardId: string): CatalogEntrySummary {
  return {
    id: entry.id,
    title: entry.title,
    layer: entry.layer,
    source: entry.source,
    sourceDisplayName: entry.sourceDisplayName,
    sourceLifecycle: entry.sourceLifecycle,
    category: entry.category,
    confidence: entry.confidence,
    summary: entry.summary,
    retryHelpful: entry.retryHelpful,
    increasingGasHelpful: entry.increasingGasHelpful,
    rootCauseKnown: entry.rootCauseKnown,
    shardId,
  };
}

function countFallbackBy(entries: CatalogEntry[], key: "layer" | "category"): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const entry of entries) counts[entry[key]] = (counts[entry[key]] ?? 0) + 1;
  return counts;
}

function fallbackFacet(key: "layer" | "category" | "source"): string[] {
  return Array.from(new Set(getFallbackEntries().map((entry) => entry[key]))).sort();
}

function normalizeLimit(raw: number | undefined): number {
  if (!Number.isFinite(raw)) return DEFAULT_LIMIT;
  return Math.min(Math.max(Math.trunc(raw ?? DEFAULT_LIMIT), 1), MAX_LIMIT);
}

function normalizeBulkLimit(raw: number | undefined): number {
  if (!Number.isFinite(raw)) return DEFAULT_LIMIT;
  return Math.min(Math.max(Math.trunc(raw ?? DEFAULT_LIMIT), 1), 50_000);
}

function normalizeOffset(raw: number | undefined): number {
  if (!Number.isFinite(raw)) return 0;
  return Math.max(Math.trunc(raw ?? 0), 0);
}

function toFtsQuery(query: string): string {
  const tokens = query
    .toLowerCase()
    .match(/[a-z0-9_]+/g)
    ?.slice(0, 16)
    .map((token) => `${token}*`) ?? [];
  return tokens.join(" AND ");
}
