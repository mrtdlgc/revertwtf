import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join, relative, resolve } from "node:path";

const ROOT = findRoot(process.cwd());
const SHARDS_DIR = join(ROOT, "packages", "catalog", "src", "data", "shards");
const CACHE_DIR = join(ROOT, ".cache", "catalog-enrichment-audit");
const SAMPLE_SIZE = numberArg("--sample-size", 100);
const SEED = stringArg("--seed", "default");
const REFRESH = process.argv.includes("--refresh");

mkdirSync(CACHE_DIR, { recursive: true });

const recentEntries = [];
const candidates = [];
for (const file of listJsonFiles(SHARDS_DIR)) {
  const parsed = JSON.parse(readFileSync(file, "utf8"));
  if (!Array.isArray(parsed)) continue;
  for (const entry of parsed) {
    if (!isRecentlyGeneratedEnriched(entry)) continue;
    const item = { file: relative(SHARDS_DIR, file).replace(/\\/g, "/"), entry, token: verificationToken(entry) };
    recentEntries.push(item);
    const sourceUrl = sourceUrlFor(entry);
    if (!sourceUrl) continue;
    if (!item.token) continue;
    candidates.push({ ...item, sourceUrl });
  }
}

const sample = stratifiedSample(candidates, SAMPLE_SIZE, SEED);
const results = [];
for (const item of sample) {
  const source = await fetchText(item.sourceUrl);
  const exact = source.ok && containsEvidence(source.text, item.token);
  const family = familyFromSummary(item.entry.summary);
  const suspicious = suspiciousFamily(item.entry, family);
  const productIssues = productQualityIssues(item.entry, family);
  results.push({
    id: item.entry.id,
    file: item.file,
    source: item.entry.source,
    category: item.entry.category,
    token: item.token,
    family,
    sourceUrl: item.sourceUrl,
    sourceStatus: source.status,
    exactSourceHit: exact,
    suspicious,
    productIssues,
    summary: item.entry.summary,
  });
}

const broadProductIssues = recentEntries.flatMap((item) => {
  const family = familyFromSummary(item.entry.summary);
  return productQualityIssues(item.entry, family).map((issue) => ({
    issue,
    id: item.entry.id,
    file: item.file,
    source: item.entry.source,
    category: item.entry.category,
    token: item.token,
    family,
    summary: item.entry.summary,
  }));
});

const report = {
  seed: SEED,
  sampleSize: results.length,
  recentEntries: recentEntries.length,
  candidates: candidates.length,
  exactSourceHits: results.filter((result) => result.exactSourceHit).length,
  sourceFetchFailures: results.filter((result) => result.sourceStatus !== 200).length,
  sourceMisses: results.filter((result) => result.sourceStatus === 200 && !result.exactSourceHit).length,
  suspiciousFamily: results.filter((result) => result.suspicious.length > 0).length,
  productIssueSampleCount: results.filter((result) => result.productIssues.length > 0).length,
  broadProductIssueCount: broadProductIssues.length,
  broadProductIssueTypes: countValues(broadProductIssues.map((result) => result.issue)),
  broadProductIssueExamples: broadProductIssues.slice(0, 40),
  byCategory: countBy(results, "category"),
  bySource: countBy(results, "source"),
  issues: results.filter(
    (result) =>
      result.sourceStatus !== 200 ||
      !result.exactSourceHit ||
      result.suspicious.length > 0 ||
      result.productIssues.length > 0,
  ),
};

console.log(JSON.stringify(report, null, 2));

function isRecentlyGeneratedEnriched(entry) {
  const summary = entry.summary ?? "";
  return (
    summary.includes("rejected the call at ") ||
    (summary.includes("reverted with ") && summary.includes("exact source-level check")) ||
    summary.startsWith("Sourcify verified-selector match ")
  );
}

function sourceUrlFor(entry) {
  for (const reference of entry.references ?? []) {
    const raw = toRawGitHubUrl(reference.url);
    if (raw) return raw;
  }
  return null;
}

function toRawGitHubUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "raw.githubusercontent.com") return parsed.toString();
    if (parsed.hostname !== "github.com") return null;
    const parts = parsed.pathname.split("/").filter(Boolean);
    const blobIndex = parts.indexOf("blob");
    if (parts.length >= 5 && blobIndex === 2) {
      const [owner, repo, , branch, ...rest] = parts;
      return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${rest.join("/")}`;
    }
  } catch {
    return null;
  }
  return null;
}

function verificationToken(entry) {
  const custom = /rejected the call at ([A-Za-z_$][\w$]*)/.exec(entry.summary ?? "");
  if (custom) return { type: "error", value: custom[1] };
  const reason = /reverted with "([^"]+)"/.exec(entry.summary ?? "");
  if (reason) return { type: "reason", value: reason[1] };
  const sourcify = /Sourcify verified-selector match ([A-Za-z_$][\w$]*)/.exec(entry.summary ?? "");
  if (sourcify) return { type: "error", value: sourcify[1] };
  return null;
}

function containsEvidence(text, token) {
  if (token.type === "reason") return text.includes(token.value);
  const escaped = escapeRegex(token.value);
  return new RegExp(`\\berror\\s+${escaped}\\b|\\b(?:function|event)\\s+${escaped}\\b|\\b${escaped}\\s*\\(`).test(text);
}

function familyFromSummary(summary) {
  const checks = [
    ["gas", /rejected the gas, execution-fee, or callback-gas/i],
    ["access", /effective caller does not satisfy|caller lacks the role/i],
    ["approval", /missing or insufficient allowance/i],
    ["signature", /signature, signer, typed-data/i],
    ["nonce", /request nonce does not match/i],
    ["deadline", /block timestamp or protocol delay|current block timestamp or protocol delay/i],
    ["balance", /does not have enough usable balance|does not hold enough usable funds/i],
    ["invalid_input", /submitted addresses, amounts, ids, indexes, array lengths|transaction arguments fail a local validation/i],
    ["bounds", /numeric bound, cap, threshold, ratio, fee, or limit check|hard cap, mint limit, daily limit, rate limit|fee, royalty, split, or fee-recipient value exceeds/i],
    ["slippage", /current pool, oracle, quote, tick, liquidity, or slippage|price, minimum-output, maximum-input, or slippage/i],
    ["oracle", /oracle, feed, reporter, round, timestamp, or price-bound|stale, missing, unauthorized, or out-of-bounds oracle data/i],
    ["bridge", /cross-chain message, route, domain, endpoint, nonce, proof, fee, or finality|bridge, messaging, or cross-chain domain/i],
    ["lending", /lending-market collateral, debt, reserve, cap, health-factor, or liquidation|lending-market collateral, debt, cap, or solvency/i],
    ["vault", /vault share accounting|ERC-4626-style vault limits|asset\/share conversion/i],
    ["staking", /staking, delegation, validator\/operator, reward, epoch|staking, unstaking, cooldown, lockup, reward, or epoch/i],
    ["governance", /proposal, vote, quorum, queue, timelock/i],
    ["paused", /paused, frozen, disabled, locked, or shut down|paused, frozen, disabled, or in emergency shutdown/i],
    ["duplicate_state", /already contains, processed, initialized, claimed, filled|claim, refund, rebate, or distribution cannot be paid/i],
    ["missing_state", /could not find the expected/i],
    ["proxy_upgrade", /proxy, implementation, initializer, upgrade/i],
    ["reentrancy", /reentrancy guard, execution lock/i],
    ["fee", /fee, royalty, premium, payment amount|fee, royalty, split/i],
    ["token_transfer", /token movement, minting, burning|address, region, KYC, allowlist, blocklist, or compliance|token movement is blocked/i],
    ["order_auction", /order, auction, listing, bid|orderbook, auction, or settlement state/i],
    ["math", /arithmetic, casting, rounding, division|arithmetic bounds, casting, division, rounding/i],
    ["account_abstraction", /smart-account validation, module, plugin|modular account, hook, plugin, validator|session-key, authorization, selector, policy/i],
    ["state", /protocol state, phase, mode, registry|lifecycle or state machine/i],
  ];
  return checks.find(([, pattern]) => pattern.test(summary))?.[0] ?? "unknown";
}

function productQualityIssues(entry, family) {
  const token = verificationToken(entry)?.value ?? entry.title ?? "";
  const compact = normalizeCompact(token);
  const words = normalizeWords(token);
  const issues = [];
  const missingCue = /notfound|missing|unknown|doesnotexist|notexist|unregistered|notregistered|notyetregistered|nonexistent|uninitialized|notinitialized|notcreated|notavailable|unavailable/.test(compact);
  const duplicateCue =
    /already|duplicate|exists|registered|initialized|claimed|processed|filled|cancelled|canceled|settled|completed|consumed/.test(compact) &&
    !missingCue;

  expectFamily(issues, /unauthorized|forbidden|notallowed|notpermitted|sendernotallowed|callernotallowed|onlyowner|onlyadmin|onlyrole|missingrole|permission|accessdenied|invalidcaller/.test(compact), ["access", "account_abstraction", "invalid_input", "nonce"].includes(family), "access_token_not_access");
  expectFamily(issues, /zero(address|amount|value|shares|assets|length)|(address|amount|value|shares|assets|length)zero|nulladdress|invalid(address|amount|recipient|sender|receiver|token|asset|length|input|param|argument|array|proof|path|route)|lengthmismatch|arraylength|outofbounds|indexoutofrange/.test(compact), ["invalid_input", "gas"].includes(family), "invalid_input_token_wrong_family");
  expectFamily(issues, duplicateCue, ["duplicate_state", "nonce", "invalid_input", "access", "deadline"].includes(family), "duplicate_state_token_wrong_family");
  expectFamily(issues, missingCue, ["missing_state", "access"].includes(family), "missing_state_token_wrong_family");
  expectFamily(issues, /\b(deadline|expired|expiry|expiration|too early|too late|before start|after end|not started|not yet|cooldown|delay|maturity|didn.?t pass|hasn.?t passed|not passed)\b/.test(words), ["deadline", "access"].includes(family), "deadline_token_wrong_family");
  expectFamily(issues, /(?<!data)fee(?!d|rc)|royalty|premium|commission|underpaid|overpaid|payment/.test(compact), ["fee", "invalid_input", "approval", "gas", "duplicate_state", "deadline", "balance", "access", "signature", "missing_state", "nonce"].includes(family), "fee_token_wrong_family");
  expectFamily(issues, /\b(above|minimum|maximum|below|too high|too low|too large|too small|overflow|underflow|exceed|exceeded|limit|cap|threshold|ratio|bps|percent|bound|bounds|constraint|denominator)\b/.test(words), ["bounds", "fee", "math", "invalid_input", "deadline", "approval", "gas", "state", "signature", "oracle", "access", "duplicate_state", "nonce", "paused"].includes(family), "bounds_token_wrong_family");
  expectFamily(issues, /paused|pause|frozen|freeze|disabled|shutdown|emergency|inactive|halted|stopped|(?<!un)locked/.test(compact), ["paused", "duplicate_state", "access", "deadline", "invalid_input"].includes(family), "paused_token_wrong_family");
  expectFamily(issues, /oracle|pricefeed|datafeed|aggregator|answer|reporter|observation|twap|pyth/.test(compact), ["oracle", "missing_state", "duplicate_state", "invalid_input", "paused", "fee", "access", "deadline", "gas", "balance", "state", "signature"].includes(family), "oracle_token_wrong_family");

  return issues;
}

function expectFamily(issues, condition, valid, issue) {
  if (condition && !valid) issues.push(issue);
}

function suspiciousFamily(entry, family) {
  const text = `${entry.title} ${entry.summary}`.toLowerCase();
  const suspicious = [];

  if (entry.category === "account_abstraction" && ["staking", "governance", "vault"].includes(family)) {
    suspicious.push("account_abstraction_overclassified");
  }
  if (entry.source === "chainlink" && entry.category === "cross_chain" && family === "oracle") {
    suspicious.push("chainlink_ccip_as_oracle");
  }
  if (entry.category === "contract_sdk" && family === "account_abstraction" && !/entrypoint|account|paymaster|useroperation|session|module|plugin|validator/.test(text)) {
    suspicious.push("contract_sdk_overclassified_as_aa");
  }
  if (entry.category === "derivatives" && family === "governance") {
    suspicious.push("derivatives_as_governance");
  }
  if (/delegateand?revert|executionresult|executeerror|senderaddressresult|validationresult/.test(text) && !["account_abstraction", "state"].includes(family)) {
    suspicious.push("simulation_result_wrong_family");
  }

  return suspicious;
}

function stratifiedSample(items, target, seed) {
  const buckets = new Map();
  for (const item of items) {
    const key = `${item.entry.category}:${item.entry.source}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(item);
  }

  for (const bucket of buckets.values()) {
    bucket.sort((a, b) => hashString(`${seed}:${a.entry.id}`) - hashString(`${seed}:${b.entry.id}`));
  }

  const orderedBuckets = [...buckets.values()].sort((a, b) => {
    const keyA = `${a[0].entry.category}:${a[0].entry.source}`;
    const keyB = `${b[0].entry.category}:${b[0].entry.source}`;
    return hashString(`${seed}:${keyA}`) - hashString(`${seed}:${keyB}`);
  });

  const out = [];
  let index = 0;
  while (out.length < target) {
    let added = false;
    for (const bucket of orderedBuckets) {
      if (bucket[index]) {
        out.push(bucket[index]);
        added = true;
        if (out.length === target) break;
      }
    }
    if (!added) break;
    index += 1;
  }
  return out;
}

async function fetchText(url) {
  const cachePath = join(CACHE_DIR, `${createHash("sha256").update(url).digest("hex")}.txt`);
  if (!REFRESH) {
    try {
      const cached = JSON.parse(readFileSync(cachePath, "utf8"));
      return cached;
    } catch {}
  }

  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "revertwtf-catalog-enrichment-audit" },
      signal: AbortSignal.timeout(15_000),
    });
    const text = await response.text();
    const payload = { ok: response.ok, status: response.status, text };
    writeFileSync(cachePath, JSON.stringify(payload));
    return payload;
  } catch (error) {
    const payload = { ok: false, status: String(error?.message ?? error), text: "" };
    writeFileSync(cachePath, JSON.stringify(payload));
    return payload;
  }
}

function countBy(items, key) {
  return Object.fromEntries(
    [...items.reduce((map, item) => map.set(item[key], (map.get(item[key]) ?? 0) + 1), new Map()).entries()].sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
    ),
  );
}

function countValues(values) {
  return Object.fromEntries(
    [...values.reduce((map, value) => map.set(value, (map.get(value) ?? 0) + 1), new Map()).entries()].sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
    ),
  );
}

function escapeRegex(value) {
  return value.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
}

function normalizeCompact(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizeWords(value) {
  return String(value).toLowerCase().replace(/[_\-:()[\]{}.,/\\]+/g, " ");
}

function hashString(value) {
  const hash = createHash("sha256").update(value).digest();
  return hash.readUInt32BE(0);
}

function numberArg(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  return Number(process.argv[index + 1] ?? fallback);
}

function stringArg(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  return process.argv[index + 1] ?? fallback;
}

function listJsonFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return listJsonFiles(full);
    return entry.name.endsWith(".json") ? [full] : [];
  });
}

function findRoot(start) {
  let dir = resolve(start);
  while (true) {
    try {
      readFileSync(join(dir, "pnpm-workspace.yaml"), "utf8");
      return dir;
    } catch {
      const parent = dirname(dir);
      if (parent === dir) throw new Error("Could not find repository root");
      dir = parent;
    }
  }
}
