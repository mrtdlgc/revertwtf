import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const ROOT = findRoot(process.cwd());
const SHARDS_DIR = join(ROOT, "packages", "catalog", "src", "data", "shards");
const maxSamples = numberArg("--max-samples", 20);
const jsonOutput = process.argv.includes("--json");
const failOn = stringSetArg("--fail-on");

const entries = loadEntries();
const byId = groupBy(entries, (entry) => entry.id);
const byExactPattern = groupByPattern(entries, exactPatternKey);
const bySelector = groupByPattern(entries, selectorPatternKey);
const byReason = groupByPattern(entries, reasonPatternKey);
const bySignature = groupBySignature(entries);

const report = {
  totalEntries: entries.length,
  totalShards: new Set(entries.map((entry) => entry.shard)).size,
  duplicateIds: summarizeGroups(byId),
  duplicateExactPatterns: summarizeGroups(byExactPattern),
  duplicateSelectors: summarizeSelectorGroups(bySelector),
  duplicateReasons: summarizeGroups(byReason),
  duplicateSignatures: summarizeGroups(bySignature),
};

if (jsonOutput) {
  console.log(JSON.stringify(report, null, 2));
} else {
  printReport(report);
}

const failures = [];
if (failOn.has("id") && report.duplicateIds.groups > 0) failures.push("duplicate ids");
if (failOn.has("exact-pattern") && report.duplicateExactPatterns.groups > 0) failures.push("duplicate exact patterns");
if (failOn.has("same-source-selector") && report.duplicateSelectors.sameSourceGroups > 0) {
  failures.push("same-source selector duplicates");
}
if (failures.length > 0) {
  console.error(`\nDuplicate check failed: ${failures.join(", ")}`);
  process.exit(1);
}

function loadEntries() {
  const files = listJsonFiles(SHARDS_DIR);
  const out = [];
  for (const file of files) {
    const shard = relative(SHARDS_DIR, file).replace(/\\/g, "/").replace(/\.json$/, "");
    const parsed = JSON.parse(readFileSync(file, "utf8"));
    if (!Array.isArray(parsed)) throw new Error(`${relative(ROOT, file)} is not an array`);
    for (const entry of parsed) out.push({ ...entry, shard });
  }
  return out;
}

function listJsonFiles(dir) {
  if (!existsSync(dir)) throw new Error(`Missing shards dir: ${dir}`);
  const files = [];
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, item.name);
    if (item.isDirectory()) files.push(...listJsonFiles(full));
    if (item.isFile() && item.name.endsWith(".json") && item.name !== "_index.json") files.push(full);
  }
  return files.sort();
}

function groupBy(items, keyFn) {
  const groups = new Map();
  for (const item of items) {
    const key = keyFn(item);
    if (!key) continue;
    const group = groups.get(key) ?? [];
    group.push(item);
    groups.set(key, group);
  }
  return groups;
}

function groupByPattern(items, keyFn) {
  const groups = new Map();
  for (const entry of items) {
    for (const pattern of entry.patterns ?? []) {
      const key = keyFn(pattern);
      if (!key) continue;
      const group = groups.get(key) ?? [];
      group.push(entry);
      groups.set(key, group);
    }
  }
  return groups;
}

function groupBySignature(items) {
  const groups = new Map();
  for (const entry of items) {
    for (const example of entry.examples ?? []) {
      const signature = parseExampleSignature(example);
      if (!signature) continue;
      const key = normalizeSignature(signature);
      const group = groups.get(key) ?? [];
      group.push(entry);
      groups.set(key, group);
    }
  }
  return groups;
}

function exactPatternKey(pattern) {
  return `${pattern.type}:${stableStringify(pattern)}`;
}

function selectorPatternKey(pattern) {
  if (pattern.type !== "selector") return null;
  if (typeof pattern.value !== "string") return null;
  return pattern.value.toLowerCase();
}

function reasonPatternKey(pattern) {
  if (pattern.type !== "regex") return null;
  const reason = extractGeneratedReason(pattern.value);
  return reason ? normalizeText(reason) : null;
}

function extractGeneratedReason(value) {
  if (typeof value !== "string") return null;
  const marker = "['\"]?";
  const start = value.indexOf(marker);
  const end = value.lastIndexOf(marker);
  if (start === -1 || end <= start) return null;
  const escaped = value.slice(start + marker.length, end);
  return unescapeRegexLiteral(escaped);
}

function unescapeRegexLiteral(value) {
  return value.replace(/\\([\\^$.*+?()[\]{}|])/g, "$1").replace(/\\"/g, "\"").replace(/\\'/g, "'");
}

function parseExampleSignature(example) {
  if (typeof example !== "string") return null;
  const match = example.match(/0x[0-9a-fA-F]{8}\s*\/\/\s*([A-Za-z_$][\w$]*\([^)]*\))/);
  return match?.[1] ?? null;
}

function normalizeSignature(signature) {
  return signature.replace(/\s+/g, "").toLowerCase();
}

function normalizeText(value) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function summarizeGroups(groups) {
  const duplicateGroups = [...groups.entries()].filter(([, group]) => group.length > 1);
  duplicateGroups.sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  return {
    groups: duplicateGroups.length,
    entries: duplicateGroups.reduce((sum, [, group]) => sum + group.length, 0),
    samples: duplicateGroups.slice(0, maxSamples).map(([key, group]) => sampleGroup(key, group)),
  };
}

function summarizeSelectorGroups(groups) {
  const duplicateGroups = [...groups.entries()].filter(([, group]) => group.length > 1);
  const sameSourceGroups = duplicateGroups.filter(([, group]) => hasSameSourceDuplicate(group));
  const nonSourcifyGroups = duplicateGroups.filter(([, group]) => group.filter((entry) => entry.source !== "sourcify-signatures").length > 1);
  duplicateGroups.sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  return {
    groups: duplicateGroups.length,
    entries: duplicateGroups.reduce((sum, [, group]) => sum + group.length, 0),
    sameSourceGroups: sameSourceGroups.length,
    nonSourcifyGroups: nonSourcifyGroups.length,
    samples: duplicateGroups.slice(0, maxSamples).map(([key, group]) => sampleGroup(key, group)),
    sameSourceSamples: sameSourceGroups.slice(0, maxSamples).map(([key, group]) => sampleGroup(key, group)),
    nonSourcifySamples: nonSourcifyGroups.slice(0, maxSamples).map(([key, group]) => sampleGroup(key, group)),
  };
}

function hasSameSourceDuplicate(group) {
  const seen = new Set();
  for (const entry of group) {
    if (seen.has(entry.source)) return true;
    seen.add(entry.source);
  }
  return false;
}

function sampleGroup(key, group) {
  return {
    key,
    count: group.length,
    entries: group.slice(0, maxSamples).map((entry) => ({
      id: entry.id,
      title: entry.title,
      source: entry.source,
      shard: entry.shard,
      confidence: entry.confidence,
    })),
  };
}

function printReport(value) {
  console.log(`catalog duplicate audit: ${value.totalEntries} entries across ${value.totalShards} shards`);
  printSection("duplicate ids", value.duplicateIds);
  printSection("duplicate exact patterns", value.duplicateExactPatterns);
  printSelectorSection(value.duplicateSelectors);
  printSection("duplicate reason strings", value.duplicateReasons);
  printSection("duplicate exact signatures", value.duplicateSignatures);
}

function printSection(title, section) {
  console.log(`\n${title}: ${section.groups} group(s), ${section.entries} entries`);
  for (const sample of section.samples) printSample(sample);
}

function printSelectorSection(section) {
  console.log(
    `\nduplicate selectors: ${section.groups} group(s), ${section.entries} entries; ` +
      `${section.sameSourceGroups} same-source group(s), ${section.nonSourcifyGroups} non-sourcify group(s)`,
  );
  for (const sample of section.samples) printSample(sample);
  if (section.sameSourceSamples.length > 0) {
    console.log("\nsame-source selector samples:");
    for (const sample of section.sameSourceSamples) printSample(sample);
  }
  if (section.nonSourcifySamples.length > 0) {
    console.log("\nnon-sourcify selector samples:");
    for (const sample of section.nonSourcifySamples) printSample(sample);
  }
}

function printSample(sample) {
  console.log(`- ${sample.key} (${sample.count})`);
  for (const entry of sample.entries.slice(0, 6)) {
    console.log(`  ${entry.source} :: ${entry.id} :: ${entry.shard}`);
  }
  if (sample.entries.length > 6) console.log(`  ... ${sample.entries.length - 6} more`);
}

function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
}

function numberArg(name, fallback) {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === name) return parseNumber(name, args[i + 1]);
    if (args[i].startsWith(`${name}=`)) return parseNumber(name, args[i].slice(name.length + 1));
  }
  return fallback;
}

function parseNumber(name, value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(`${name} requires a positive number`);
  return parsed;
}

function stringSetArg(name) {
  const values = new Set();
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === name) {
      for (const value of String(args[i + 1] ?? "").split(",")) if (value) values.add(value);
      i += 1;
    } else if (args[i].startsWith(`${name}=`)) {
      for (const value of args[i].slice(name.length + 1).split(",")) if (value) values.add(value);
    }
  }
  return values;
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
