import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

// Build .cache/sourcify-contracts/index.json (selector -> attributions[]) from
// Sourcify's public Parquet export at https://export.sourcify.dev.
//
// The live enumeration endpoint (/server/v2/contracts/{chainId}) returns 403 for
// everyone, so attribution is derived from the export instead. DuckDB reads the
// Parquet directly over HTTPS (httpfs); only the small projected columns are
// pulled, so a filtered build transfers a few GB, not the full ~15 GB DB.
//
// Requires the DuckDB CLI. Point at it with --duckdb <path> or DUCKDB_BIN.
// See docs/sourcify-signature-rebuild-plan.md for the verified query + gotchas.

const ROOT = findRoot(process.cwd());
const CACHE_DIR = join(ROOT, ".cache", "sourcify-contracts");
const INDEX_PATH = join(CACHE_DIR, "index.json");
const KEYS_DIR = join(CACHE_DIR, "keys");
const SOURCIFY_SHARDS_DIR = join(ROOT, "packages", "catalog", "src", "data", "shards", "ecosystems", "sourcify-signatures");
const EXPORT_BASE = "https://export.sourcify.dev";

// Mainnet allowlist: chain_id -> display name. Testnet deployments in the export
// are intentionally dropped so entries are not tagged with throwaway contracts.
const CHAIN_NAMES = {
  1: "ethereum",
  10: "optimism",
  56: "bsc",
  137: "polygon",
  8453: "base",
  42161: "arbitrum",
  43114: "avalanche",
};

const TABLES = ["compiled_contracts_signatures", "compiled_contracts", "verified_contracts", "contract_deployments"];

const args = process.argv.slice(2);
const duckdbBin = stringArg("--duckdb") ?? process.env.DUCKDB_BIN ?? "duckdb";
const printSqlOnly = args.includes("--print-sql");
const refreshKeys = args.includes("--refresh-keys");
const maxAttributions = numberArg("--max-attributions", 25);
const httpTimeoutMs = numberArg("--http-timeout-ms", 300_000);

mkdirSync(CACHE_DIR, { recursive: true });
mkdirSync(KEYS_DIR, { recursive: true });

const targets = loadTargetSelectors();
if (targets.length === 0) {
  throw new Error(`No Sourcify selectors found under ${rel(SOURCIFY_SHARDS_DIR)}. Run enrich-sourcify-signatures.mjs first.`);
}
console.log(`sourcify-contracts: ${targets.length} target selectors from current shards`);

const keysByTable = {};
for (const table of TABLES) keysByTable[table] = await listKeys(table);

const sql = buildSql(targets, keysByTable);

if (printSqlOnly) {
  process.stdout.write(`${sql}\n`);
  process.exit(0);
}

const duckdbVersion = ensureDuckdb(duckdbBin);
console.log(`sourcify-contracts: using DuckDB ${duckdbVersion}`);
console.log("sourcify-contracts: running remote join (expect ~8-10 min)...");

const ndjsonPath = join(CACHE_DIR, "attributions.ndjson");
rmSync(ndjsonPath, { force: true });
runDuckdb(duckdbBin, sql.replace("__NDJSON_OUT__", posix(ndjsonPath)));

const index = ndjsonToIndex(ndjsonPath);
writeFileSync(INDEX_PATH, `${JSON.stringify(index, null, 2)}\n`);
console.log(`sourcify-contracts: wrote ${Object.keys(index).length} attributed selectors to ${rel(INDEX_PATH)}`);

function buildSql(selectors, keys) {
  const ccs = urlList(keys.compiled_contracts_signatures);
  const cc = urlList(keys.compiled_contracts);
  const vc = urlList(keys.verified_contracts);
  const cd = urlList(keys.contract_deployments);
  const targetValues = selectors.map((selector) => `('${selector}')`).join(", ");
  const chains = Object.keys(CHAIN_NAMES).join(", ");
  const chainCases = Object.entries(CHAIN_NAMES)
    .map(([id, name]) => `WHEN ${id} THEN '${name}'`)
    .join(" ");
  // repoUrl uses the numeric chain_id (Sourcify's v2 contract API path), while
  // the friendly chain name is kept in the `chain` field for display.

  return `LOAD httpfs;
SET http_timeout=${httpTimeoutMs};
CREATE TEMP TABLE targets(selector VARCHAR);
INSERT INTO targets VALUES ${targetValues};
COPY (
  WITH ccs AS (
    SELECT compilation_id,
           '0x' || lower(substr(to_hex(signature_hash_32), 1, 8)) AS selector
    FROM read_parquet([${ccs}])
    WHERE signature_type IN ('function', 'error')
      AND '0x' || lower(substr(to_hex(signature_hash_32), 1, 8)) IN (SELECT selector FROM targets)
  ),
  attr AS (
    SELECT ccs.selector,
           (CASE cd.chain_id ${chainCases} ELSE cd.chain_id::VARCHAR END) AS chain,
           cd.chain_id::VARCHAR AS chainId,
           '0x' || lower(to_hex(cd.address)) AS address,
           cc.name AS contractName
    FROM ccs
    JOIN read_parquet([${cc}]) cc ON cc.id = ccs.compilation_id
    JOIN read_parquet([${vc}]) vc ON vc.compilation_id = ccs.compilation_id
    JOIN read_parquet([${cd}]) cd ON cd.id = vc.deployment_id
    WHERE cd.chain_id IN (${chains})
  )
  SELECT selector,
         list(DISTINCT {
           'chain': chain,
           'address': address,
           'contractName': contractName,
           'repoUrl': 'https://sourcify.dev/server/v2/contract/' || chainId || '/' || address
         })[1:${maxAttributions}] AS attributions
  FROM attr
  GROUP BY selector
) TO '__NDJSON_OUT__' (FORMAT JSON, ARRAY false);
`;
}

function ndjsonToIndex(path) {
  if (!existsSync(path)) return {};
  const index = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const row = JSON.parse(trimmed);
    if (!row.selector || !Array.isArray(row.attributions)) continue;
    index[row.selector] = row.attributions;
  }
  return Object.fromEntries(Object.entries(index).sort(([a], [b]) => a.localeCompare(b)));
}

function loadTargetSelectors() {
  if (!existsSync(SOURCIFY_SHARDS_DIR)) return [];
  const selectors = new Set();
  for (const name of readdirSync(SOURCIFY_SHARDS_DIR)) {
    if (!name.endsWith(".json") || name === "_index.json") continue;
    const entries = JSON.parse(readFileSync(join(SOURCIFY_SHARDS_DIR, name), "utf8"));
    if (!Array.isArray(entries)) continue;
    for (const entry of entries) {
      for (const pattern of entry.patterns ?? []) {
        if (pattern?.type === "selector" && /^0x[0-9a-f]{8}$/i.test(pattern.value ?? "")) {
          selectors.add(pattern.value.toLowerCase());
        }
      }
    }
  }
  return [...selectors].sort();
}

async function listKeys(table) {
  const cachePath = join(KEYS_DIR, `${table}.json`);
  if (!refreshKeys && existsSync(cachePath)) {
    return JSON.parse(readFileSync(cachePath, "utf8"));
  }

  const keys = [];
  let token = null;
  do {
    const url = new URL(EXPORT_BASE);
    url.searchParams.set("list-type", "2");
    url.searchParams.set("prefix", `${table}/`);
    if (token) url.searchParams.set("continuation-token", token);
    const xml = await fetchText(url);
    for (const match of xml.matchAll(/<Key>([^<]+)<\/Key>/g)) {
      if (match[1].endsWith(".parquet")) keys.push(match[1]);
    }
    const next = xml.match(/<NextContinuationToken>([^<]+)<\/NextContinuationToken>/);
    token = next ? next[1] : null;
  } while (token);

  if (keys.length === 0) throw new Error(`No parquet files listed for ${table}/`);
  writeFileSync(cachePath, `${JSON.stringify(keys, null, 2)}\n`);
  console.log(`sourcify-contracts: ${table} -> ${keys.length} parquet files`);
  return keys;
}

function urlList(keys) {
  return keys.map((key) => `'${EXPORT_BASE}/${key}'`).join(", ");
}

function ensureDuckdb(bin) {
  try {
    return execFileSync(bin, ["--version"], { encoding: "utf8" }).trim();
  } catch (error) {
    throw new Error(
      `DuckDB CLI not runnable as "${bin}". Install it (https://duckdb.org/docs/installation/) ` +
        `and pass --duckdb <path> or set DUCKDB_BIN. Original error: ${error.message}`,
    );
  }
}

function runDuckdb(bin, sql) {
  const sqlPath = join(CACHE_DIR, "build-index.sql");
  writeFileSync(sqlPath, sql);
  execFileSync(bin, [`-c`, `.read ${posix(sqlPath)}`], { stdio: "inherit" });
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: { "User-Agent": "revertwtf-sourcify-contract-index" },
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  return response.text();
}

function posix(path) {
  return path.replace(/\\/g, "/");
}

function rel(path) {
  return path.replace(`${ROOT}\\`, "").replace(`${ROOT}/`, "");
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
