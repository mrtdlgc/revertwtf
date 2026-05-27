import { createHash } from "node:crypto";
import { existsSync, mkdirSync, rmSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = findRoot(process.cwd());
const OUT_PATH = join(ROOT, "packages", "search", "dist", "data", "catalog.sqlite");
const CATALOG_ENTRY = join(ROOT, "packages", "catalog", "dist", "index.js");
const searchRequire = createRequire(join(ROOT, "packages", "search", "package.json"));

function findRoot(start) {
  let dir = resolve(start);
  while (true) {
    if (existsSync(join(dir, "pnpm-workspace.yaml"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) throw new Error("Could not find repository root");
    dir = parent;
  }
}

if (!existsSync(CATALOG_ENTRY)) {
  throw new Error("Missing packages/catalog/dist/index.js. Build @revertwtf/catalog before generating the SQLite search index.");
}

const { getCatalogShards } = await import(pathToFileURL(CATALOG_ENTRY).href);
const Database = searchRequire("better-sqlite3");

mkdirSync(dirname(OUT_PATH), { recursive: true });
rmSync(OUT_PATH, { force: true });
rmSync(`${OUT_PATH}-shm`, { force: true });
rmSync(`${OUT_PATH}-wal`, { force: true });

const db = new Database(OUT_PATH);
db.pragma("journal_mode = OFF");
db.pragma("synchronous = OFF");
db.pragma("temp_store = MEMORY");

db.exec(`
  CREATE TABLE meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  ) WITHOUT ROWID;

  CREATE TABLE shards (
    id TEXT PRIMARY KEY,
    group_name TEXT NOT NULL,
    name TEXT NOT NULL,
    count INTEGER NOT NULL
  ) WITHOUT ROWID;

  CREATE TABLE entries (
    rowid INTEGER PRIMARY KEY,
    id TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    layer TEXT NOT NULL,
    source TEXT NOT NULL,
    source_display_name TEXT,
    source_lifecycle TEXT,
    category TEXT NOT NULL,
    confidence TEXT NOT NULL,
    shard_id TEXT NOT NULL,
    summary TEXT NOT NULL,
    retry_helpful TEXT NOT NULL,
    increasing_gas_helpful TEXT NOT NULL,
    root_cause_known INTEGER NOT NULL,
    json TEXT NOT NULL
  );

  CREATE VIRTUAL TABLE entries_fts USING fts5(
    id,
    title,
    summary,
    source,
    source_display_name,
    source_aliases,
    category,
    patterns,
    likely_causes,
    next_steps,
    examples,
    tokenize = 'unicode61'
  );

  CREATE INDEX entries_source_idx ON entries(source);
  CREATE INDEX entries_layer_idx ON entries(layer);
  CREATE INDEX entries_category_idx ON entries(category);
  CREATE INDEX entries_confidence_idx ON entries(confidence);
  CREATE INDEX entries_shard_idx ON entries(shard_id);
  CREATE INDEX entries_source_lifecycle_idx ON entries(source_lifecycle);
`);

const insertShard = db.prepare(`
  INSERT INTO shards (id, group_name, name, count)
  VALUES (@id, @group, @name, @count)
`);

const insertEntry = db.prepare(`
  INSERT INTO entries (
    id,
    title,
    layer,
    source,
    source_display_name,
    source_lifecycle,
    category,
    confidence,
    shard_id,
    summary,
    retry_helpful,
    increasing_gas_helpful,
    root_cause_known,
    json
  ) VALUES (
    @id,
    @title,
    @layer,
    @source,
    @sourceDisplayName,
    @sourceLifecycle,
    @category,
    @confidence,
    @shardId,
    @summary,
    @retryHelpful,
    @increasingGasHelpful,
    @rootCauseKnown,
    @json
  )
`);

const insertFts = db.prepare(`
  INSERT INTO entries_fts (
    rowid,
    id,
    title,
    summary,
    source,
    source_display_name,
    source_aliases,
    category,
    patterns,
    likely_causes,
    next_steps,
    examples
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertMeta = db.prepare("INSERT INTO meta (key, value) VALUES (?, ?)");
const shards = getCatalogShards();
let count = 0;
const hash = createHash("sha256");

const tx = db.transaction(() => {
  for (const shard of shards) {
    insertShard.run({
      id: shard.id,
      group: shard.group,
      name: shard.name,
      count: shard.count,
    });

    for (const entry of shard.entries) {
      const json = JSON.stringify(entry);
      hash.update(json);
      hash.update("\n");
      const info = insertEntry.run({
        id: entry.id,
        title: entry.title,
        layer: entry.layer,
        source: entry.source,
        sourceDisplayName: entry.sourceDisplayName ?? null,
        sourceLifecycle: entry.sourceLifecycle ?? null,
        category: entry.category,
        confidence: entry.confidence,
        shardId: shard.id,
        summary: entry.summary,
        retryHelpful: entry.retryHelpful,
        increasingGasHelpful: entry.increasingGasHelpful,
        rootCauseKnown: entry.rootCauseKnown ? 1 : 0,
        json,
      });

      insertFts.run(
        info.lastInsertRowid,
        entry.id,
        entry.title,
        entry.summary,
        entry.source,
        entry.sourceDisplayName ?? "",
        (entry.sourceAliases ?? []).join(" "),
        entry.category,
        JSON.stringify(entry.patterns),
        entry.likelyCauses.join("\n"),
        entry.nextSteps.join("\n"),
        (entry.examples ?? []).join("\n"),
      );
      count += 1;
    }
  }

  insertMeta.run("generated_at", new Date().toISOString());
  insertMeta.run("content_hash", hash.digest("hex"));
  insertMeta.run("entry_count", String(count));
  insertMeta.run("shard_count", String(shards.length));
});

tx();
db.exec("INSERT INTO entries_fts(entries_fts) VALUES('optimize')");
db.pragma("user_version = 1");
db.close();

const size = statSync(OUT_PATH).size;
if (size === 0) {
  throw new Error(`Generated SQLite catalog DB is empty: ${OUT_PATH}`);
}

console.log(`catalog sqlite: ${shards.length} shards, ${count} entries -> ${OUT_PATH}`);
