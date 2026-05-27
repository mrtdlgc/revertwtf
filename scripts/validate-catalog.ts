import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";

interface Entry {
  id: string;
  title: string;
  layer: string;
  source: string;
  category: string;
  patterns: { type: string }[];
  requires?: { type: string }[];
  summary: string;
  likelyCauses: string[];
  nextSteps: string[];
  retryHelpful: string;
  increasingGasHelpful: string;
  confidence: string;
  references?: { label: string; url: string }[];
  related?: string[];
}

interface EntryRecord {
  entry: Entry;
  file: string;
  shard: string;
}

interface SourcifyIndex {
  source?: string;
  buckets?: { id?: string; path?: string; count?: number; attributedCount?: number }[];
}

const SHARDS_DIR = resolve("packages/catalog/src/data/shards");
const SOURCIFY_DIR = join(SHARDS_DIR, "ecosystems", "sourcify-signatures");
const ALLOWED_LAYERS = new Set(["evm", "rpc", "provider", "wallet", "library", "account_abstraction", "protocol", "unknown"]);
const ALLOWED_CONF = new Set(["high", "medium", "low"]);
const ALLOWED_HELP = new Set(["yes", "no", "sometimes", "unknown"]);
const ALLOWED_PATTERN_TYPES = new Set(["substring", "regex", "json_path", "selector", "aa_code"]);

const CURATED_DEDUPE_SHARDS = new Set([
  "core/eip-6093",
  "core/solidity",
  "core/erc-4337-entrypoint",
  "core/openzeppelin",
  "core/solady",
  "core/prb-math",
]);

let errors = 0;
function fail(msg: string) {
  console.error(`x ${msg}`);
  errors++;
}

const records = loadShardRecords();
const entries = records.map((record) => record.entry);

const ids = new Set<string>();
for (const { entry: e } of records) {
  const where = `[${e.id ?? "?"}]`;
  if (!e.id) fail(`${where} missing id`);
  if (ids.has(e.id)) fail(`${where} duplicate id`);
  ids.add(e.id);
  if (!e.title) fail(`${where} missing title`);
  if (!("source" in e) || typeof (e as { source?: unknown }).source !== "string" || !(e as { source: string }).source.trim()) {
    fail(`${where} missing source`);
  }
  if (!e.summary) fail(`${where} missing summary`);
  if (!ALLOWED_LAYERS.has(e.layer)) fail(`${where} invalid layer: ${e.layer}`);
  if (!ALLOWED_CONF.has(e.confidence)) fail(`${where} invalid confidence: ${e.confidence}`);
  if (!ALLOWED_HELP.has(e.retryHelpful)) fail(`${where} invalid retryHelpful: ${e.retryHelpful}`);
  if (!ALLOWED_HELP.has(e.increasingGasHelpful)) fail(`${where} invalid increasingGasHelpful: ${e.increasingGasHelpful}`);
  if (!Array.isArray(e.patterns) || e.patterns.length === 0) fail(`${where} no patterns`);
  for (const p of e.patterns ?? []) {
    if (!ALLOWED_PATTERN_TYPES.has(p.type)) fail(`${where} invalid pattern type: ${p.type}`);
  }
  for (const p of e.requires ?? []) {
    if (!ALLOWED_PATTERN_TYPES.has(p.type)) fail(`${where} invalid required pattern type: ${p.type}`);
  }
  if (!Array.isArray(e.likelyCauses) || e.likelyCauses.length === 0) fail(`${where} empty likelyCauses`);
  if (!Array.isArray(e.nextSteps) || e.nextSteps.length === 0) fail(`${where} empty nextSteps`);
  for (const r of e.references ?? []) {
    if (!r.url.startsWith("http")) fail(`${where} reference url should be absolute: ${r.url}`);
  }
}

for (const e of entries) {
  for (const rel of e.related ?? []) {
    if (!ids.has(rel)) fail(`[${e.id}] related id not found: ${rel}`);
  }
}

validateSourcifyShards(records);

if (errors > 0) {
  console.error(`\n${errors} validation error(s)`);
  process.exit(1);
} else {
  console.log(`ok ${entries.length} catalog entries validated`);
}

function loadShardRecords(): EntryRecord[] {
  if (!existsSync(SHARDS_DIR)) {
    fail(`missing catalog shards directory: ${SHARDS_DIR}`);
    return [];
  }

  const files = listJsonFiles(SHARDS_DIR);
  if (files.length === 0) fail("catalog has no shard files");

  const all: EntryRecord[] = [];
  for (const file of files) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(readFileSync(file, "utf8"));
    } catch (e) {
      fail(`${relative(process.cwd(), file)} invalid JSON: ${(e as Error).message}`);
      continue;
    }
    if (!Array.isArray(parsed)) {
      fail(`${relative(process.cwd(), file)} is not an array`);
      continue;
    }
    const shard = relative(SHARDS_DIR, file).replace(/\\/g, "/").replace(/\.json$/, "");
    all.push(...(parsed as Entry[]).map((entry) => ({ entry, file, shard })));
  }
  return all;
}

function listJsonFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...listJsonFiles(full));
    if (entry.isFile() && entry.name.endsWith(".json") && entry.name !== "_index.json") files.push(full);
  }
  return files.sort();
}

function validateSourcifyShards(records: EntryRecord[]) {
  if (!existsSync(SOURCIFY_DIR)) return;

  const sourcifyRecords = records.filter((record) => record.shard.startsWith("ecosystems/sourcify-signatures/"));
  const sourcifySelectorToShard = new Map<string, string>();
  const curatedSelectors = new Map<string, string>();

  for (const record of records) {
    if (record.shard.startsWith("ecosystems/sourcify-signatures/")) continue;
    const isCurated =
      CURATED_DEDUPE_SHARDS.has(record.shard) ||
      (record.shard.startsWith("ecosystems/") && !record.shard.startsWith("ecosystems/sourcify-signatures"));
    if (!isCurated) continue;
    for (const selector of selectorPatterns(record.entry)) {
      if (!curatedSelectors.has(selector)) curatedSelectors.set(selector, record.shard);
    }
  }

  for (const record of sourcifyRecords) {
    const where = `[${record.entry.id ?? "?"}]`;
    if (record.entry.source !== "sourcify-signatures") {
      fail(`${where} Sourcify bucket entry has source ${record.entry.source}`);
    }
    if (record.entry.category !== "custom_error") {
      fail(`${where} Sourcify bucket entry has category ${record.entry.category}`);
    }
    for (const selector of selectorPatterns(record.entry)) {
      const existing = sourcifySelectorToShard.get(selector);
      if (existing && existing !== record.shard) {
        fail(`${where} Sourcify selector ${selector} also appears in ${existing}`);
      } else {
        sourcifySelectorToShard.set(selector, record.shard);
      }
      const curated = curatedSelectors.get(selector);
      if (curated) {
        fail(`${where} Sourcify selector ${selector} collides with curated shard ${curated}`);
      }
    }
  }

  validateSourcifyIndex(sourcifyRecords);
}

function validateSourcifyIndex(sourcifyRecords: EntryRecord[]) {
  const indexPath = join(SOURCIFY_DIR, "_index.json");
  if (!existsSync(indexPath)) {
    fail("Sourcify bucket directory is missing _index.json");
    return;
  }

  let parsed: SourcifyIndex;
  try {
    parsed = JSON.parse(readFileSync(indexPath, "utf8")) as SourcifyIndex;
  } catch (error) {
    fail(`Sourcify _index.json invalid JSON: ${(error as Error).message}`);
    return;
  }

  if (parsed.source !== "sourcify-signatures") fail("Sourcify _index.json has wrong source");
  if (!Array.isArray(parsed.buckets)) {
    fail("Sourcify _index.json missing buckets array");
    return;
  }

  const filesOnDisk = new Map<string, number>();
  for (const record of sourcifyRecords) {
    const file = relative(SOURCIFY_DIR, record.file).replace(/\\/g, "/");
    filesOnDisk.set(file, (filesOnDisk.get(file) ?? 0) + 1);
  }

  const manifestFiles = new Set<string>();
  for (const bucket of parsed.buckets) {
    const id = bucket.id ?? "?";
    const path = bucket.path ?? "";
    if (!path.endsWith(".json") || path.includes("/") || path === "_index.json") {
      fail(`Sourcify _index bucket ${id} has invalid path: ${path}`);
      continue;
    }
    manifestFiles.add(path);
    if (!existsSync(join(SOURCIFY_DIR, path))) fail(`Sourcify _index bucket ${id} points to missing ${path}`);
    const actualCount = filesOnDisk.get(path) ?? 0;
    if (bucket.count !== actualCount) fail(`Sourcify _index bucket ${id} count ${bucket.count} != ${actualCount}`);
    if (actualCount === 0) fail(`Sourcify bucket ${id} has no entries`);
  }

  for (const file of filesOnDisk.keys()) {
    if (!manifestFiles.has(file)) fail(`Sourcify bucket file ${file} is missing from _index.json`);
  }
}

function selectorPatterns(entry: Entry): string[] {
  return (entry.patterns ?? [])
    .filter((pattern): pattern is { type: "selector"; value: string } => pattern.type === "selector" && typeof (pattern as { value?: unknown }).value === "string")
    .map((pattern) => pattern.value.toLowerCase());
}
