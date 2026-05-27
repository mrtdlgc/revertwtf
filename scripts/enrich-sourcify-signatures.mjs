import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import {
  BUCKET_IDS,
  classifySignature,
  isErrorLikeSignature,
  renderSourcifyEntry,
  signatureName,
} from "./sourcify-buckets.mjs";

const requireFromParser = createRequire(new URL("../packages/parser/package.json", import.meta.url));
const { toFunctionSelector } = await import(pathToFileURL(requireFromParser.resolve("viem")));

const ROOT = findRoot(process.cwd());
const SHARDS_DIR = join(ROOT, "packages", "catalog", "src", "data", "shards");
const ECOSYSTEMS_DIR = join(SHARDS_DIR, "ecosystems");
const SOURCIFY_CACHE_DIR = join(ROOT, ".cache", "sourcify-signatures");
const SOURCIFY_CACHE_PATH = join(SOURCIFY_CACHE_DIR, "error-like-signatures.json");
const CONTRACT_INDEX_PATH = join(ROOT, ".cache", "sourcify-contracts", "index.json");
const OUT_DIR = join(ECOSYSTEMS_DIR, "sourcify-signatures");
const OLD_OUT_PATH = join(ECOSYSTEMS_DIR, "sourcify-signatures.json");

const API_BASE = "https://api.4byte.sourcify.dev/signature-database/v1/search";
const USER_AGENT = "revertwtf-sourcify-signature-enrichment";
const FIRST_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");
const refresh4byte = args.includes("--refresh-4byte");
const selectedBucket = stringArg("--bucket");
const target = numberArg("--target", Number.POSITIVE_INFINITY);
const offset = numberArg("--offset", 0);
const maxPrefixes = numberArg("--max-prefixes", 120);
const concurrency = numberArg("--concurrency", 4);
const fetchTimeoutMs = numberArg("--fetch-timeout-ms", 10_000);
const maxUnclassifiedRatio = numberArg("--max-unclassified-ratio", 0.03);
const keepAllUnclassified = args.includes("--keep-all-unclassified");
const selectedPrefixes = repeatedStringArg("--prefix");

if (selectedBucket && !BUCKET_IDS.includes(selectedBucket)) {
  throw new Error(`Unknown bucket ${selectedBucket}. Expected one of: ${BUCKET_IDS.join(", ")}`);
}

if (refresh4byte) {
  await refreshSignatureCache();
}

const signatures = loadSignatureCorpus();
const contractIndex = loadContractIndex();
const curated = loadCuratedSelectorIndex();
const buckets = new Map(BUCKET_IDS.map((id) => [id, []]));
const seenSelectors = new Map();
const droppedBySource = new Map();
let skippedMalformed = 0;
let skippedDuplicateSelector = 0;
let skippedByBucketFilter = 0;
let droppedLowSignalUnclassified = 0;

for (const item of signatures.slice(0, target)) {
  const signature = normalizeSignature(item.name ?? item.signature);
  if (!signature || !isErrorLikeSignature(signature)) {
    skippedMalformed += 1;
    continue;
  }

  const selector = normalizeSelector(item.selector ?? safeSelector(signature));
  if (!selector) {
    skippedMalformed += 1;
    continue;
  }

  const curatedHit = curated.selectors.get(selector);
  if (curatedHit) {
    increment(droppedBySource, curatedHit);
    continue;
  }

  const bucket = classifySignature(signature);
  if (selectedBucket && bucket.id !== selectedBucket) {
    skippedByBucketFilter += 1;
    continue;
  }

  const attributions = (contractIndex[selector] ?? []).slice(0, 5);
  const entry = renderSourcifyEntry({ signature, selector, attributions, bucket });
  const existing = seenSelectors.get(selector);
  if (existing) {
    const winner = betterEntry(existing, entry);
    if (winner === existing) {
      skippedDuplicateSelector += 1;
      continue;
    }
    removeEntryFromBucket(buckets, existing);
    skippedDuplicateSelector += 1;
  }
  seenSelectors.set(selector, entry);
  buckets.get(bucket.id).push(entry);
}

for (const entries of buckets.values()) entries.sort((a, b) => a.id.localeCompare(b.id));
if (!selectedBucket && !keepAllUnclassified) {
  droppedLowSignalUnclassified = capUnclassifiedBucket(buckets, maxUnclassifiedRatio);
}

printReport({
  signatures,
  buckets,
  droppedBySource,
  skippedMalformed,
  skippedDuplicateSelector,
  skippedByBucketFilter,
  droppedLowSignalUnclassified,
});

if (!isDryRun) {
  writeBuckets(buckets);
}

function loadSignatureCorpus() {
  if (existsSync(SOURCIFY_CACHE_PATH)) {
    const parsed = JSON.parse(readFileSync(SOURCIFY_CACHE_PATH, "utf8"));
    if (!Array.isArray(parsed)) throw new Error(`${relative(ROOT, SOURCIFY_CACHE_PATH)} must be a JSON array`);
    return parsed.sort(compareSignatureItems);
  }

  if (existsSync(OLD_OUT_PATH)) {
    const parsed = JSON.parse(readFileSync(OLD_OUT_PATH, "utf8"));
    if (!Array.isArray(parsed)) throw new Error(`${relative(ROOT, OLD_OUT_PATH)} must be a JSON array`);
    return parsed
      .flatMap((entry) => {
        const selector = entry.patterns?.find((pattern) => pattern?.type === "selector")?.value;
        const signature = entry.examples?.find((example) => typeof example === "string" && example.includes("//"))?.split("//")[1]?.trim();
        return selector && signature ? [{ selector, name: signature }] : [];
      })
      .sort(compareSignatureItems);
  }

  throw new Error(
    `Missing Sourcify signature cache at ${relative(ROOT, SOURCIFY_CACHE_PATH)}. Run with --refresh-4byte first.`,
  );
}

function loadContractIndex() {
  if (!existsSync(CONTRACT_INDEX_PATH)) return {};
  const parsed = JSON.parse(readFileSync(CONTRACT_INDEX_PATH, "utf8"));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${relative(ROOT, CONTRACT_INDEX_PATH)} must be a selector-to-attributions object`);
  }
  return parsed;
}

function loadCuratedSelectorIndex() {
  const selectors = new Map();
  const files = [
    join(SHARDS_DIR, "core", "eip-6093.json"),
    join(SHARDS_DIR, "core", "solidity.json"),
    join(SHARDS_DIR, "core", "erc-4337-entrypoint.json"),
    join(SHARDS_DIR, "core", "openzeppelin.json"),
    join(SHARDS_DIR, "core", "solady.json"),
    join(SHARDS_DIR, "core", "prb-math.json"),
    ...listJsonFiles(ECOSYSTEMS_DIR).filter((file) => {
      const rel = relative(ECOSYSTEMS_DIR, file).replace(/\\/g, "/");
      return !rel.startsWith("sourcify-signatures");
    }),
  ];

  for (const file of files) {
    if (!existsSync(file)) continue;
    const shardId = relative(SHARDS_DIR, file).replace(/\\/g, "/").replace(/\.json$/, "");
    const parsed = JSON.parse(readFileSync(file, "utf8"));
    if (!Array.isArray(parsed)) continue;
    for (const entry of parsed) {
      for (const selector of selectorsForEntry(entry)) {
        if (!selectors.has(selector)) selectors.set(selector, shardId);
      }
    }
  }

  return { selectors };
}

async function refreshSignatureCache() {
  mkdirSync(SOURCIFY_CACHE_DIR, { recursive: true });
  const cached = existsSync(SOURCIFY_CACHE_PATH) ? JSON.parse(readFileSync(SOURCIFY_CACHE_PATH, "utf8")) : [];
  const bySignature = new Map(cached.map((item) => [item.name, item]));
  const prefixes = selectedPrefixes.length > 0 ? selectedPrefixes.map(normalizePrefix) : buildPrefixes().slice(offset, offset + maxPrefixes);

  console.log(`sourcify-signatures: ${cached.length} cached before refresh`);
  console.log(`sourcify-signatures: probing ${prefixes.length} prefixes`);

  await mapLimit(prefixes, concurrency, async (prefix) => {
    let found = [];
    try {
      found = await searchPrefix(prefix);
    } catch (error) {
      console.error(`sourcify-signatures: ${prefix} failed: ${error.message}`);
      return;
    }
    let added = 0;
    for (const item of found) {
      if (!bySignature.has(item.name)) {
        bySignature.set(item.name, item);
        cached.push(item);
        added += 1;
      }
    }
    console.log(`sourcify-signatures: ${prefix} -> ${found.length} found, ${added} new`);
  });

  cached.sort(compareSignatureItems);
  writeFileSync(SOURCIFY_CACHE_PATH, `${JSON.stringify(cached, null, 2)}\n`);
  console.log(`sourcify-signatures: ${cached.length} cached after refresh`);
}

async function searchPrefix(prefix) {
  const url = new URL(API_BASE);
  url.searchParams.set("query", `${prefix}*`);
  url.searchParams.set("filter", "true");
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(fetchTimeoutMs),
  });
  if (!response.ok) throw new Error(`Sourcify search failed for ${prefix}: ${response.status}`);
  const payload = await response.json();
  const signatureGroups = payload?.result?.function ?? payload?.result?.error ?? {};
  const out = [];
  for (const [selector, signaturesForSelector] of Object.entries(signatureGroups)) {
    if (!Array.isArray(signaturesForSelector)) continue;
    for (const signature of signaturesForSelector) {
      if (!signature?.hasVerifiedContract) continue;
      const name = normalizeSignature(signature.name);
      if (!name || !isErrorLikeSignature(name)) continue;
      if (safeSelector(name) !== normalizeSelector(selector)) continue;
      out.push({ selector: normalizeSelector(selector), name });
    }
  }
  return out;
}

function writeBuckets(buckets) {
  mkdirSync(dirname(OUT_DIR), { recursive: true });
  if (!selectedBucket) {
    rmSync(OUT_DIR, { recursive: true, force: true });
    rmSync(OLD_OUT_PATH, { force: true });
  }
  mkdirSync(OUT_DIR, { recursive: true });

  const idsToWrite = selectedBucket ? [selectedBucket] : BUCKET_IDS;
  for (const id of idsToWrite) {
    const entries = buckets.get(id) ?? [];
    writeFileSync(join(OUT_DIR, `${id}.json`), `${JSON.stringify(entries, null, 2)}\n`);
  }

  writeManifest();
  console.log(`sourcify-signatures: wrote ${selectedBucket ? selectedBucket : "all buckets"} to ${relative(ROOT, OUT_DIR)}`);
}

function writeManifest() {
  const bucketRows = BUCKET_IDS.map((id) => {
    const file = join(OUT_DIR, `${id}.json`);
    const entries = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : [];
    return {
      id,
      path: `${id}.json`,
      count: entries.length,
      attributedCount: entries.filter((entry) => (entry.examples ?? []).some((example) => example.includes(" - seen in "))).length,
    };
  });
  const manifest = {
    source: "sourcify-signatures",
    generatedAt: new Date().toISOString(),
    bucketCount: bucketRows.length,
    entryCount: bucketRows.reduce((sum, bucket) => sum + bucket.count, 0),
    buckets: bucketRows,
  };
  writeFileSync(join(OUT_DIR, "_index.json"), `${JSON.stringify(manifest, null, 2)}\n`);
}

function capUnclassifiedBucket(buckets, maxRatio) {
  const unclassified = buckets.get("unclassified") ?? [];
  const classifiedTotal = [...buckets.entries()]
    .filter(([id]) => id !== "unclassified")
    .reduce((sum, [, entries]) => sum + entries.length, 0);
  const maxUnclassified = Math.max(1, Math.floor((classifiedTotal * maxRatio) / Math.max(0.01, 1 - maxRatio)));
  if (unclassified.length <= maxUnclassified) return 0;

  const scored = unclassified
    .map((entry) => ({ entry, score: unclassifiedScore(entry) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.entry.id.localeCompare(b.entry.id));
  const kept = scored.slice(0, maxUnclassified).map((item) => item.entry).sort((a, b) => a.id.localeCompare(b.id));
  if (kept.length === 0 && unclassified.length > 0) kept.push(unclassified[0]);
  buckets.set("unclassified", kept);
  return unclassified.length - kept.length;
}

function unclassifiedScore(entry) {
  const signature = entry.examples?.[0]?.split("//")[1]?.trim() ?? "";
  const name = signatureName(signature);
  const words = name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2")
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean);
  const descriptiveWords = words.filter((word) => word.length > 2).length;
  const hasAttribution = (entry.examples ?? []).some((example) => example.includes(" - seen in ")) ? 100 : 0;
  const hasKeyword = words.some((word) =>
    /^(fail|failed|invalid|error|revert|missing|mismatch|denied|required|locked|blocked|closed|empty|exists|safe|check|cannot|forbidden|expired|exceeded|rejected)$/i.test(word),
  )
    ? 25
    : 0;
  const testNamePenalty = /function|mock|test|sample|example|dummy|foo|bar/i.test(name) ? -50 : 0;
  if (hasAttribution === 0 && hasKeyword === 0) return 0;
  return hasAttribution + hasKeyword + descriptiveWords * 2 + Math.min(name.length, 80) / 20 + testNamePenalty;
}

function printReport({
  signatures,
  buckets,
  droppedBySource,
  skippedMalformed,
  skippedDuplicateSelector,
  skippedByBucketFilter,
  droppedLowSignalUnclassified,
}) {
  const rows = BUCKET_IDS.map((id) => {
    const entries = buckets.get(id) ?? [];
    return {
      id,
      count: entries.length,
      attributed: entries.filter((entry) => (entry.examples ?? []).some((example) => example.includes(" - seen in "))).length,
    };
  });
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  const unclassified = rows.find((row) => row.id === "unclassified")?.count ?? 0;
  const ratio = total === 0 ? 0 : (unclassified / total) * 100;

  console.log(`sourcify-signatures: ${signatures.length} signatures in corpus`);
  console.log(`sourcify-signatures: ${total} entries after curated dedupe and selector collapse`);
  console.log(`sourcify-signatures: ${unclassified} unclassified (${ratio.toFixed(2)}%)`);
  console.log(`sourcify-signatures: ${skippedMalformed} malformed/non-error-like skipped`);
  console.log(`sourcify-signatures: ${skippedDuplicateSelector} duplicate selectors collapsed`);
  if (droppedLowSignalUnclassified > 0) {
    console.log(`sourcify-signatures: ${droppedLowSignalUnclassified} low-signal unclassified entries capped`);
  }
  if (skippedByBucketFilter > 0) console.log(`sourcify-signatures: ${skippedByBucketFilter} skipped by --bucket filter`);

  console.log("\nBucket counts:");
  for (const row of rows) {
    console.log(`- ${row.id}: ${row.count}${row.attributed > 0 ? ` (${row.attributed} attributed)` : ""}`);
  }

  if (droppedBySource.size > 0) {
    console.log("\nDropped selectors already covered by curated shards:");
    for (const [source, count] of [...droppedBySource.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))) {
      console.log(`- ${source}: ${count}`);
    }
  }
}

function betterEntry(a, b) {
  const scoreA = entryScore(a);
  const scoreB = entryScore(b);
  if (scoreA !== scoreB) return scoreA > scoreB ? a : b;
  return a.id.localeCompare(b.id) <= 0 ? a : b;
}

function entryScore(entry) {
  const confidence = { high: 30, medium: 20, low: 10 }[entry.confidence] ?? 0;
  const classified = entry.id.includes("unclassified") ? 0 : 100;
  const attributed = (entry.examples ?? []).some((example) => example.includes(" - seen in ")) ? 5 : 0;
  const name = signatureName(entry.examples?.[0]?.split("//")[1]?.trim() ?? "");
  const readable = /^[A-Z]/.test(name) ? 2 : 0;
  return classified + confidence + attributed + readable + Math.min(name.length, 60) / 100;
}

function removeEntryFromBucket(buckets, entry) {
  for (const entries of buckets.values()) {
    const index = entries.findIndex((candidate) => candidate.patterns?.[0]?.value === entry.patterns?.[0]?.value);
    if (index !== -1) {
      entries.splice(index, 1);
      return;
    }
  }
}

function selectorsForEntry(entry) {
  const selectors = [];
  for (const pattern of entry.patterns ?? []) {
    const selector = pattern?.type === "selector" ? normalizeSelector(pattern.value) : null;
    if (selector) selectors.push(selector);
  }
  return selectors;
}

function listJsonFiles(dir) {
  if (!existsSync(dir)) return [];
  const files = [];
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, item.name);
    if (item.isDirectory()) files.push(...listJsonFiles(full));
    if (item.isFile() && item.name.endsWith(".json") && item.name !== "_index.json") files.push(full);
  }
  return files.sort();
}

function buildPrefixes() {
  const prefixes = [];
  for (const first of FIRST_CHARS) {
    for (const second of CHARS) prefixes.push(`${first}${second}`);
  }
  return prefixes;
}

function normalizeSignature(value) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, "") : null;
}

function normalizeSelector(value) {
  if (typeof value !== "string") return null;
  const selector = value.toLowerCase();
  return /^0x[0-9a-f]{8}$/.test(selector) ? selector : null;
}

function safeSelector(signature) {
  try {
    return normalizeSelector(toFunctionSelector(signature));
  } catch {
    return null;
  }
}

function compareSignatureItems(a, b) {
  return String(a.name ?? a.signature ?? "").localeCompare(String(b.name ?? b.signature ?? ""));
}

function increment(map, key) {
  map.set(key, (map.get(key) ?? 0) + 1);
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

function normalizePrefix(value) {
  if (!/^[A-Za-z][A-Za-z0-9]$/.test(value)) {
    throw new Error(`Invalid prefix ${value}; expected two characters matching [A-Za-z][A-Za-z0-9]`);
  }
  return value;
}

function repeatedStringArg(name) {
  const values = [];
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === name) {
      if (!args[i + 1]) throw new Error(`${name} requires a value`);
      values.push(args[i + 1]);
      i += 1;
    } else if (args[i].startsWith(`${name}=`)) {
      values.push(args[i].slice(name.length + 1));
    }
  }
  return values;
}

function stringArg(name) {
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === name) return args[i + 1];
    if (args[i].startsWith(`${name}=`)) return args[i].slice(name.length + 1);
  }
  return null;
}

function numberArg(name, fallback) {
  const value = stringArg(name);
  if (value === null || value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`${name} requires a non-negative number`);
  return parsed;
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
